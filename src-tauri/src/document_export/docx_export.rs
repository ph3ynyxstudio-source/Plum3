use super::markdown_model::{parse_markdown, Block, InlineSpan};
use super::{export_error, ExportError, ExportFontKind, ExportStyle};
use docx_rs::*;
use std::{fs::File, path::Path};

const CONTENT_WIDTH_DXA: usize = 9360;
const BULLET_NUMBERING_ID: usize = 11;
const ORDERED_NUMBERING_ID: usize = 12;

pub fn write_docx(path: &Path, markdown: &str, style: &ExportStyle) -> Result<(), ExportError> {
    let blocks = parse_markdown(markdown);
    let font_name = match style.font_kind {
        ExportFontKind::Serif => "Georgia",
        ExportFontKind::Sans => "Arial",
        ExportFontKind::Mono => "Consolas",
    };
    let body_size = (style.font_size() * 2.0).round() as usize;
    let line = (style.line_height() * 240.0).round() as i32;
    let fonts = run_fonts(font_name);

    let mut document = Docx::new()
        .page_margin(
            PageMargin::new()
                .top(1440)
                .right(1440)
                .bottom(1440)
                .left(1440)
                .header(708)
                .footer(708),
        )
        .add_style(
            Style::new("PlumBody", StyleType::Paragraph)
                .name("Plum Body")
                .fonts(fonts.clone())
                .size(body_size)
                .line_spacing(
                    LineSpacing::new()
                        .line_rule(LineSpacingType::Auto)
                        .after(160)
                        .line(line),
                ),
        )
        .add_style(heading_style(
            "PlumHeading1",
            "Plum Heading 1",
            fonts.clone(),
            40,
            0,
            400,
            120,
        ))
        .add_style(heading_style(
            "PlumHeading2",
            "Plum Heading 2",
            fonts.clone(),
            32,
            1,
            360,
            120,
        ))
        .add_style(heading_style(
            "PlumHeading3",
            "Plum Heading 3",
            fonts.clone(),
            28,
            2,
            320,
            80,
        ))
        .add_style(heading_style(
            "PlumHeading4",
            "Plum Heading 4",
            fonts.clone(),
            24,
            3,
            280,
            80,
        ))
        .add_style(heading_style(
            "PlumHeading5",
            "Plum Heading 5",
            fonts.clone(),
            22,
            4,
            240,
            60,
        ))
        .add_style(heading_style(
            "PlumHeading6",
            "Plum Heading 6",
            fonts.clone(),
            22,
            5,
            200,
            60,
        ))
        .add_style(
            Style::new("PlumQuote", StyleType::Paragraph)
                .name("Plum Quote")
                .fonts(fonts.clone())
                .size(body_size)
                .italic()
                .color("555555")
                .indent(Some(420), None, None, None)
                .line_spacing(
                    LineSpacing::new()
                        .line_rule(LineSpacingType::Auto)
                        .after(160)
                        .line(line),
                ),
        );

    let (bullet_abstract, bullet_numbering) = list_numbering(false, BULLET_NUMBERING_ID);
    let (ordered_abstract, ordered_numbering) = list_numbering(true, ORDERED_NUMBERING_ID);
    document = document
        .add_abstract_numbering(bullet_abstract)
        .add_numbering(bullet_numbering)
        .add_abstract_numbering(ordered_abstract)
        .add_numbering(ordered_numbering);
    document = add_blocks(document, &blocks, 0, font_name, body_size);

    let file = File::create(path).map_err(|source| {
        export_error(
            "export_write_error",
            format!("Impossible de créer la copie Word : {source}"),
        )
    })?;
    document
        .build()
        .pack(file)
        .map_err(|source| export_error("docx_generation_error", source.to_string()))
}

fn heading_style(
    id: &str,
    name: &str,
    fonts: RunFonts,
    size: usize,
    outline_level: usize,
    before: u32,
    after: u32,
) -> Style {
    Style::new(id, StyleType::Paragraph)
        .name(name)
        .fonts(fonts)
        .size(size)
        .color(if outline_level < 2 {
            "000000"
        } else {
            "434343"
        })
        .outline_lvl(outline_level)
        .q_format(true)
        .line_spacing(
            LineSpacing::new()
                .line_rule(LineSpacingType::Auto)
                .before(before)
                .after(after)
                .line(276),
        )
}

