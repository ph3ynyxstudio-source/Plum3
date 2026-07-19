use super::{
    LibraryDocument, LibraryIndex, RecoveryDraftMigration, RecoveryDraftMigrationRequest,
    RecoveryDraftMigrationResult, SCHEMA_VERSION,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fmt, fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

const LIBRARY_DIRECTORY: &str = "library";
const DOCUMENTS_DIRECTORY: &str = "documents";
const INDEX_FILE: &str = "index.json";
const RECOVERY_DRAFT_MIGRATION_FILE: &str = "recovery-draft-v1-migration.json";
const RECOVERED_DRAFT_TITLE: &str = "Brouillon récupéré";

pub struct CreateLibraryDocument {
    pub title: String,
    pub template_type: Option<String>,
    pub content: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDocumentContent {
    pub document: LibraryDocument,
    pub content: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryDraftMigrationJournal {
    source_saved_at: String,
    document: LibraryDocument,
    content: String,
}

#[derive(Debug, PartialEq, Eq)]
pub enum LibraryError {
    Io {
        operation: &'static str,
        path: PathBuf,
        message: String,
    },
    InvalidIndex(String),
    UnsupportedSchema(u32),
    InvalidDocumentId(String),
    DuplicateDocumentId(String),
    InvalidDocumentTitle,
    InvalidDocumentFileName {
        id: String,
        file_name: String,
    },
    UnsupportedProject {
        id: String,
        project_id: String,
    },
    MissingDocumentFile {
        id: String,
        path: PathBuf,
    },
    UnindexedDocumentFile(PathBuf),
    MissingActiveDocument(String),
    DocumentNotFound(String),
    InvalidRecoveryDraftSource,
    ConflictingRecoveryDraft(String),
    StaleRecoveryDraft {
        received: String,
        migrated: String,
    },
    MissingMigrationDocument(String),
    MigrationMarkerMismatch {
        document_id: String,
        source_saved_at: String,
    },
}

impl fmt::Display for LibraryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io {
                operation,
                path,
                message,
            } => write!(formatter, "{operation} ({}): {message}", path.display()),
            Self::InvalidIndex(message) => {
                write!(formatter, "Index de bibliothèque invalide : {message}")
            }
            Self::UnsupportedSchema(version) => {
                write!(formatter, "Version d’index non prise en charge : {version}")
            }
            Self::InvalidDocumentId(id) => {
                write!(formatter, "Identifiant de document invalide : {id}")
            }
            Self::DuplicateDocumentId(id) => {
                write!(formatter, "Identifiant de document dupliqué : {id}")
            }
            Self::InvalidDocumentTitle => write!(formatter, "Le titre du document est vide."),
            Self::InvalidDocumentFileName { id, file_name } => write!(
                formatter,
                "Le fichier « {file_name} » ne correspond pas à l’identifiant « {id} »."
            ),
            Self::UnsupportedProject { id, project_id } => write!(
                formatter,
                "Le document « {id} » référence le projet non pris en charge « {project_id} »."
            ),
            Self::MissingDocumentFile { id, path } => write!(
                formatter,
                "Le fichier du document « {id} » est absent : {}",
                path.display()
            ),
            Self::UnindexedDocumentFile(path) => write!(
                formatter,
                "Un fichier Markdown n’est référencé par aucun document : {}",
                path.display()
            ),
            Self::MissingActiveDocument(id) => {
                write!(
                    formatter,
                    "Le document actif « {id} » n’existe pas dans l’index."
                )
            }
            Self::DocumentNotFound(id) => write!(formatter, "Document introuvable : {id}"),
            Self::InvalidRecoveryDraftSource => {
                write!(
                    formatter,
                    "Le brouillon de récupération n’a pas de date source valide."
                )
            }
            Self::ConflictingRecoveryDraft(saved_at) => write!(
                formatter,
                "Le brouillon « {saved_at} » diffère du document déjà migré."
            ),
            Self::StaleRecoveryDraft { received, migrated } => write!(
                formatter,
                "Le brouillon « {received} » est antérieur à la migration « {migrated} »."
            ),
            Self::MissingMigrationDocument(id) => write!(
                formatter,
                "Le document de migration « {id} » est absent de l’index."
            ),
            Self::MigrationMarkerMismatch {
                document_id,
                source_saved_at,
            } => write!(
                formatter,
                "La migration « {source_saved_at} » ne référence pas le document « {document_id} »."
            ),
        }
    }
}

impl std::error::Error for LibraryError {}

trait IdGenerator: Send + Sync {
    fn generate(&self) -> String;
}

struct UuidGenerator;

impl IdGenerator for UuidGenerator {
    fn generate(&self) -> String {
        Uuid::new_v4().to_string()
    }
}

trait Clock: Send + Sync {
    fn now(&self) -> String;
}

struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> String {
        format_system_time(SystemTime::now())
    }
}

pub struct LibraryRepository {
    library_root: PathBuf,
    documents_directory: PathBuf,
    index_path: PathBuf,
    recovery_draft_migration_path: PathBuf,
    id_generator: Box<dyn IdGenerator>,
    clock: Box<dyn Clock>,
    access: Mutex<()>,
}

impl LibraryRepository {
    pub fn new(app_data_root: impl Into<PathBuf>) -> Self {
        Self::with_components(
            app_data_root.into(),
            Box::new(UuidGenerator),
            Box::new(SystemClock),
        )
    }

    pub fn library_root(&self) -> &Path {
        &self.library_root
    }

    pub fn documents_directory(&self) -> &Path {
        &self.documents_directory
    }

