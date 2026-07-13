use crate::recent_documents::{RecentDocument, RecentDocuments};
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::{
    collections::{hash_map::DefaultHasher, HashSet},
    fs,
    hash::{Hash, Hasher},
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};

#[derive(Default)]
pub struct AuthorizedPaths(Mutex<HashSet<PathBuf>>);

impl AuthorizedPaths {
    fn authorize(&self, path: PathBuf) -> Result<(), FileCommandError> {
        self.0
            .lock()
            .map_err(|_| internal_error("Impossible d’accéder aux autorisations de fichiers."))?
            .insert(path);
        Ok(())
    }

    fn contains(&self, path: &Path) -> Result<bool, FileCommandError> {
        Ok(self
            .0
            .lock()
            .map_err(|_| internal_error("Impossible d’accéder aux autorisations de fichiers."))?
            .contains(path))
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileCommandError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileVersion {
    pub modified_millis: u64,
    pub size: u64,
    pub fingerprint: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedDocument {
    pub path: String,
    pub name: String,
    pub content: String,
    pub version: FileVersion,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTarget {
    pub path: String,
    pub name: String,
    pub exists: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDocumentRequest {
    pub path: String,
    pub content: String,
    pub expected_version: Option<FileVersion>,
    pub allow_overwrite: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDocumentResult {
    pub path: String,
    pub name: String,
    pub version: FileVersion,
}

fn validate_file_name(name: &str) -> Result<(), FileCommandError> {
    let trimmed = name.trim();
    let stem = Path::new(trimmed).file_stem().and_then(|value| value.to_str()).unwrap_or_default();
    let reserved = matches!(stem.to_ascii_lowercase().as_str(), "con" | "prn" | "aux" | "nul")
        || (stem.len() == 4 && (stem.to_ascii_lowercase().starts_with("com") || stem.to_ascii_lowercase().starts_with("lpt")) && stem[3..].parse::<u8>().is_ok_and(|number| (1..=9).contains(&number)));
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." || trimmed.ends_with(['.', ' '])
        || trimmed.chars().any(|character| character < ' ' || "<>:\"/\\|?*".contains(character)) || reserved {
        return Err(error("invalid_name", "Ce nom de fichier n’est pas autorisé par Windows."));
    }
    if Path::new(trimmed).file_name().and_then(|value| value.to_str()) != Some(trimmed) {
        return Err(error("invalid_name", "Le document doit rester dans son dossier actuel."));
    }
    validate_extension(Path::new(trimmed))
}

fn error(code: &str, message: impl Into<String>) -> FileCommandError {
    FileCommandError {
        code: code.to_string(),
        message: message.into(),
    }
}

fn internal_error(message: impl Into<String>) -> FileCommandError {
    error("internal", message)
}

fn validate_extension(path: &Path) -> Result<(), FileCommandError> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if matches!(extension.as_str(), "md" | "txt") {
        Ok(())
    } else {
        Err(error(
            "unsupported_type",
            "Plum3 de Nyx peut ouvrir et enregistrer uniquement des fichiers .md ou .txt.",
        ))
    }
}

fn normalize_path(path: &Path) -> Result<PathBuf, FileCommandError> {
    if path.exists() {
        return path.canonicalize().map_err(|source| {
            error(
                "path_error",
                format!("Impossible de résoudre ce chemin : {source}"),
            )
        });
    }

    let parent = path.parent().ok_or_else(|| {
        error(
            "path_error",
            "Le dossier de destination est introuvable.",
        )
    })?;
    let file_name = path.file_name().ok_or_else(|| {
        error(
            "path_error",
            "Le nom du fichier de destination est invalide.",
        )
    })?;
    let canonical_parent = parent.canonicalize().map_err(|source| {
        error(
            "path_error",
            format!("Impossible d’accéder au dossier choisi : {source}"),
        )
    })?;

    Ok(canonical_parent.join(file_name))
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Document")
        .to_string()
}

fn fingerprint(bytes: &[u8]) -> String {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn version_for(path: &Path, bytes: &[u8]) -> Result<FileVersion, FileCommandError> {
    let metadata = fs::metadata(path).map_err(|source| {
        error(
            "metadata_error",
            format!("Impossible de lire les informations du fichier : {source}"),
        )
    })?;
    let modified_millis = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default();

    Ok(FileVersion {
        modified_millis,
        size: metadata.len(),
        fingerprint: fingerprint(bytes),
    })
}

fn read_document(path: &Path) -> Result<LoadedDocument, FileCommandError> {
    validate_extension(path)?;
    let bytes = fs::read(path).map_err(|source| {
        error(
            "read_error",
            format!("Impossible de lire le fichier choisi : {source}"),
        )
    })?;
    let content = String::from_utf8(bytes.clone()).map_err(|_| {
        error(
            "encoding_error",
            "Ce fichier n’est pas encodé en UTF-8 et ne peut pas être ouvert sans conversion.",
        )
    })?;

    Ok(LoadedDocument {
        path: path.to_string_lossy().into_owned(),
        name: file_name(path),
        content,
        version: version_for(path, &bytes)?,
    })
}

#[tauri::command]
pub fn choose_document_to_open(
    authorized_paths: tauri::State<'_, AuthorizedPaths>,
    recent_documents: tauri::State<'_, RecentDocuments>,
) -> Result<Option<LoadedDocument>, FileCommandError> {
    let Some(selected) = FileDialog::new()
        .set_title("Ouvrir un document")
        .add_filter("Documents Markdown et texte", &["md", "txt"])
        .pick_file()
    else {
        return Ok(None);
    };

    let path = normalize_path(&selected)?;
    validate_extension(&path)?;
    authorized_paths.authorize(path.clone())?;
    let document = read_document(&path)?;
    recent_documents.record(&path);
    Ok(Some(document))
}

#[tauri::command]
pub fn list_recent_documents(
    recent_documents: tauri::State<'_, RecentDocuments>,
) -> Vec<RecentDocument> {
    recent_documents.list()
}

#[tauri::command]
pub fn open_recent_document(
    path: String,
    authorized_paths: tauri::State<'_, AuthorizedPaths>,
    recent_documents: tauri::State<'_, RecentDocuments>,
) -> Result<LoadedDocument, FileCommandError> {
    let path = normalize_path(Path::new(&path))?;
    validate_extension(&path)?;
    if !recent_documents.contains(&path) {
        return Err(error(
            "not_authorized",
            "Ce document ne fait pas partie de l’historique récent de Plum3 de Nyx.",
        ));
    }
    authorized_paths.authorize(path.clone())?;
    let document = read_document(&path)?;
    recent_documents.record(&path);
    Ok(document)
}

#[tauri::command]
pub fn choose_document_save_path(
    suggested_name: String,
    authorized_paths: tauri::State<'_, AuthorizedPaths>,
) -> Result<Option<SaveTarget>, FileCommandError> {
    let Some(selected) = FileDialog::new()
        .set_title("Enregistrer le document sous")
        .set_file_name(&suggested_name)
        .add_filter("Markdown", &["md"])
        .add_filter("Texte", &["txt"])
        .save_file()
    else {
        return Ok(None);
    };

    let path = normalize_path(&selected)?;
    validate_extension(&path)?;
    authorized_paths.authorize(path.clone())?;

    Ok(Some(SaveTarget {
        path: path.to_string_lossy().into_owned(),
        name: file_name(&path),
        exists: path.exists(),
    }))
}

#[tauri::command]
pub fn save_document(
    request: SaveDocumentRequest,
    authorized_paths: tauri::State<'_, AuthorizedPaths>,
    recent_documents: tauri::State<'_, RecentDocuments>,
) -> Result<SaveDocumentResult, FileCommandError> {
    let result = save_document_inner(request, &authorized_paths)?;
    recent_documents.record(Path::new(&result.path));
    Ok(result)
}

#[tauri::command]
pub fn rename_document(
    path: String,
    new_name: String,
    authorized_paths: tauri::State<'_, AuthorizedPaths>,
    recent_documents: tauri::State<'_, RecentDocuments>,
) -> Result<SaveDocumentResult, FileCommandError> {
    let result = rename_document_inner(&path, &new_name, &authorized_paths)?;
    recent_documents.record(Path::new(&result.path));
    Ok(result)
}

fn rename_document_inner(path: &str, new_name: &str, authorized_paths: &AuthorizedPaths) -> Result<SaveDocumentResult, FileCommandError> {
    validate_file_name(new_name)?;
    let source = normalize_path(Path::new(path))?;
    validate_extension(&source)?;
    if !authorized_paths.contains(&source)? {
        return Err(error("not_authorized", "Ce chemin n’a pas été choisi explicitement dans Plum3 de Nyx."));
    }
    let source_extension = source.extension().and_then(|value| value.to_str()).unwrap_or_default();
    let target_extension = Path::new(new_name).extension().and_then(|value| value.to_str()).unwrap_or_default();
    if !source_extension.eq_ignore_ascii_case(target_extension) {
        return Err(error("extension_change", "L’extension du document doit être conservée."));
    }
    let parent = source.parent().ok_or_else(|| error("path_error", "Le dossier du document est introuvable."))?;
    let target = parent.join(new_name);
    if target.exists() {
        return Err(error("already_exists", "Un fichier portant déjà ce nom existe dans ce dossier."));
    }
    fs::rename(&source, &target).map_err(|source| error("rename_error", format!("Impossible de renommer le fichier : {source}")))?;
    let normalized_target = normalize_path(&target)?;
    authorized_paths.authorize(normalized_target.clone())?;
    let bytes = fs::read(&normalized_target).map_err(|source| error("read_error", format!("Impossible de vérifier le fichier renommé : {source}")))?;
    Ok(SaveDocumentResult {
        path: normalized_target.to_string_lossy().into_owned(),
        name: file_name(&normalized_target),
        version: version_for(&normalized_target, &bytes)?,
    })
}

fn save_document_inner(
    request: SaveDocumentRequest,
    authorized_paths: &AuthorizedPaths,
) -> Result<SaveDocumentResult, FileCommandError> {
    let path = normalize_path(Path::new(&request.path))?;
    validate_extension(&path)?;

    if !authorized_paths.contains(&path)? {
        return Err(error(
            "not_authorized",
            "Ce chemin n’a pas été choisi explicitement dans Plum3 de Nyx.",
        ));
    }

    if path.exists() {
        let current_bytes = fs::read(&path).map_err(|source| {
            error(
                "read_error",
                format!("Impossible de vérifier le fichier existant : {source}"),
            )
        })?;
        let current_version = version_for(&path, &current_bytes)?;

        match &request.expected_version {
            Some(expected) if expected != &current_version && !request.allow_overwrite => {
                return Err(error(
                    "external_change",
                    "Le fichier a été modifié ailleurs depuis son ouverture. Confirmez avant de l’écraser.",
                ));
            }
            None if !request.allow_overwrite => {
                return Err(error(
                    "already_exists",
                    "Un fichier existe déjà à cet emplacement. Confirmez son remplacement.",
                ));
            }
            _ => {}
        }
    }

    let mut file = fs::File::create(&path).map_err(|source| {
        error(
            "write_error",
            format!("Impossible d’enregistrer le document : {source}"),
        )
    })?;
    file.write_all(request.content.as_bytes()).map_err(|source| {
        error(
            "write_error",
            format!("L’écriture du document a échoué : {source}"),
        )
    })?;
    file.sync_all().map_err(|source| {
        error(
            "write_error",
            format!("Le document n’a pas pu être synchronisé sur le disque : {source}"),
        )
    })?;

    let bytes = request.content.as_bytes();
    Ok(SaveDocumentResult {
        path: path.to_string_lossy().into_owned(),
        name: file_name(&path),
        version: version_for(&path, bytes)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_path(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("horloge valide")
            .as_nanos();
        std::env::temp_dir().join(format!("plum3-{name}-{suffix}.md"))
    }

    #[test]
    fn accepte_uniquement_markdown_et_texte() {
        assert!(validate_extension(Path::new("roman.md")).is_ok());
        assert!(validate_extension(Path::new("notes.txt")).is_ok());
        assert_eq!(
            validate_extension(Path::new("image.png"))
                .expect_err("extension refusée")
                .code,
            "unsupported_type"
        );
    }

    #[test]
    fn refuse_un_chemin_non_autorise() {
        let state = AuthorizedPaths::default();
        let path = test_path("unauthorized");
        let result = save_document_inner(
            SaveDocumentRequest {
                path: path.to_string_lossy().into_owned(),
                content: "test".into(),
                expected_version: None,
                allow_overwrite: false,
            },
            &state,
        );
        assert_eq!(result.expect_err("accès refusé").code, "not_authorized");
    }

    #[test]
    fn enregistre_le_contenu_markdown_autorise() {
        let state = AuthorizedPaths::default();
        let path = test_path("template-markdown");
        let normalized = normalize_path(&path).expect("chemin valide");
        state.authorize(normalized.clone()).expect("autorisation");
        let content = "# Titre du roman\n\n## Genre\n\nFantasy\n";

        let result = save_document_inner(
            SaveDocumentRequest {
                path: normalized.to_string_lossy().into_owned(),
                content: content.into(),
                expected_version: None,
                allow_overwrite: false,
            },
            &state,
        )
        .expect("enregistrement réussi");

        assert_eq!(result.name, path.file_name().unwrap().to_string_lossy());
        assert_eq!(fs::read_to_string(&path).expect("fichier lisible"), content);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn refuse_un_ecrasement_non_confirme() {
        let state = AuthorizedPaths::default();
        let path = test_path("existing");
        fs::write(&path, "contenu existant").expect("fixture créée");
        let normalized = normalize_path(&path).expect("chemin valide");
        state.authorize(normalized.clone()).expect("autorisation");

        let result = save_document_inner(
            SaveDocumentRequest {
                path: normalized.to_string_lossy().into_owned(),
                content: "nouveau contenu".into(),
                expected_version: None,
                allow_overwrite: false,
            },
            &state,
        );

        assert_eq!(result.expect_err("écrasement refusé").code, "already_exists");
        assert_eq!(fs::read_to_string(&path).expect("fixture lisible"), "contenu existant");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn detecte_une_modification_externe() {
        let state = AuthorizedPaths::default();
        let path = test_path("conflict");
        fs::write(&path, "version une").expect("fixture créée");
        let normalized = normalize_path(&path).expect("chemin valide");
        state.authorize(normalized.clone()).expect("autorisation");
        let loaded = read_document(&normalized).expect("document chargé");
        fs::write(&normalized, "version externe différente").expect("modification externe");

        let result = save_document_inner(
            SaveDocumentRequest {
                path: normalized.to_string_lossy().into_owned(),
                content: "version locale".into(),
                expected_version: Some(loaded.version),
                allow_overwrite: false,
            },
            &state,
        );

        assert_eq!(result.expect_err("conflit attendu").code, "external_change");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn renomme_sans_modifier_le_contenu() {
        let state = AuthorizedPaths::default();
        let source = test_path("rename-source");
        fs::write(&source, "contenu inchangé").expect("fixture créée");
        let normalized = normalize_path(&source).expect("chemin valide");
        state.authorize(normalized.clone()).expect("autorisation");
        let target_name = format!("plum3-rename-target-{}.md", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos());
        let target = source.parent().unwrap().join(&target_name);
        let result = rename_document_inner(&normalized.to_string_lossy(), &target_name, &state).expect("renommage réussi");
        assert_eq!(result.name, target_name);
        assert_eq!(fs::read_to_string(&target).expect("contenu lisible"), "contenu inchangé");
        assert!(!source.exists());
        let _ = fs::remove_file(target);
    }

    #[test]
    fn refuse_conflit_et_nom_invalide() {
        assert_eq!(validate_file_name("CON.md").expect_err("nom réservé").code, "invalid_name");
        assert_eq!(validate_file_name("dossier/roman.md").expect_err("chemin refusé").code, "invalid_name");
        let state = AuthorizedPaths::default();
        let source = test_path("rename-conflict-source");
        let target = test_path("rename-conflict-target");
        fs::write(&source, "source").unwrap();
        fs::write(&target, "cible").unwrap();
        let normalized = normalize_path(&source).unwrap();
        state.authorize(normalized.clone()).unwrap();
        let error = rename_document_inner(&normalized.to_string_lossy(), target.file_name().unwrap().to_str().unwrap(), &state).expect_err("conflit attendu");
        assert_eq!(error.code, "already_exists");
        let _ = fs::remove_file(source);
        let _ = fs::remove_file(target);
    }
}
