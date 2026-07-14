use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InlineSpan {
    pub text: String,
    pub bold: bool,
    pub italic: bool,
    pub strike: bool,
    pub code: bool,
    pub link: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Block {
    Heading {
        level: u8,
        content: Vec<InlineSpan>,
    },
    Paragraph(Vec<InlineSpan>),
    Quote(Vec<Block>),
    List {
        ordered: bool,
        items: Vec<Vec<Block>>,
    },
    Table {
        rows: Vec<Vec<Vec<InlineSpan>>>,
    },
    Rule,
    Code(String),
}

#[derive(Clone, Default)]
struct InlineStyle {
    bold: bool,
    italic: bool,
    strike: bool,
    code: bool,
    link: Option<String>,
}

pub fn parse_markdown(markdown: &str) -> Vec<Block> {
    let options =
        Options::ENABLE_TABLES | Options::ENABLE_STRIKETHROUGH | Options::ENABLE_TASKLISTS;
    let events: Vec<_> = Parser::new_ext(markdown, options).collect();
    let mut index = 0;
    parse_blocks(&events, &mut index, None)
}

fn parse_blocks(events: &[Event<'_>], index: &mut usize, end: Option<TagEnd>) -> Vec<Block> {
    let mut blocks = Vec::new();
    while *index < events.len() {
        let event = events[*index].clone();
        *index += 1;
        match event {
            Event::End(tag_end) if Some(tag_end) == end => break,
            Event::Start(Tag::Paragraph) => blocks.push(Block::Paragraph(parse_inlines(
                events,
                index,
                TagEnd::Paragraph,
                InlineStyle::default(),
            ))),
            Event::Start(Tag::Heading { level, .. }) => blocks.push(Block::Heading {
                level: heading_level(level),
                content: parse_inlines(
                    events,
                    index,
                    TagEnd::Heading(level),
                    InlineStyle::default(),
                ),
            }),
            Event::Start(Tag::BlockQuote(kind)) => blocks.push(Block::Quote(parse_blocks(
                events,
                index,
                Some(TagEnd::BlockQuote(kind)),
            ))),
            Event::Start(Tag::List(start)) => {
                blocks.push(parse_list(events, index, start.is_some()))
            }
            Event::Start(Tag::Table(_)) => blocks.push(parse_table(events, index)),
            Event::Start(Tag::CodeBlock(_)) => blocks.push(Block::Code(parse_code(events, index))),
            Event::Start(tag) => {
                let nested = parse_blocks(events, index, Some(tag.to_end()));
                blocks.extend(nested);
            }
            Event::Rule => blocks.push(Block::Rule),
            Event::Text(text) if !text.trim().is_empty() => {
                blocks.push(Block::Paragraph(vec![InlineSpan {
                    text: text.into_string(),
                    ..Default::default()
                }]))
            }
            _ => {}
        }
    }
    blocks
}

fn parse_list(events: &[Event<'_>], index: &mut usize, ordered: bool) -> Block {
    let mut items = Vec::new();
    while *index < events.len() {
        let event = events[*index].clone();
        *index += 1;
        match event {
            Event::Start(Tag::Item) => {
                items.push(parse_blocks(events, index, Some(TagEnd::Item)));
            }
            Event::End(TagEnd::List(_)) => break,
            _ => {}
        }
    }
    Block::List { ordered, items }
}

fn parse_table(events: &[Event<'_>], index: &mut usize) -> Block {
    let mut rows = Vec::new();
    while *index < events.len() {
        let event = events[*index].clone();
        *index += 1;
        match event {
            Event::Start(Tag::TableHead) => {
                rows.push(parse_table_cells(events, index, TagEnd::TableHead));
            }
            Event::Start(Tag::TableRow) => {
                rows.push(parse_table_cells(events, index, TagEnd::TableRow));
            }
            Event::End(TagEnd::Table) => break,
            _ => {}
        }
    }
    Block::Table { rows }
}

fn parse_table_cells(events: &[Event<'_>], index: &mut usize, end: TagEnd) -> Vec<Vec<InlineSpan>> {
    let mut cells = Vec::new();
    while *index < events.len() {
        let event = events[*index].clone();
        *index += 1;
        match event {
            Event::Start(Tag::TableCell) => cells.push(parse_inlines(
                events,
                index,
                TagEnd::TableCell,
                InlineStyle::default(),
            )),
            Event::End(tag_end) if tag_end == end => break,
            _ => {}
        }
    }
    cells
}

fn parse_code(events: &[Event<'_>], index: &mut usize) -> String {
    let mut code = String::new();
    while *index < events.len() {
        let event = events[*index].clone();
        *index += 1;
        match event {
            Event::End(TagEnd::CodeBlock) => break,
            Event::Text(text) | Event::Code(text) => code.push_str(&text),
            Event::SoftBreak | Event::HardBreak => code.push('\n'),
            _ => {}
        }
    }
    code
}

fn parse_inlines(
    events: &[Event<'_>],
    index: &mut usize,
    end: TagEnd,
    style: InlineStyle,
) -> Vec<InlineSpan> {
    let mut spans = Vec::new();
    while *index < events.len() {
        let event = events[*index].clone();
        *index += 1;
        match event {
            Event::End(tag_end) if tag_end == end => break,
            Event::Start(Tag::Strong) => {
                let mut nested = style.clone();
                nested.bold = true;
                spans.extend(parse_inlines(events, index, TagEnd::Strong, nested));
            }
            Event::Start(Tag::Emphasis) => {
                let mut nested = style.clone();
                nested.italic = true;
                spans.extend(parse_inlines(events, index, TagEnd::Emphasis, nested));
            }
            Event::Start(Tag::Strikethrough) => {
                let mut nested = style.clone();
                nested.strike = true;
                spans.extend(parse_inlines(events, index, TagEnd::Strikethrough, nested));
            }
            Event::Start(Tag::Link { dest_url, .. }) => {
                let mut nested = style.clone();
                nested.link = Some(dest_url.into_string());
                spans.extend(parse_inlines(events, index, TagEnd::Link, nested));
            }
            Event::Start(Tag::Image { dest_url, .. }) => {
                let mut nested = style.clone();
                nested.link = Some(dest_url.into_string());
                spans.extend(parse_inlines(events, index, TagEnd::Image, nested));
            }
            Event::Text(text) => push_span(&mut spans, &style, text.into_string()),
            Event::Code(text) => {
                let mut nested = style.clone();
                nested.code = true;
                push_span(&mut spans, &nested, text.into_string());
            }
            Event::SoftBreak => push_span(&mut spans, &style, " ".to_string()),
            Event::HardBreak => push_span(&mut spans, &style, "\n".to_string()),
            Event::TaskListMarker(checked) => push_span(
                &mut spans,
                &style,
                if checked { "[x] " } else { "[ ] " }.to_string(),
            ),
            Event::Html(_) | Event::InlineHtml(_) => {}
            Event::Start(tag) => {
                spans.extend(parse_inlines(events, index, tag.to_end(), style.clone()));
            }
            _ => {}
        }
    }
    spans
}

fn push_span(spans: &mut Vec<InlineSpan>, style: &InlineStyle, text: String) {
    if text.is_empty() {
        return;
    }
    spans.push(InlineSpan {
        text,
        bold: style.bold,
        italic: style.italic,
        strike: style.strike,
        code: style.code,
        link: style.link.clone(),
    });
}

fn heading_level(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conserve_structure_et_mise_en_forme() {
        let blocks = parse_markdown(
            "# Titre\n\nTexte **gras** et *italique*.\n\n- un\n- deux\n\n| A | B |\n|---|---|\n| 1 | 2 |",
        );
        assert!(matches!(blocks[0], Block::Heading { level: 1, .. }));
        assert!(matches!(blocks[1], Block::Paragraph(_)));
        assert!(matches!(blocks[2], Block::List { ordered: false, .. }));
        assert!(matches!(blocks[3], Block::Table { .. }));
        let Block::Paragraph(spans) = &blocks[1] else {
            unreachable!();
        };
        assert!(spans.iter().any(|span| span.bold && span.text == "gras"));
        assert!(spans
            .iter()
            .any(|span| span.italic && span.text == "italique"));
    }

    #[test]
    fn conserve_tous_les_blocs_attendus_par_les_exports() {
        let blocks = parse_markdown(
            "# H1\n\n## H2\n\n### H3\n\nTexte **gras**, *italique* et [lien](https://example.com).\n\n- puce\n\n1. numéro\n\n> citation\n\n```txt\ncode 🌙\n```\n\n---\n\n| A | B |\n|---|---|\n| é | 東京 |",
        );
        assert!(blocks
            .iter()
            .any(|block| matches!(block, Block::Heading { level: 1, .. })));
        assert!(blocks
            .iter()
            .any(|block| matches!(block, Block::Heading { level: 2, .. })));
        assert!(blocks
            .iter()
            .any(|block| matches!(block, Block::Heading { level: 3, .. })));
        assert!(blocks
            .iter()
            .any(|block| matches!(block, Block::List { ordered: false, .. })));
        assert!(blocks
            .iter()
            .any(|block| matches!(block, Block::List { ordered: true, .. })));
        assert!(blocks.iter().any(|block| matches!(block, Block::Quote(_))));
        assert!(blocks.iter().any(|block| matches!(block, Block::Code(_))));
        assert!(blocks.iter().any(|block| matches!(block, Block::Rule)));
        assert!(blocks
            .iter()
            .any(|block| matches!(block, Block::Table { .. })));
        assert!(blocks.iter().any(|block| match block {
            Block::Paragraph(spans) => spans
                .iter()
                .any(|span| span.link.as_deref() == Some("https://example.com")),
            _ => false,
        }));
    }
}