    pub fn index_path(&self) -> &Path {
        &self.index_path
    }

    pub fn initialize(&self) -> Result<LibraryIndex, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        self.load_or_create_index()
    }

    pub fn list_documents(&self) -> Result<Vec<LibraryDocument>, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        let mut documents = self.load_or_create_index()?.documents;
        sort_documents(&mut documents);
        Ok(documents)
    }

    pub fn create_document(
        &self,
        request: CreateLibraryDocument,
    ) -> Result<LibraryDocument, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        let id = self.id_generator.generate();
        self.create_document_with_id(id, request)
    }

    pub fn read_document(&self, id: &str) -> Result<LibraryDocumentContent, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        validate_document_id(id)?;
        let index = self.load_or_create_index()?;
        let document = index
            .documents
            .into_iter()
            .find(|document| document.id == id)
            .ok_or_else(|| LibraryError::DocumentNotFound(id.to_string()))?;
        let path = self.document_path(&document);
        let content = fs::read_to_string(&path)
            .map_err(|error| io_error("lecture du document", &path, error))?;
        Ok(LibraryDocumentContent { document, content })
    }

    pub fn read_active_document(&self) -> Result<Option<LibraryDocumentContent>, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        let index = self.load_or_create_index()?;
        let Some(active_id) = index.active_document_id else {
            return Ok(None);
        };
        let document = index
            .documents
            .into_iter()
            .find(|document| document.id == active_id)
            .ok_or_else(|| LibraryError::MissingActiveDocument(active_id.clone()))?;
        let content = self.read_document_content(&document)?;
        Ok(Some(LibraryDocumentContent { document, content }))
    }

    pub fn open_document(&self, id: &str) -> Result<LibraryDocumentContent, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        validate_document_id(id)?;
        let mut index = self.load_or_create_index()?;
        let position = index
            .documents
            .iter()
            .position(|document| document.id == id)
            .ok_or_else(|| LibraryError::DocumentNotFound(id.to_string()))?;
        let content = self.read_document_content(&index.documents[position])?;
        index.documents[position].last_opened_at = Some(self.clock.now());
        index.active_document_id = Some(id.to_string());
        let document = index.documents[position].clone();
        self.write_index(&index)?;
        Ok(LibraryDocumentContent { document, content })
    }

    pub fn save_document(&self, id: &str, content: &str) -> Result<LibraryDocument, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        validate_document_id(id)?;
        let mut index = self.load_or_create_index()?;
        let position = index
            .documents
            .iter()
            .position(|document| document.id == id)
            .ok_or_else(|| LibraryError::DocumentNotFound(id.to_string()))?;
        let path = self.document_path(&index.documents[position]);
        atomic_write(&path, content.as_bytes())?;
        index.documents[position].updated_at = self.clock.now();
        sort_documents(&mut index.documents);
        self.write_index(&index)?;
        Ok(index
            .documents
            .into_iter()
            .find(|document| document.id == id)
            .expect("le document sauvegardé demeure dans l’index"))
    }

    pub fn migrate_recovery_draft(
        &self,
        request: RecoveryDraftMigrationRequest,
    ) -> Result<RecoveryDraftMigrationResult, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        if request.saved_at.trim().is_empty() || request.content.trim().is_empty() {
            return Err(LibraryError::InvalidRecoveryDraftSource);
        }

        let title = recovery_draft_title(&request.name);
        let mut index = self.load_or_create_index()?;
        if let Some(existing) = index.migrations.recovery_draft_v1.clone() {
            let document = index
                .documents
                .iter()
                .find(|document| document.id == existing.document_id)
                .cloned()
                .ok_or_else(|| {
                    LibraryError::MissingMigrationDocument(existing.document_id.clone())
                })?;
            let existing_content = self.read_document_content(&document)?;

            if existing.source_saved_at == request.saved_at {
                if document.title != title
                    || document.template_type != request.template_type
                    || existing_content != request.content
                {
                    return Err(LibraryError::ConflictingRecoveryDraft(request.saved_at));
                }
                return Ok(RecoveryDraftMigrationResult {
                    document,
                    created: false,
                });
            }

            if request.saved_at < existing.source_saved_at {
                return Err(LibraryError::StaleRecoveryDraft {
                    received: request.saved_at,
                    migrated: existing.source_saved_at,
                });
            }

            if document.title == title
                && document.template_type == request.template_type
                && existing_content == request.content
            {
                index.migrations.recovery_draft_v1 = Some(RecoveryDraftMigration {
                    source_saved_at: request.saved_at,
                    document_id: document.id.clone(),
                });
                self.write_index(&index)?;
                return Ok(RecoveryDraftMigrationResult {
                    document,
                    created: false,
                });
            }
        }

        let id = self.id_generator.generate();
        validate_document_id(&id)?;
        if index.documents.iter().any(|document| document.id == id) {
            return Err(LibraryError::DuplicateDocumentId(id));
        }
        let file_name = format!("{id}.md");
        let path = self.documents_directory.join(&file_name);
        if path.exists() {
            return Err(LibraryError::DuplicateDocumentId(id));
        }

        let now = self.clock.now();
        let document = LibraryDocument {
            id: id.clone(),
            project_id: None,
            title,
            file_name,
            template_type: request.template_type,
            created_at: now.clone(),
            updated_at: now,
            last_opened_at: None,
        };
        let journal = RecoveryDraftMigrationJournal {
            source_saved_at: request.saved_at.clone(),
            document: document.clone(),
            content: request.content,
        };
        self.write_migration_journal(&journal)?;
        self.complete_recovery_draft_migration(&mut index, &journal)?;
        self.remove_migration_journal()?;

        Ok(RecoveryDraftMigrationResult {
            document,
            created: true,
        })
    }

    pub fn verify_recovery_draft_migration(
        &self,
        document_id: &str,
        source_saved_at: &str,
    ) -> Result<LibraryDocument, LibraryError> {
        let _guard = self.access.lock().map_err(|error| {
            LibraryError::InvalidIndex(format!("verrou de stockage indisponible : {error}"))
        })?;
        validate_document_id(document_id)?;
        let index = self.load_or_create_index()?;
        let migration = index.migrations.recovery_draft_v1.ok_or_else(|| {
            LibraryError::MigrationMarkerMismatch {
                document_id: document_id.to_string(),
                source_saved_at: source_saved_at.to_string(),
            }
        })?;
        if migration.document_id != document_id || migration.source_saved_at != source_saved_at {
            return Err(LibraryError::MigrationMarkerMismatch {
                document_id: document_id.to_string(),
                source_saved_at: source_saved_at.to_string(),
            });
        }
        let document = index
            .documents
            .into_iter()
            .find(|document| document.id == document_id)
            .ok_or_else(|| LibraryError::MissingMigrationDocument(document_id.to_string()))?;
        self.read_document_content(&document)?;
        Ok(document)
    }

    fn with_components(
        app_data_root: PathBuf,
        id_generator: Box<dyn IdGenerator>,
        clock: Box<dyn Clock>,
    ) -> Self {
        let library_root = app_data_root.join(LIBRARY_DIRECTORY);
        let documents_directory = library_root.join(DOCUMENTS_DIRECTORY);
        let index_path = library_root.join(INDEX_FILE);
        let recovery_draft_migration_path = library_root.join(RECOVERY_DRAFT_MIGRATION_FILE);
        Self {
            library_root,
            documents_directory,
            index_path,
            recovery_draft_migration_path,
            id_generator,
            clock,
            access: Mutex::new(()),
        }
    }

    fn create_document_with_id(
        &self,
        id: String,
        request: CreateLibraryDocument,
    ) -> Result<LibraryDocument, LibraryError> {
        validate_document_id(&id)?;
        let title = request.title.trim();
        if title.is_empty() {
            return Err(LibraryError::InvalidDocumentTitle);
        }
        let mut index = self.load_or_create_index()?;
        if index.documents.iter().any(|document| document.id == id) {
            return Err(LibraryError::DuplicateDocumentId(id));
        }

        let file_name = format!("{id}.md");
        let path = self.documents_directory.join(&file_name);
        if path.exists() {
            return Err(LibraryError::DuplicateDocumentId(id));
        }
        let now = self.clock.now();
        let document = LibraryDocument {
            id: id.clone(),
            project_id: None,
            title: title.to_string(),
            file_name,
            template_type: request.template_type,
            created_at: now.clone(),
            updated_at: now,
            last_opened_at: None,
        };

        atomic_write(&path, request.content.as_bytes())?;
        index.documents.push(document.clone());
        index.active_document_id = Some(id);
        sort_documents(&mut index.documents);
        if let Err(error) = self.write_index(&index) {
            let _ = fs::remove_file(&path);
            return Err(error);
        }
        Ok(document)
    }

    fn load_or_create_index(&self) -> Result<LibraryIndex, LibraryError> {
        fs::create_dir_all(&self.documents_directory).map_err(|error| {
            io_error(
                "création du dossier de documents",
                &self.documents_directory,
                error,
            )
        })?;
        recover_atomic_target(&self.index_path)?;
        recover_atomic_target(&self.recovery_draft_migration_path)?;
        self.recover_document_writes()?;

        if !self.index_path.exists() {
            let index = LibraryIndex::default();
            self.write_index(&index)?;
        }

        let bytes = fs::read(&self.index_path)
            .map_err(|error| io_error("lecture de l’index", &self.index_path, error))?;
        let mut index: LibraryIndex = serde_json::from_slice(&bytes)
            .map_err(|error| LibraryError::InvalidIndex(error.to_string()))?;
        if self.recovery_draft_migration_path.exists() {
            let journal_bytes = fs::read(&self.recovery_draft_migration_path).map_err(|error| {
                io_error(
                    "lecture du journal de migration",
                    &self.recovery_draft_migration_path,
                    error,
                )
            })?;
            let journal: RecoveryDraftMigrationJournal = serde_json::from_slice(&journal_bytes)
                .map_err(|error| LibraryError::InvalidIndex(error.to_string()))?;
            self.complete_recovery_draft_migration(&mut index, &journal)?;
            self.remove_migration_journal()?;
        }
        self.validate_index(&index)?;
        Ok(index)
    }

    fn write_index(&self, index: &LibraryIndex) -> Result<(), LibraryError> {
        self.validate_index(index)?;
        let mut bytes = serde_json::to_vec_pretty(index)
            .map_err(|error| LibraryError::InvalidIndex(error.to_string()))?;
        bytes.push(b'\n');
        atomic_write(&self.index_path, &bytes)
    }

    fn validate_index(&self, index: &LibraryIndex) -> Result<(), LibraryError> {
        if index.schema_version != SCHEMA_VERSION {
            return Err(LibraryError::UnsupportedSchema(index.schema_version));
        }

        let mut ids = HashSet::new();
        let mut indexed_files = HashMap::new();
        for document in &index.documents {
            validate_document_id(&document.id)?;
            if !ids.insert(document.id.clone()) {
                return Err(LibraryError::DuplicateDocumentId(document.id.clone()));
            }
            if document.title.trim().is_empty() {
                return Err(LibraryError::InvalidDocumentTitle);
            }
            let expected_file_name = format!("{}.md", document.id);
            if document.file_name != expected_file_name {
                return Err(LibraryError::InvalidDocumentFileName {
                    id: document.id.clone(),
                    file_name: document.file_name.clone(),
                });
            }
            if let Some(project_id) = &document.project_id {
                return Err(LibraryError::UnsupportedProject {
                    id: document.id.clone(),
                    project_id: project_id.clone(),
                });
            }
            let path = self.document_path(document);
            if !path.is_file() {
                return Err(LibraryError::MissingDocumentFile {
                    id: document.id.clone(),
                    path,
                });
            }
            indexed_files.insert(document.file_name.clone(), document.id.clone());
        }

        if let Some(active_id) = &index.active_document_id {
            if !ids.contains(active_id) {
                return Err(LibraryError::MissingActiveDocument(active_id.clone()));
            }
        }

        if let Some(migration) = &index.migrations.recovery_draft_v1 {
            if migration.source_saved_at.trim().is_empty() {
                return Err(LibraryError::InvalidRecoveryDraftSource);
            }
            validate_document_id(&migration.document_id)?;
            if !ids.contains(&migration.document_id) {
                return Err(LibraryError::MissingMigrationDocument(
                    migration.document_id.clone(),
                ));
            }
        }

        for entry in fs::read_dir(&self.documents_directory).map_err(|error| {
            io_error(
                "lecture du dossier de documents",
                &self.documents_directory,
                error,
            )
        })? {
            let entry = entry.map_err(|error| {
                io_error(
                    "lecture d’une entrée du dossier de documents",
                    &self.documents_directory,
                    error,
                )
            })?;
            let path = entry.path();
            let is_markdown = path
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("md"));
            if is_markdown {
                let name = entry.file_name().to_string_lossy().into_owned();
                if !indexed_files.contains_key(&name) {
                    return Err(LibraryError::UnindexedDocumentFile(path));
                }
            }
        }
        Ok(())
    }

    fn recover_document_writes(&self) -> Result<(), LibraryError> {
        let entries = fs::read_dir(&self.documents_directory).map_err(|error| {
            io_error(
                "lecture du dossier de récupération",
                &self.documents_directory,
                error,
            )
        })?;
        let mut targets = HashSet::new();
        for entry in entries {
            let path = entry
                .map_err(|error| {
                    io_error(
                        "lecture d’une entrée de récupération",
                        &self.documents_directory,
                        error,
                    )
                })?
                .path();
            let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
                continue;
            };
            if let Some(target_name) = name
                .strip_suffix(".tmp")
                .or_else(|| name.strip_suffix(".bak"))
            {
                targets.insert(self.documents_directory.join(target_name));
            }
        }
        for target in targets {
            recover_atomic_target(&target)?;
        }
        Ok(())
    }

    fn read_document_content(&self, document: &LibraryDocument) -> Result<String, LibraryError> {
        let path = self.document_path(document);
        fs::read_to_string(&path).map_err(|error| io_error("lecture du document", &path, error))
    }

    fn write_migration_journal(
        &self,
        journal: &RecoveryDraftMigrationJournal,
    ) -> Result<(), LibraryError> {
        let mut bytes = serde_json::to_vec_pretty(journal)
            .map_err(|error| LibraryError::InvalidIndex(error.to_string()))?;
        bytes.push(b'\n');
        atomic_write(&self.recovery_draft_migration_path, &bytes)
    }

    fn complete_recovery_draft_migration(
        &self,
        index: &mut LibraryIndex,
        journal: &RecoveryDraftMigrationJournal,
    ) -> Result<(), LibraryError> {
        if journal.source_saved_at.trim().is_empty() || journal.content.trim().is_empty() {
            return Err(LibraryError::InvalidRecoveryDraftSource);
        }
        validate_document_id(&journal.document.id)?;
        if journal.document.project_id.is_some()
            || journal.document.file_name != format!("{}.md", journal.document.id)
            || journal.document.title.trim().is_empty()
        {
            return Err(LibraryError::InvalidIndex(
                "journal de migration du brouillon incohérent".to_string(),
            ));
        }

        let path = self.document_path(&journal.document);
        if path.exists() {
            let content = fs::read_to_string(&path)
                .map_err(|error| io_error("lecture du document migré", &path, error))?;
            if content != journal.content {
                return Err(LibraryError::ConflictingRecoveryDraft(
                    journal.source_saved_at.clone(),
                ));
            }
        } else {
            atomic_write(&path, journal.content.as_bytes())?;
        }

        if let Some(existing) = index
            .documents
            .iter()
            .find(|document| document.id == journal.document.id)
        {
            if existing != &journal.document {
                return Err(LibraryError::DuplicateDocumentId(
                    journal.document.id.clone(),
                ));
            }
        } else {
            index.documents.push(journal.document.clone());
        }
        index.active_document_id = Some(journal.document.id.clone());
        index.migrations.recovery_draft_v1 = Some(RecoveryDraftMigration {
            source_saved_at: journal.source_saved_at.clone(),
            document_id: journal.document.id.clone(),
        });
        sort_documents(&mut index.documents);
        self.write_index(index)
    }

    fn remove_migration_journal(&self) -> Result<(), LibraryError> {
        if self.recovery_draft_migration_path.exists() {
            fs::remove_file(&self.recovery_draft_migration_path).map_err(|error| {
                io_error(
                    "suppression du journal de migration",
                    &self.recovery_draft_migration_path,
                    error,
                )
            })?;
            if let Some(parent) = self.recovery_draft_migration_path.parent() {
                sync_parent_directory(parent)?;
            }
        }
        Ok(())
    }

    fn document_path(&self, document: &LibraryDocument) -> PathBuf {
        self.documents_directory.join(&document.file_name)
    }
}

