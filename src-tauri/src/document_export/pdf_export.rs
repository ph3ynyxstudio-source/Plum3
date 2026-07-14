use super::{export_error, write_bytes, ExportError, ExportFontKind, ExportStyle};
use printpdf::{GeneratePdfOptions, PdfDocument, PdfSaveOptions};
use pulldown_cmark::{html, Event, Options, Parser};
use std::{collections::BTreeMap, path::Path};

pub fn write_pdf(path: &Path, markdown: &str, style: &ExportStyle) -> Result<(), ExportError> {
    let mut markdown_html = String::new();
    let options =
        Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS;
    let events = Parser::new_ext(markdown, options).filter_map(|event| match event {
        Event::Html(_) | Event::InlineHtml(_) => None,
        other => Some(other),
    });
    html::push_html(&mut markdown_html, events);

    let font_family = match style.font_kind {
        ExportFontKind::Serif => "Georgia, 'Times New Roman', serif",
        ExportFontKind::Sans => "Arial, Helvetica, sans-serif",
        ExportFontKind::Mono => "Consolas, 'Courier New', monospace",
    };
    let html = format!(
        r#"<!doctype html>
<html><head><meta charset="utf-8"><style>
body {{ font-family: {font_family}; font-size: {font_size}pt; line-height: {line_height}; color: {text_color}; }}
h1 {{ font-size: 2em; margin: 0 0 0.55em; }}
h2 {{ font-size: 1.55em; margin: 1.15em 0 0.45em; }}
h3 {{ font-size: 1.3em; margin: 1em 0 0.4em; }}
h4, h5, h6 {{ margin: 0.9em 0 0.35em; }}
p {{ margin: 0 0 0.8em; }}
ul, ol {{ margin: 0 0 0.85em; padding-left: 1.7em; }}
li {{ margin-bottom: 0.25em; }}
blockquote {{ margin: 0.9em 0; padding: 0.35em 0 0.35em 1em; border-left: 3px solid #9a7bb5; font-style: italic; }}
table {{ width: 100%; margin: 1em 0; border-collapse: collapse; }}
th, td {{ padding: 0.45em 0.55em; border: 1px solid #cec5b9; text-align: left; vertical-align: top; }}
th {{ font-weight: bold; }}
hr {{ margin: 1.35em 0; border: 0; border-top: 1px solid #cec5b9; }}
code {{ font-family: Consolas, 'Courier New', monospace; }}
pre {{ padding: 0.8em; white-space: pre-wrap; background: #f3f0eb; }}
a {{ color: #765b91; text-decoration: underline; }}
</style></head><body>{markdown_html}</body></html>"#,
        font_size = style.font_size(),
        line_height = style.line_height(),
        text_color = style.text_color(),
    );

    let generate_options = GeneratePdfOptions {
        page_width: Some(210.0),
        page_height: Some(297.0),
        margin_top: Some(20.0),
        margin_right: Some(20.0),
        margin_bottom: Some(20.0),
        margin_left: Some(20.0),
        show_page_numbers: Some(false),
        ..Default::default()
    };
    let mut warnings = Vec::new();
    let document = PdfDocument::from_html(
        &html,
        &BTreeMap::new(),
        &BTreeMap::new(),
        &generate_options,
        &mut warnings,
    )
    .map_err(|message| export_error("pdf_generation_error", message))?;
    let bytes = document.save(&PdfSaveOptions::default(), &mut warnings);
    write_bytes(path, &bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn genere_un_pdf_reel() {
        let path =
            std::env::temp_dir().join(format!("plum3-export-pdf-{}.pdf", std::process::id()));
        let markdown = "# Titre H1\n\n## Titre H2\n\n### Titre H3\n\nParagraphe **gras**, *italique* et [lien](https://example.com).\n\n- Un\n- Deux\n\n1. Premier\n2. Deuxième\n\n> Citation accentuée : déjà vu.\n\n```rust\nfn main() { println!(\"Plum3 🌙\"); }\n```\n\n| Élément | Valeur |\n|---|---|\n| Unicode | café — 東京 ✨ |\n\n---";
        let source_before = markdown.as_bytes().to_vec();

        let style = ExportStyle {
            font_kind: ExportFontKind::Serif,
            font_size: 14.0,
            line_height: 1.6,
            text_color: "#302c34".to_string(),
        };
        write_pdf(&path, markdown, &style).expect("export PDF");
        let bytes = fs::read(&path).expect("lecture PDF");

        assert!(bytes.starts_with(b"%PDF-"));
        assert!(bytes.len() > 1_000);
        assert_eq!(markdown.as_bytes(), source_before);
        let _ = fs::remove_file(path);
    }
}
