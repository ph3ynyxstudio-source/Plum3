import { NARRATIVE_GENRES, WRITING_TEMPLATES, type NarrativeGenreId, type WritingTemplate } from "./writing-templates";
import { getLocale, subscribeLocale, t } from "../i18n/i18n";

export interface TemplateSelection {
  template: WritingTemplate;
  genre: NarrativeGenreId | "";
}

export class TemplateDialog {
  private readonly backdrop = this.requireElement<HTMLElement>("[data-template-dialog]");
  private readonly list = this.requireElement<HTMLElement>("[data-template-list]");
  private readonly genreField = this.requireElement<HTMLElement>("[data-template-genre-field]");
  private readonly genre = this.requireElement<HTMLSelectElement>("[data-template-genre]");
  private readonly createButton = this.requireElement<HTMLButtonElement>("[data-template-create]");
  private selected: WritingTemplate | null = null;
  private resolveSelection: ((selection: TemplateSelection | null) => void) | null = null;

  constructor() {
    this.renderTemplates();
    subscribeLocale(() => this.renderTemplates());
    document.querySelectorAll<HTMLButtonElement>("[data-template-cancel]").forEach((button) => {
      button.addEventListener("click", () => this.finish(null));
    });
    this.createButton.addEventListener("click", () => {
      if (this.selected) this.finish({ template: this.selected, genre: this.genre.value as NarrativeGenreId | "" });
    });
    this.backdrop.addEventListener("click", (event) => {
      if (event.target === this.backdrop) this.finish(null);
    });
  }

  show(initialTemplateId?: string): Promise<TemplateSelection | null> {
    if (this.resolveSelection) return Promise.resolve(null);
    this.select(initialTemplateId ?? "blank");
    this.backdrop.hidden = false;
    document.addEventListener("keydown", this.onKeyDown);
    return new Promise((resolve) => {
      this.resolveSelection = resolve;
      queueMicrotask(() => this.list.querySelector<HTMLButtonElement>(".is-selected")?.focus());
    });
  }

  private renderTemplates(): void {
    this.list.replaceChildren();
    this.genre.innerHTML = renderGenreOptions();
    const categories = [...new Set(WRITING_TEMPLATES.map((template) => template.category))];
    categories.forEach((category) => {
      const group = document.createElement("section");
      group.className = "template-group";
      const heading = document.createElement("h3");
      heading.textContent = t(this.categoryKey(category));
      const grid = document.createElement("div");
      grid.className = "template-grid";
      WRITING_TEMPLATES.filter((template) => template.category === category).forEach((template) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "template-option";
        button.dataset.templateId = template.id;
        const symbol = document.createElement("span");
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = template.symbol;
        const name = document.createElement("strong");
        name.textContent = t(`templates.${template.id}.name`);
        button.append(symbol, name);
        button.addEventListener("click", () => this.select(template.id));
        button.addEventListener("dblclick", () => this.finish({ template, genre: this.genre.value as NarrativeGenreId | "" }));
        grid.append(button);
      });
      group.append(heading, grid);
      this.list.append(group);
    });
  }

  private categoryKey(category: string): string {
    const keys: Record<string, string> = {
      "Général": "templates.category.general",
      "Écriture narrative": "templates.category.narrative",
      "Composition": "templates.category.composition",
      "Publication": "templates.category.publication",
      "Univers et worldbuilding": "templates.category.worldbuilding",
    };
    return keys[category] ?? category;
  }

  private select(templateId: string): void {
    this.selected = WRITING_TEMPLATES.find((template) => template.id === templateId) ?? WRITING_TEMPLATES[0];
    this.list.querySelectorAll<HTMLButtonElement>("[data-template-id]").forEach((button) => {
      const selected = button.dataset.templateId === this.selected?.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    this.genreField.hidden = !this.selected.narrative;
    this.genre.value = "";
    this.createButton.disabled = false;
  }

  private finish(selection: TemplateSelection | null): void {
    if (!this.resolveSelection) return;
    const resolve = this.resolveSelection;
    this.resolveSelection = null;
    this.backdrop.hidden = true;
    document.removeEventListener("keydown", this.onKeyDown);
    resolve(selection);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.finish(null);
  };

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de modèle introuvable : ${selector}`);
    return element;
  }
}

export function renderGenreOptions(): string {
  const locale = getLocale();
  return [`<option value="">${t("templates.noGenre")}</option>`, ...NARRATIVE_GENRES.map((genre) => `<option value="${genre.id}">${genre.label[locale]}</option>`)].join("");
}
