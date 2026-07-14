import type { DocumentStore } from "../../documents/document-state";
import { renderMarkdownPreview } from "./markdown-preview";
import type { DisplayPreferenceName, DisplayPreferences } from "./model";
import { DisplayPreferencesStorage } from "./storage";
import { subscribeLocale } from "../../i18n/i18n";

const COUNT_SELECTORS: Record<Exclude<DisplayPreferenceName, "markdownPreview">, string> = {
  wordCount: "[data-word-count]",
  characterCount: "[data-character-count]",
  lineCount: "[data-line-count]",
};

export class DisplayPreferencesController {
  private readonly editor = this.requireElement<HTMLTextAreaElement>("[data-document-editor]");
  private readonly preview = this.requireElement<HTMLElement>("[data-markdown-preview]");
  private preferences: DisplayPreferences;

  constructor(
    private readonly storage: DisplayPreferencesStorage,
    private readonly documentStore: DocumentStore,
  ) {
    this.preferences = this.storage.load();
  }

  initialize(): void {
    document.querySelectorAll<HTMLButtonElement>("[data-display-setting]").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const setting = toggle.dataset.displaySetting as DisplayPreferenceName;
        this.preferences[setting] = !this.preferences[setting];
        this.storage.save(this.preferences);
        this.apply();
      });
    });
    this.documentStore.subscribe((state) => {
      if (this.preferences.markdownPreview) renderMarkdownPreview(this.preview, state.content);
    });
    subscribeLocale(() => this.apply());
    this.apply();
  }

  private apply(): void {
    Object.entries(COUNT_SELECTORS).forEach(([setting, selector]) => {
      this.requireElement<HTMLElement>(selector).hidden = !this.preferences[setting as keyof typeof COUNT_SELECTORS];
    });

    document.querySelectorAll<HTMLButtonElement>("[data-display-setting]").forEach((toggle) => {
      const setting = toggle.dataset.displaySetting as DisplayPreferenceName;
      const enabled = this.preferences[setting];
      toggle.classList.toggle("is-on", enabled);
      toggle.setAttribute("aria-checked", String(enabled));
    });

    this.editor.hidden = this.preferences.markdownPreview;
    this.preview.hidden = !this.preferences.markdownPreview;
    if (this.preferences.markdownPreview) {
      renderMarkdownPreview(this.preview, this.documentStore.current.content);
    } else {
      this.editor.focus();
    }
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément d’affichage introuvable : ${selector}`);
    return element;
  }
}