fn recovery_draft_title(name: &str) -> String {
    let title = name.trim();
    if title.is_empty() {
        RECOVERED_DRAFT_TITLE.to_string()
    } else {
        title.to_string()
    }
}

fn validate_document_id(id: &str) -> Result<(), LibraryError> {
    Uuid::parse_str(id)
        .map(|_| ())
        .map_err(|_| LibraryError::InvalidDocumentId(id.to_string()))
}

fn sort_documents(documents: &mut [LibraryDocument]) {
    documents.sort_by(|left, right| {
        right
            .updated_at
            .cmp(&left.updated_at)
            .then_with(|| left.id.cmp(&right.id))
    });
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), LibraryError> {
    let parent = path.parent().ok_or_else(|| {
        LibraryError::InvalidIndex(format!("chemin sans dossier parent : {}", path.display()))
    })?;
    fs::create_dir_all(parent)
        .map_err(|error| io_error("création du dossier parent", parent, error))?;
    recover_atomic_target(path)?;

    let temporary = sibling_with_suffix(path, ".tmp");
    let backup = sibling_with_suffix(path, ".bak");
    let mut file = fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| io_error("création du fichier temporaire", &temporary, error))?;
    file.write_all(bytes)
        .map_err(|error| io_error("écriture du fichier temporaire", &temporary, error))?;
    file.sync_all()
        .map_err(|error| io_error("synchronisation du fichier temporaire", &temporary, error))?;
    drop(file);

    let had_previous = path.exists();
    if had_previous {
        fs::rename(path, &backup)
            .map_err(|error| io_error("création de la sauvegarde", &backup, error))?;
    }
    if let Err(error) = fs::rename(&temporary, path) {
        if had_previous {
            let _ = fs::rename(&backup, path);
        }
        return Err(io_error("remplacement du fichier final", path, error));
    }

    sync_parent_directory(parent)?;
    if had_previous {
        let _ = fs::remove_file(backup);
    }
    Ok(())
}

