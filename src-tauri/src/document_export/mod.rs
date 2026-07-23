mod docx_export;
mod markdown_model;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
mod pdf_export;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::fs;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
use std::path::PathBuf;
#[cfg(target_os = "android")]
use tauri::{AppHandle, Manager, Runtime};
#[cfg(target_os = "android")]
use uuid::Uuid;

#[cfg(target_os = "android")]
use crate::android_document_export::{
    save_export, share_export, SaveExportRequest, ShareExportRequest,
};

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Pdf,
    Docx,
    Markdown,
}

impl ExportFormat {
    fn extension(self) -> &'static str {
        match self {
            Self::Pdf => "pdf",
            Self::Docx => "docx",
            Self::Markdown => "md",
        }
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    fn label(self) -> &'static str {
        match self {
            Self::Pdf => "PDF",
            Self::Docx => "Word",
            Self::Markdown => "Markdown",
        }
    }

    #[cfg(target_os = "android")]
    fn mime_type(self) -> &'static str {
        match self {
            Self::Pdf => "application/pdf",
            Self::Docx => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            Self::Markdown => "text/markdown",
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFontKind {
    Serif,
    Sans,
    Mono,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportStyle {
    pub font_kind: ExportFontKind,
    pub font_size: f32,
    pub line_height: f32,
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    pub text_color: String,
}

impl ExportStyle {
    fn font_size(&self) -> f32 {
        self.font_size.clamp(10.0, 22.0)
    }

    fn line_height(&self) -> f32 {
        self.line_height.clamp(1.2, 2.0)
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    fn text_color(&self) -> &str {
        if self.text_color.len() == 7
            && self.text_color.starts_with('#')
            && self.text_color[1..]
                .chars()
                .all(|character| character.is_ascii_hexdigit())
        {
            &self.text_color
        } else {
            "#302c34"
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub format: ExportFormat,
    pub source_name: String,
    pub content: String,
    pub style: ExportStyle,
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    pub locale: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub export_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportError {
    pub code: String,
    pub message: String,
}

fn export_error(code: &str, message: impl Into<String>) -> ExportError {
    ExportError {
        code: code.to_string(),
        message: message.into(),
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
pub fn export_document(request: ExportRequest) -> Result<Option<ExportResult>, ExportError> {
    let suggested_name = suggested_export_name(&request.source_name, request.format);
    let title = if request.locale == "en" {
        format!("Export as {}", request.format.label())
    } else {
        format!("Exporter en {}", request.format.label())
    };
    let Some(selected) = FileDialog::new()
        .set_title(title)
        .set_file_name(&suggested_name)
        .add_filter(request.format.label(), &[request.format.extension()])
        .save_file()
    else {
        return Ok(None);
    };

    let path = enforce_extension(selected, request.format);
    match request.format {
        ExportFormat::Pdf => pdf_export::write_pdf(&path, &request.content, &request.style)?,
        ExportFormat::Docx => docx_export::write_docx(&path, &request.content, &request.style)?,
        ExportFormat::Markdown => write_bytes(&path, request.content.as_bytes())?,
    }

    Ok(Some(ExportResult {
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&suggested_name)
            .to_string(),
        path: path.to_string_lossy().into_owned(),
        export_id: None,
        mime_type: None,
    }))
}

#[cfg(target_os = "android")]
#[tauri::command]
pub fn export_document<R: Runtime>(
    app: AppHandle<R>,
    request: ExportRequest,
) -> Result<Option<ExportResult>, ExportError> {
    let cache_root = app
        .path()
        .app_cache_dir()
        .map_err(|source| export_error("export_write_error", source.to_string()))?
        .join("document-exports");
    fs::create_dir_all(&cache_root)
        .map_err(|source| export_error("export_write_error", source.to_string()))?;
    clean_export_cache(&cache_root)?;

    let suggested_name = suggested_export_name(&request.source_name, request.format);
    let temporary_path =
        cache_root.join(format!("{}.{}", Uuid::new_v4(), request.format.extension()));
    match request.format {
        ExportFormat::Docx => {
            docx_export::write_docx(&temporary_path, &request.content, &request.style)?
        }
        ExportFormat::Markdown => write_bytes(&temporary_path, request.content.as_bytes())?,
        ExportFormat::Pdf => {
            let _ = fs::remove_file(&temporary_path);
            return Err(export_error(
                "pdf_mobile_unavailable",
                "L’export PDF Android n’est pas disponible avec le moteur actuel.",
            ));
        }
    }

    let native_result = save_export(
        &app,
        SaveExportRequest {
            source_path: temporary_path.to_string_lossy().into_owned(),
            suggested_name: suggested_name.clone(),
            mime_type: request.format.mime_type().to_string(),
        },
    );
    let _ = fs::remove_file(&temporary_path);
    let native_result =
        native_result.map_err(|message| export_error("export_write_error", message))?;
    if native_result.cancelled {
        return Ok(None);
    }

    let export_id = native_result.export_id.ok_or_else(|| {
        export_error(
            "export_write_error",
            "Android n’a pas retourné l’identifiant de l’export.",
        )
    })?;
    Ok(Some(ExportResult {
        path: String::new(),
        name: native_result.name.unwrap_or(suggested_name),
        export_id: Some(export_id),
        mime_type: Some(
            native_result
                .mime_type
                .unwrap_or_else(|| request.format.mime_type().to_string()),
        ),
    }))
}

#[cfg(target_os = "android")]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareExportedDocumentRequest {
    export_id: String,
    chooser_title: String,
}

#[cfg(target_os = "android")]
#[tauri::command]
pub fn share_exported_document<R: Runtime>(
    app: AppHandle<R>,
    request: ShareExportedDocumentRequest,
) -> Result<(), ExportError> {
    share_export(
        &app,
        ShareExportRequest {
            export_id: request.export_id,
            chooser_title: request.chooser_title,
        },
    )
    .map_err(|message| export_error("export_share_error", message))
}

#[cfg(any(target_os = "android", test))]
fn clean_export_cache(cache_root: &std::path::Path) -> Result<(), ExportError> {
    for entry in fs::read_dir(cache_root)
        .map_err(|source| export_error("export_write_error", source.to_string()))?
    {
        let entry =
            entry.map_err(|source| export_error("export_write_error", source.to_string()))?;
        if entry
            .file_type()
            .map_err(|source| export_error("export_write_error", source.to_string()))?
            .is_file()
        {
            fs::remove_file(entry.path())
                .map_err(|source| export_error("export_write_error", source.to_string()))?;
        }
    }
    Ok(())
}

#[cfg(target_os = "ios")]
#[tauri::command]
pub fn export_document(_request: ExportRequest) -> Result<Option<ExportResult>, ExportError> {
    Err(export_error(
        "mobile_file_dialog_unavailable",
        "L’export vers un document mobile n’est pas disponible sur iOS.",
    ))
}

fn suggested_export_name(source_name: &str, format: ExportFormat) -> String {
    let stem = std::path::Path::new(source_name)
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Document");
    format!("{stem}.{}", format.extension())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn enforce_extension(mut path: PathBuf, format: ExportFormat) -> PathBuf {
    if path
        .extension()
        .and_then(|value| value.to_str())
        .is_none_or(|extension| !extension.eq_ignore_ascii_case(format.extension()))
    {
        path.set_extension(format.extension());
    }
    path
}

fn write_bytes(path: &std::path::Path, bytes: &[u8]) -> Result<(), ExportError> {
    fs::write(path, bytes).map_err(|source| {
        export_error(
            "export_write_error",
            format!("Impossible de créer la copie exportée : {source}"),
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn propose_le_nom_sans_modifier_la_source() {
        assert_eq!(
            suggested_export_name("Roman.md", ExportFormat::Pdf),
            "Roman.pdf"
        );
        assert_eq!(
            suggested_export_name("Roman.md", ExportFormat::Docx),
            "Roman.docx"
        );
        assert_eq!(
            suggested_export_name("Roman.docx", ExportFormat::Markdown),
            "Roman.md"
        );
    }

    #[test]
    fn nettoie_uniquement_les_fichiers_temporaires_d_export() {
        let root = std::env::temp_dir().join(format!(
            "plum3-export-cache-{}-{}",
            std::process::id(),
            uuid::Uuid::new_v4()
        ));
        let nested = root.join("dossier-conserve");
        fs::create_dir_all(&nested).expect("création du cache de test");
        fs::write(root.join("ancien.docx"), b"PK").expect("création DOCX temporaire");
        fs::write(root.join("ancien.pdf"), b"%PDF-").expect("création PDF temporaire");

        clean_export_cache(&root).expect("nettoyage du cache");

        assert!(!root.join("ancien.docx").exists());
        assert!(!root.join("ancien.pdf").exists());
        assert!(nested.is_dir());
        let _ = fs::remove_dir_all(root);
    }
}
