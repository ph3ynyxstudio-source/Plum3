function appendInlineFormatting(parent: HTMLElement, text: string): void {
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/gu;
  let cursor = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parent.append(document.createTextNode(text.slice(cursor, index)));

    const token = match[0];
    const element = token.startsWith("`")
      ? document.createElement("code")
      : token.startsWith("**")
        ? document.createElement("strong")
        : token.startsWith("~~")
          ? document.createElement("del")
          : document.createElement("em");
    const delimiterLength = token.startsWith("**") || token.startsWith("~~") ? 2 : 1;
    element.textContent = token.slice(delimiterLength, -delimiterLength);
    parent.append(element);
    cursor = index + token.length;
  }

  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function appendTextElement(container: HTMLElement, tagName: keyof HTMLElementTagNameMap, text: string): void {
  const element = document.createElement(tagName);
  appendInlineFormatting(element, text);
  container.append(element);
}

export function renderMarkdownPreview(container: HTMLElement, markdown: string): void {
  container.replaceChildren();
  if (!markdown.trim()) {
    const empty = document.createElement("p");
    empty.className = "markdown-preview-empty";
    empty.textContent = t("editor.previewEmpty");
    container.append(empty);
    return;
  }

  const lines = markdown.split(/\r\n|\r|\n/u);
  let paragraph: string[] = [];
  let codeLines: string[] | null = null;
  let list: HTMLUListElement | HTMLOListElement | null = null;

  const flushParagraph = (): void => {
    if (!paragraph.length) return;
    appendTextElement(container, "p", paragraph.join(" "));
    paragraph = [];
  };
  const closeList = (): void => {
    list = null;
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      flushParagraph();
      closeList();
      if (codeLines) {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = codeLines.join("\n");
        pre.append(code);
        container.append(pre);
        codeLines = null;
      } else {
        codeLines = [];
      }
      continue;
    }
    if (codeLines) {
      codeLines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
    if (heading) {
      flushParagraph();
      closeList();
      appendTextElement(container, `h${heading[1].length}` as keyof HTMLElementTagNameMap, heading[2]);
      continue;
    }
    if (/^\s*(---+|___+|\*\*\*+)\s*$/u.test(line)) {
      flushParagraph();
      closeList();
      container.append(document.createElement("hr"));
      continue;
    }
    const quote = /^>\s?(.*)$/u.exec(line);
    if (quote) {
      flushParagraph();
      closeList();
      appendTextElement(container, "blockquote", quote[1]);
      continue;
    }
    const unorderedItem = /^\s*[-*+]\s+(.+)$/u.exec(line);
    const orderedItem = /^\s*\d+\.\s+(.+)$/u.exec(line);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const expectedTag = unorderedItem ? "UL" : "OL";
      if (!list || list.tagName !== expectedTag) {
        list = document.createElement(unorderedItem ? "ul" : "ol");
        container.append(list);
      }
      const item = document.createElement("li");
      appendInlineFormatting(item, (unorderedItem ?? orderedItem)![1]);
      list.append(item);
      continue;
    }

    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  if (codeLines) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = codeLines.join("\n");
    pre.append(code);
    container.append(pre);
  }
}
import { t } from "../../i18n/i18n";