fn recover_atomic_target(path: &Path) -> Result<(), LibraryError> {
    let temporary = sibling_with_suffix(path, ".tmp");
    let backup = sibling_with_suffix(path, ".bak");
    if path.exists() {
        if temporary.exists() {
            fs::remove_file(&temporary).map_err(|error| {
                io_error("suppression du temporaire résiduel", &temporary, error)
            })?;
        }
        if backup.exists() {
            fs::remove_file(&backup).map_err(|error| {
                io_error("suppression de la sauvegarde résiduelle", &backup, error)
            })?;
        }
        return Ok(());
    }

    if backup.exists() {
        fs::rename(&backup, path)
            .map_err(|error| io_error("restauration de la sauvegarde", path, error))?;
    }
    if temporary.exists() {
        fs::remove_file(&temporary)
            .map_err(|error| io_error("suppression du temporaire incomplet", &temporary, error))?;
    }
    Ok(())
}

fn sibling_with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_default();
    name.push(suffix);
    path.with_file_name(name)
}

#[cfg(unix)]
fn sync_parent_directory(parent: &Path) -> Result<(), LibraryError> {
    let directory = fs::File::open(parent)
        .map_err(|error| io_error("ouverture du dossier parent", parent, error))?;
    directory
        .sync_all()
        .map_err(|error| io_error("synchronisation du dossier parent", parent, error))
}

