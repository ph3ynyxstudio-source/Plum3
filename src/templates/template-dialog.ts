import { NARRATIVE_GENRES, WRITING_TEMPLATES, type WritingTemplate } from "./writing-templates";

export interface TemplateSelection {
  template: WritingTemplate;
  genre: string;
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
    document.querySelectorAll<HTMLButtonElement>("[data-template-cancel]").forEach((button) => {
      button.addEventListener("click", () => this.finish(null));
    });
    this.createButton.addEventListener("click", () => {
      if (this.selected) this.finish({ template: this.selected, genre: this.genre.value });
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
    const categories = [...new Set(WRITING_TEMPLATES.map((template) => template.category))];
    categories.forEach((category) => {
      const group = document.createElement("section");
      group.className = "template-group";
      const heading = document.createElement("h3");
      heading.textContent = category;
      const grid = document.createElement("div");
      grid.className = "template-grid";
      WRITING_TEMPLATES.filter((template) => template.category === category).forEach((template) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "template-option";
        button.dataset.templateId = template.id;
        button.innerHTML = `<span aria-hidden="true">${template.symbol}</span><strong>${template.name}</strong>`;
        button.addEventListener("click", () => this.select(template.id));
        button.addEventListener("dblclick", () => this.finish({ template, genre: this.genre.value }));
        grid.append(button);
      });
      group.append(heading, grid);
      this.list.append(group);
    });
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
  return ['<option value="">Aucun genre</option>', ...NARRATIVE_GENRES.map((genre) => `<option value="${genre}">${genre}</option>`)].join("");
}
