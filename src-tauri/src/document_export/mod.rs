mod docx_export;
mod markdown_model;
mod pdf_export;

use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Pdf,
    Docx,
}

impl ExportFormat {
    fn extension(self) -> &'static str {
        match self {
            Self::Pdf => "pdf",
            Self::Docx => "docx",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Pdf => "PDF",
            Self::Docx => "Word",
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
    pub text_color: String,
}

impl ExportStyle {
    fn font_size(&self) -> f32 {
        self.font_size.clamp(10.0, 22.0)
    }

    fn line_height(&self) -> f32 {
        self.line_height.clamp(1.2, 2.0)
    }

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
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    pub name: String,
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

#[tauri::command]
pub fn export_document(request: ExportRequest) -> Result<Option<ExportResult>, ExportError> {
    let suggested_name = suggested_export_name(&request.source_name, request.format);
    let Some(selected) = FileDialog::new()
        .set_title(format!("Exporter en {}", request.format.label()))
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
    }

    Ok(Some(ExportResult {
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&suggested_name)
            .to_string(),
        path: path.to_string_lossy().into_owned(),
    }))
}

fn suggested_export_name(source_name: &str, format: ExportFormat) -> String {
    let stem = std::path::Path::new(source_name)
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Document");
    format!("{stem}.{}", format.extension())
}

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
    }
}