#[cfg(not(unix))]
fn sync_parent_directory(_parent: &Path) -> Result<(), LibraryError> {
    Ok(())
}

fn io_error(operation: &'static str, path: &Path, error: impl fmt::Display) -> LibraryError {
    LibraryError::Io {
        operation,
        path: path.to_path_buf(),
        message: error.to_string(),
    }
}

fn format_system_time(time: SystemTime) -> String {
    let duration = time.duration_since(UNIX_EPOCH).unwrap_or_default();
    let total_seconds = duration.as_secs();
    let milliseconds = duration.subsec_millis();
    let days = (total_seconds / 86_400) as i64;
    let seconds_of_day = total_seconds % 86_400;
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    let (year, month, day) = civil_date_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}.{milliseconds:03}Z")
}

fn civil_date_from_days(days_since_epoch: i64) -> (i64, i64, i64) {
    let shifted = days_since_epoch + 719_468;
    let era = if shifted >= 0 {
        shifted
    } else {
        shifted - 146_096
    } / 146_097;
    let day_of_era = shifted - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    if month <= 2 {
        year += 1;
    }
    (year, month, day)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{collections::VecDeque, sync::Mutex, time::Duration};

    const FIRST_ID: &str = "11111111-1111-4111-8111-111111111111";
    const SECOND_ID: &str = "22222222-2222-4222-8222-222222222222";

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new(name: &str) -> Self {
            let unique = Uuid::new_v4();
            let path = std::env::temp_dir().join(format!("plum3-library-{name}-{unique}"));
            fs::create_dir_all(&path).expect("racine temporaire créée");
            Self(path)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    struct SequenceIds(Mutex<VecDeque<String>>);

    impl SequenceIds {
        fn new(ids: &[&str]) -> Self {
            Self(Mutex::new(ids.iter().map(|id| (*id).to_string()).collect()))
        }
    }

    impl IdGenerator for SequenceIds {
        fn generate(&self) -> String {
            self.0
                .lock()
                .expect("séquence d’identifiants accessible")
                .pop_front()
                .expect("identifiant de test disponible")
        }
    }

    struct SequenceClock(Mutex<VecDeque<String>>);

    impl SequenceClock {
        fn new(values: &[&str]) -> Self {
            Self(Mutex::new(
                values.iter().map(|value| (*value).to_string()).collect(),
            ))
        }
    }

    impl Clock for SequenceClock {
        fn now(&self) -> String {
            self.0
                .lock()
                .expect("horloge de test accessible")
                .pop_front()
                .expect("instant de test disponible")
        }
    }

    fn repository(root: &Path, ids: &[&str], timestamps: &[&str]) -> LibraryRepository {
        LibraryRepository::with_components(
            root.to_path_buf(),
            Box::new(SequenceIds::new(ids)),
            Box::new(SequenceClock::new(timestamps)),
        )
    }

    fn request(title: &str, content: &str) -> CreateLibraryDocument {
        CreateLibraryDocument {
            title: title.to_string(),
            template_type: Some("blank".to_string()),
            content: content.to_string(),
        }
    }

    fn migration_request(
        name: &str,
        content: &str,
        saved_at: &str,
    ) -> RecoveryDraftMigrationRequest {
        RecoveryDraftMigrationRequest {
            name: name.to_string(),
            content: content.to_string(),
            saved_at: saved_at.to_string(),
            template_type: None,
        }
    }

    #[test]
    fn initialise_une_bibliotheque_vide_avec_index_versionne() {
        let root = TestDirectory::new("empty");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T18:00:00.000Z"]);

        let index = repository.initialize().expect("bibliothèque initialisée");

        assert_eq!(index, LibraryIndex::default());
        assert!(repository.documents_directory().is_dir());
        assert!(repository.index_path().is_file());
        let serialized = fs::read_to_string(repository.index_path()).expect("index lisible");
        assert!(serialized.contains("\"schemaVersion\": 1"));
        assert!(serialized.contains("\"activeDocumentId\": null"));
        assert!(serialized.contains("\"recoveryDraftV1\": null"));
    }

    #[test]
    fn cree_deux_documents_physiques_distincts_et_relit_leurs_contenus() {
        let root = TestDirectory::new("two-documents");
        let repository = repository(
            &root.0,
            &[FIRST_ID, SECOND_ID],
            &["2026-07-17T18:00:00.000Z", "2026-07-17T18:01:00.000Z"],
        );

        let first = repository
            .create_document(request("Premier", "# Premier\n"))
            .expect("premier document créé");
        let second = repository
            .create_document(request("Second", "# Second\n"))
            .expect("second document créé");

        assert_ne!(first.id, second.id);
        assert_ne!(first.file_name, second.file_name);
        assert!(repository
            .documents_directory()
            .join(&first.file_name)
            .is_file());
        assert!(repository
            .documents_directory()
            .join(&second.file_name)
            .is_file());
        assert_eq!(
            repository
                .read_document(&first.id)
                .expect("premier relu")
                .content,
            "# Premier\n"
        );
        assert_eq!(
            repository
                .read_document(&second.id)
                .expect("second relu")
                .content,
            "# Second\n"
        );
    }

    #[test]
    fn conserve_identifiants_index_et_contenus_apres_reconstruction() {
        let root = TestDirectory::new("reopen");
        let repository = repository(
            &root.0,
            &[FIRST_ID, SECOND_ID],
            &["2026-07-17T18:00:00.000Z", "2026-07-17T18:01:00.000Z"],
        );
        let first = repository
            .create_document(request("Premier", "alpha"))
            .expect("premier créé");
        let second = repository
            .create_document(request("Second", "beta"))
            .expect("second créé");
        drop(repository);

        let reopened = LibraryRepository::new(&root.0);
        let index = reopened.initialize().expect("index rouvert");
        let ids = index
            .documents
            .iter()
            .map(|document| document.id.as_str())
            .collect::<HashSet<_>>();

        assert_eq!(ids, HashSet::from([first.id.as_str(), second.id.as_str()]));
        assert_eq!(
            index.active_document_id.as_deref(),
            Some(second.id.as_str())
        );
        assert_eq!(
            reopened
                .read_document(&first.id)
                .expect("alpha relu")
                .content,
            "alpha"
        );
        assert_eq!(
            reopened
                .read_document(&second.id)
                .expect("beta relu")
                .content,
            "beta"
        );
    }

    #[test]
    fn classe_les_documents_par_updated_at_decroissant() {
        let root = TestDirectory::new("sorting");
        let repository = repository(
            &root.0,
            &[FIRST_ID, SECOND_ID],
            &[
                "2026-07-17T18:00:00.000Z",
                "2026-07-17T18:01:00.000Z",
                "2026-07-17T18:02:00.000Z",
            ],
        );
        let first = repository
            .create_document(request("Premier", "avant"))
            .expect("premier créé");
        let second = repository
            .create_document(request("Second", "second"))
            .expect("second créé");

        repository
            .save_document(&first.id, "après")
            .expect("premier mis à jour");
        let listed = repository.list_documents().expect("liste lisible");

        assert_eq!(listed[0].id, first.id);
        assert_eq!(listed[1].id, second.id);
        assert_eq!(
            repository
                .read_document(&first.id)
                .expect("contenu relu")
                .content,
            "après"
        );
    }

    #[test]
    fn ouvre_un_document_met_a_jour_last_opened_at_et_conserve_l_index_coherent() {
        let root = TestDirectory::new("open-document");
        let repository = repository(
            &root.0,
            &[FIRST_ID],
            &["2026-07-17T18:00:00.000Z", "2026-07-17T18:05:00.000Z"],
        );
        let created = repository
            .create_document(request("À ouvrir", "# Contenu"))
            .expect("document créé");

        let opened = repository
            .open_document(&created.id)
            .expect("document ouvert");

        assert_eq!(opened.content, "# Contenu");
        assert_eq!(
            opened.document.last_opened_at.as_deref(),
            Some("2026-07-17T18:05:00.000Z")
        );
        let index = repository.initialize().expect("index cohérent");
        assert_eq!(
            index.active_document_id.as_deref(),
            Some(created.id.as_str())
        );
        assert_eq!(
            index.documents[0].last_opened_at.as_deref(),
            Some("2026-07-17T18:05:00.000Z")
        );
    }

    #[test]
    fn refuse_explicitement_l_ouverture_d_un_document_absent() {
        let root = TestDirectory::new("open-missing");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T18:00:00.000Z"]);

        assert_eq!(
            repository
                .open_document(SECOND_ID)
                .expect_err("document absent refusé"),
            LibraryError::DocumentNotFound(SECOND_ID.to_string())
        );
    }

    #[test]
    fn rejette_un_identifiant_duplique_sans_ecraser_le_document_existant() {
        let root = TestDirectory::new("duplicate");
        let repository = repository(
            &root.0,
            &[FIRST_ID, FIRST_ID],
            &["2026-07-17T18:00:00.000Z", "2026-07-17T18:01:00.000Z"],
        );
        let first = repository
            .create_document(request("Premier", "contenu conservé"))
            .expect("premier créé");

        let error = repository
            .create_document(request("Doublon", "contenu interdit"))
            .expect_err("doublon refusé");

        assert_eq!(
            error,
            LibraryError::DuplicateDocumentId(FIRST_ID.to_string())
        );
        assert_eq!(
            repository
                .read_document(&first.id)
                .expect("contenu relu")
                .content,
            "contenu conservé"
        );
    }

    #[test]
    fn detecte_une_reference_dont_le_fichier_markdown_est_absent() {
        let root = TestDirectory::new("missing");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T18:00:00.000Z"]);
        let document = repository
            .create_document(request("À retirer", "contenu"))
            .expect("document créé");
        let path = repository.documents_directory().join(&document.file_name);
        fs::remove_file(&path).expect("fichier retiré pour simuler l’incohérence");

        let reopened = LibraryRepository::new(&root.0);
        let error = reopened
            .initialize()
            .expect_err("référence manquante détectée");

        assert_eq!(
            error,
            LibraryError::MissingDocumentFile {
                id: document.id,
                path,
            }
        );
    }

    #[test]
    fn recupere_une_sauvegarde_et_supprime_un_temporaire_residuel() {
        let root = TestDirectory::new("recovery");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T18:00:00.000Z"]);
        let document = repository
            .create_document(request("Récupération", "version sûre"))
            .expect("document créé");
        let path = repository.documents_directory().join(&document.file_name);
        let backup = sibling_with_suffix(&path, ".bak");
        let temporary = sibling_with_suffix(&path, ".tmp");
        fs::rename(&path, &backup).expect("interruption simulée après création du backup");
        fs::write(&temporary, "écriture incomplète").expect("temporaire résiduel créé");

        let reopened = LibraryRepository::new(&root.0);
        reopened.initialize().expect("bibliothèque récupérée");

        assert_eq!(
            reopened
                .read_document(&document.id)
                .expect("document récupéré")
                .content,
            "version sûre"
        );
        assert!(!backup.exists());
        assert!(!temporary.exists());
    }

    #[test]
    fn migre_un_brouillon_valide_en_conservant_exactement_son_nom_et_son_contenu() {
        let root = TestDirectory::new("migrate-valid");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T19:00:00.000Z"]);
        let content = "# Éclat\n\n  Texte conservé.\n";

        let result = repository
            .migrate_recovery_draft(migration_request(
                "Mon brouillon.md",
                content,
                "2026-07-17T18:59:00.000Z",
            ))
            .expect("brouillon migré");

        assert!(result.created);
        assert_eq!(result.document.title, "Mon brouillon.md");
        assert_eq!(result.document.project_id, None);
        assert_eq!(result.document.template_type, None);
        assert_eq!(
            repository
                .read_document(&result.document.id)
                .expect("document migré relu")
                .content,
            content
        );
        let index = repository.initialize().expect("index relu");
        assert_eq!(index.documents.len(), 1);
        assert_eq!(
            index.migrations.recovery_draft_v1,
            Some(RecoveryDraftMigration {
                source_saved_at: "2026-07-17T18:59:00.000Z".to_string(),
                document_id: result.document.id,
            })
        );
        assert!(!repository.recovery_draft_migration_path.exists());
    }

    #[test]
    fn applique_le_nom_de_secours_a_un_brouillon_sans_nom_exploitable() {
        let root = TestDirectory::new("migrate-fallback");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T19:00:00.000Z"]);

        let result = repository
            .migrate_recovery_draft(migration_request(
                "   ",
                "contenu",
                "2026-07-17T18:59:00.000Z",
            ))
            .expect("brouillon migré");

        assert_eq!(result.document.title, RECOVERED_DRAFT_TITLE);
    }

    #[test]
    fn rejoue_la_meme_migration_sans_dupliquer_le_document() {
        let root = TestDirectory::new("migrate-idempotent");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T19:00:00.000Z"]);
        let request = migration_request("Stable.md", "contenu stable", "2026-07-17T18:59:00.000Z");
        let first = repository
            .migrate_recovery_draft(request.clone())
            .expect("première migration");
        let replay = repository
            .migrate_recovery_draft(request)
            .expect("migration rejouée");

        assert!(first.created);
        assert!(!replay.created);
        assert_eq!(replay.document.id, first.document.id);
        assert_eq!(
            repository.list_documents().expect("documents listés").len(),
            1
        );
    }

    #[test]
    fn traite_un_nouveau_brouillon_et_refuse_ensuite_la_source_ancienne() {
        let root = TestDirectory::new("migrate-newer");
        let repository = repository(
            &root.0,
            &[FIRST_ID, SECOND_ID],
            &["2026-07-17T19:00:00.000Z", "2026-07-17T19:02:00.000Z"],
        );
        let old_request =
            migration_request("Premier.md", "premier contenu", "2026-07-17T18:59:00.000Z");
        let first = repository
            .migrate_recovery_draft(old_request.clone())
            .expect("premier brouillon migré");
        let second = repository
            .migrate_recovery_draft(migration_request(
                "Second.md",
                "second contenu",
                "2026-07-17T19:01:00.000Z",
            ))
            .expect("nouveau brouillon migré");

        assert_ne!(first.document.id, second.document.id);
        assert_eq!(
            repository.list_documents().expect("documents listés").len(),
            2
        );
        assert_eq!(
            repository
                .migrate_recovery_draft(old_request)
                .expect_err("ancienne source refusée"),
            LibraryError::StaleRecoveryDraft {
                received: "2026-07-17T18:59:00.000Z".to_string(),
                migrated: "2026-07-17T19:01:00.000Z".to_string(),
            }
        );
    }

    #[test]
    fn detecte_un_document_de_migration_absent_de_l_index() {
        let root = TestDirectory::new("missing-migration-document");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T19:00:00.000Z"]);
        let migrated = repository
            .migrate_recovery_draft(migration_request(
                "Absent.md",
                "contenu",
                "2026-07-17T18:59:00.000Z",
            ))
            .expect("migration initiale");
        let mut index = repository.initialize().expect("index lisible");
        index.documents.clear();
        index.active_document_id = None;
        fs::remove_file(
            repository
                .documents_directory()
                .join(&migrated.document.file_name),
        )
        .expect("fichier retiré");
        let mut bytes = serde_json::to_vec_pretty(&index).expect("index sérialisé");
        bytes.push(b'\n');
        atomic_write(repository.index_path(), &bytes).expect("index incohérent écrit pour le test");

        let reopened = LibraryRepository::new(&root.0);
        assert_eq!(
            reopened
                .initialize()
                .expect_err("référence de migration manquante détectée"),
            LibraryError::MissingMigrationDocument(migrated.document.id)
        );
    }

    #[test]
    fn termine_une_migration_interrompue_a_partir_du_journal() {
        let root = TestDirectory::new("migration-journal");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T19:00:00.000Z"]);
        repository.initialize().expect("bibliothèque initialisée");
        let document = LibraryDocument {
            id: FIRST_ID.to_string(),
            project_id: None,
            title: "Interrompu.md".to_string(),
            file_name: format!("{FIRST_ID}.md"),
            template_type: None,
            created_at: "2026-07-17T19:00:00.000Z".to_string(),
            updated_at: "2026-07-17T19:00:00.000Z".to_string(),
            last_opened_at: None,
        };
        repository
            .write_migration_journal(&RecoveryDraftMigrationJournal {
                source_saved_at: "2026-07-17T18:59:00.000Z".to_string(),
                document: document.clone(),
                content: "contenu après interruption".to_string(),
            })
            .expect("journal écrit");
        drop(repository);

        let reopened = LibraryRepository::new(&root.0);
        let index = reopened.initialize().expect("migration reprise");

        assert_eq!(index.documents, vec![document.clone()]);
        assert_eq!(
            reopened
                .read_document(&document.id)
                .expect("document repris relu")
                .content,
            "contenu après interruption"
        );
        assert_eq!(
            index
                .migrations
                .recovery_draft_v1
                .expect("marqueur présent")
                .document_id,
            document.id
        );
        assert!(!reopened.recovery_draft_migration_path.exists());
    }

    #[test]
    fn un_echec_du_depot_ne_modifie_pas_la_source_et_ne_cree_aucun_document() {
        let root = TestDirectory::new("migration-failure");
        let repository = repository(&root.0, &[FIRST_ID], &["2026-07-17T19:00:00.000Z"]);
        let request = migration_request("Source.md", "contenu", "   ");
        let original = request.clone();

        assert_eq!(
            repository
                .migrate_recovery_draft(request.clone())
                .expect_err("source invalide refusée"),
            LibraryError::InvalidRecoveryDraftSource
        );
        assert_eq!(request, original);
        assert!(repository
            .list_documents()
            .expect("bibliothèque lisible")
            .is_empty());
    }

    #[test]
    fn formate_les_dates_systeme_en_iso_8601_utc() {
        let epoch = UNIX_EPOCH + Duration::from_millis(1_234);
        assert_eq!(format_system_time(epoch), "1970-01-01T00:00:01.234Z");
        let known = UNIX_EPOCH + Duration::from_secs(951_827_696);
        assert_eq!(format_system_time(known), "2000-02-29T12:34:56.000Z");
    }
}