fn list_numbering(ordered: bool, id: usize) -> (AbstractNumbering, Numbering) {
    let mut abstract_numbering = AbstractNumbering::new(id);
    for level in 0..9 {
        let format = if ordered { "decimal" } else { "bullet" };
        let level_text = if ordered {
            format!("%{}.", level + 1)
        } else {
            match level % 3 {
                0 => "●".to_string(),
                1 => "○".to_string(),
                _ => "▪".to_string(),
            }
        };
        let indent = 720 + (level as i32 * 360);
        abstract_numbering = abstract_numbering.add_level(
            Level::new(
                level,
                Start::new(1),
                NumberFormat::new(format),
                LevelText::new(level_text),
                LevelJc::new("left"),
            )
            .indent(
                Some(indent),
                Some(SpecialIndentType::Hanging(360)),
                None,
                None,
            ),
        );
    }
    (abstract_numbering, Numbering::new(id, id))
}

fn add_blocks(
    mut document: Docx,
    blocks: &[Block],
    list_depth: usize,
    font_name: &str,
    body_size: usize,
) -> Docx {
    for block in blocks {
        document = match block {
            Block::Heading { level, content } => {
                let size = match level {
                    1 => 40,
                    2 => 32,
                    3 => 28,
                    4 => 24,
                    _ => 22,
                };
                document.add_paragraph(paragraph_from_spans(
                    Paragraph::new().style(&format!("PlumHeading{level}")),
                    content,
                    font_name,
                    size,
                ))
            }
            Block::Paragraph(content) => document.add_paragraph(paragraph_from_spans(
                Paragraph::new().style("PlumBody"),
                content,
                font_name,
                body_size,
            )),
            Block::Quote(inner) => {
                let spans = quote_spans(inner);
                document.add_paragraph(paragraph_from_spans(
                    Paragraph::new().style("PlumQuote"),
                    &spans,
                    font_name,
                    body_size,
                ))
            }
            Block::List { ordered, items } => {
                add_list(document, *ordered, items, list_depth, font_name, body_size)
            }
            Block::Table { rows } => document.add_table(render_table(rows, font_name, body_size)),
            Block::Rule => document.add_paragraph(
                Paragraph::new().style("PlumBody").add_run(
                    Run::new()
                        .add_text("────────────────────────")
                        .color("DADCE0"),
                ),
            ),
            Block::Code(code) => document.add_paragraph(
                Paragraph::new().style("PlumBody").add_run(
                    Run::new()
                        .add_text(code)
                        .fonts(run_fonts("Consolas"))
                        .size(body_size)
                        .shading(Shading::new().fill("F3F3F3")),
                ),
            ),
        };
    }
    document
}

fn add_list(
    mut document: Docx,
    ordered: bool,
    items: &[Vec<Block>],
    depth: usize,
    font_name: &str,
    body_size: usize,
) -> Docx {
    let numbering_id = if ordered {
        ORDERED_NUMBERING_ID
    } else {
        BULLET_NUMBERING_ID
    };
    for item in items {
        let mut numbered = false;
        for block in item {
            match block {
                Block::Paragraph(spans) if !numbered => {
                    let paragraph = Paragraph::new().style("PlumBody").numbering(
                        NumberingId::new(numbering_id),
                        IndentLevel::new(depth.min(8)),
                    );
                    document = document.add_paragraph(paragraph_from_spans(
                        paragraph, spans, font_name, body_size,
                    ));
                    numbered = true;
                }
                Block::List { ordered, items } => {
                    document = add_list(document, *ordered, items, depth + 1, font_name, body_size);
                }
                other => {
                    document = add_blocks(
                        document,
                        std::slice::from_ref(other),
                        depth + 1,
                        font_name,
                        body_size,
                    );
                }
            }
        }
    }
    document
}

fn render_table(rows: &[Vec<Vec<InlineSpan>>], font_name: &str, body_size: usize) -> Table {
    let column_count = rows.iter().map(Vec::len).max().unwrap_or(1).max(1);
    let column_width = CONTENT_WIDTH_DXA / column_count;
    let table_rows = rows
        .iter()
        .enumerate()
        .map(|(row_index, row)| {
            let cells = (0..column_count)
                .map(|column_index| {
                    let spans = row.get(column_index).cloned().unwrap_or_default();
                    let mut cell = TableCell::new()
                        .width(column_width, WidthType::Dxa)
                        .add_paragraph(paragraph_from_spans(
                            Paragraph::new().style("PlumBody"),
                            &spans,
                            font_name,
                            body_size,
                        ));
                    if row_index == 0 {
                        cell = cell.shading(Shading::new().fill("F2F2F2"));
                    }
                    cell
                })
                .collect();
            TableRow::new(cells).cant_split()
        })
        .collect();

    Table::new(table_rows)
        .width(CONTENT_WIDTH_DXA, WidthType::Dxa)
        .set_grid(vec![column_width; column_count])
        .layout(TableLayoutType::Fixed)
        .margins(TableCellMargins::new().margin(80, 120, 80, 120))
}

fn paragraph_from_spans(
    mut paragraph: Paragraph,
    spans: &[InlineSpan],
    font_name: &str,
    size: usize,
) -> Paragraph {
    for span in spans {
        let mut run = Run::new()
            .add_text(&span.text)
            .fonts(run_fonts(if span.code { "Consolas" } else { font_name }))
            .size(size);
        if span.bold {
            run = run.bold();
        }
        if span.italic {
            run = run.italic();
        }
        if span.strike {
            run = run.strike();
        }
        if span.code {
            run = run.shading(Shading::new().fill("F3F3F3"));
        }
        if let Some(link) = &span.link {
            run = run.color("1155CC").underline("single");
            paragraph =
                paragraph.add_hyperlink(Hyperlink::new(link, HyperlinkType::External).add_run(run));
        } else {
            paragraph = paragraph.add_run(run);
        }
    }
    paragraph
}

fn quote_spans(blocks: &[Block]) -> Vec<InlineSpan> {
    let mut spans = Vec::new();
    for block in blocks {
        match block {
            Block::Paragraph(content) | Block::Heading { content, .. } => {
                if !spans.is_empty() {
                    spans.push(InlineSpan {
                        text: "\n".to_string(),
                        ..Default::default()
                    });
                }
                spans.extend(content.clone());
            }
            _ => {}
        }
    }
    spans
}

fn run_fonts(name: &str) -> RunFonts {
    RunFonts::new()
        .ascii(name)
        .hi_ansi(name)
        .east_asia(name)
        .cs(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn genere_un_docx_reel() {
        let path =
            std::env::temp_dir().join(format!("plum3-export-docx-{}.docx", std::process::id()));
        let markdown = "# Titre H1\n\n## Titre H2\n\n### Titre H3\n\nParagraphe **gras**, *italique* et [lié](https://example.com).\n\n- Un\n- Deux\n\n1. Premier\n2. Deuxième\n\n> Citation accentuée : déjà vu.\n\n```rust\nfn main() { println!(\"Plum3 🌙\"); }\n```\n\n| Élément | Valeur |\n|---|---|\n| Unicode | café — 東京 ✨ |\n\n---";
        let source_before = markdown.as_bytes().to_vec();

        let style = ExportStyle {
            font_kind: ExportFontKind::Serif,
            font_size: 14.0,
            line_height: 1.6,
            text_color: "#302c34".to_string(),
        };
        write_docx(&path, markdown, &style).expect("export DOCX");
        let bytes = fs::read(&path).expect("lecture DOCX");

        assert!(bytes.starts_with(b"PK"));
        assert!(bytes.len() > 1_000);
        assert_eq!(markdown.as_bytes(), source_before);
        let _ = fs::remove_file(path);
    }
}
