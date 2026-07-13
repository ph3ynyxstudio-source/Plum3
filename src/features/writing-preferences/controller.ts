import type { ThemeName } from "../../theme/theme";
import { AppDialog } from "../../ui/app-dialog";
import {
  DEFAULT_WRITING_PREFERENCES,
  FONT_LIBRARY,
  WIDTH_OPTIONS,
  type DawnPalette,
  type NightPalette,
  type ReadingWidth,
  type WritingPreferences,
} from "./model";
import { WritingPreferencesStorage } from "./storage";

export class WritingPreferencesController {
  private readonly backdrop = this.requireElement<HTMLElement>("[data-writing-preferences-dialog]");
  private readonly fontSizeInput = this.requireElement<HTMLInputElement>("[data-writing-font-size]");
  private readonly lineHeightInput = this.requireElement<HTMLInputElement>("[data-writing-line-height]");
  private readonly fontSizeOutput = this.requireElement<HTMLOutputElement>("[data-font-size-output]");
  private readonly lineHeightOutput = this.requireElement<HTMLOutputElement>("[data-line-height-output]");
  private readonly selectedFontName = this.requireElement<HTMLElement>("[data-selected-font-name]");
  private readonly availableFonts = new Map<string, boolean>();
  private preferences = structuredClone(DEFAULT_WRITING_PREFERENCES);

  constructor(
    private readonly storage: WritingPreferencesStorage,
    private readonly dialog: AppDialog,
  ) {}

  initialize(): void {
    this.preferences = this.storage.load();
    FONT_LIBRARY.forEach((font) => this.availableFonts.set(font.id, this.isFontAvailable(font.name, font.genericFamily)));
    this.bindActions();
    this.applyAndRender(false);
  }

  private bindActions(): void {
    document.querySelectorAll<HTMLButtonElement>("[data-writing-preferences-open]").forEach((button) => {
      button.addEventListener("click", () => this.open());
    });
    document.querySelectorAll<HTMLButtonElement>("[data-writing-preferences-close]").forEach((button) => {
      button.addEventListener("click", () => this.close());
    });
    this.backdrop.addEventListener("click", (event) => {
      if (event.target === this.backdrop) this.close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.backdrop.hidden) this.close();
    });
    document.addEventListener("plum3:theme-change", () => this.applyAndRender(false));

    const quickToggle = document.querySelector<HTMLButtonElement>("[data-quick-writing-toggle]");
    const quickMenu = document.querySelector<HTMLElement>("[data-quick-writing-menu]");
    quickToggle?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!quickMenu) return;
      quickMenu.hidden = !quickMenu.hidden;
      quickToggle.setAttribute("aria-expanded", String(!quickMenu.hidden));
    });
    document.addEventListener("click", (event) => {
      if (!quickMenu || quickMenu.hidden || (event.target as Element).closest(".quick-writing-preferences")) return;
      quickMenu.hidden = true;
      quickToggle?.setAttribute("aria-expanded", "false");
    });
    document.querySelector<HTMLSelectElement>("[data-quick-writing-font]")?.addEventListener("change", (event) => {
      this.preferences.fontId = (event.currentTarget as HTMLSelectElement).value;
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-quick-font-decrease]")?.addEventListener("click", () => {
      this.preferences.fontSize = Math.max(14, this.preferences.fontSize - 1);
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-quick-font-increase]")?.addEventListener("click", () => {
      this.preferences.fontSize = Math.min(28, this.preferences.fontSize + 1);
      this.applyAndRender();
    });
    document.querySelector<HTMLSelectElement>("[data-quick-line-height]")?.addEventListener("change", (event) => {
      this.preferences.lineHeight = Number((event.currentTarget as HTMLSelectElement).value);
      this.applyAndRender();
    });
    document.querySelectorAll<HTMLButtonElement>("[data-quick-writing-width]").forEach((button) => button.addEventListener("click", () => {
      this.preferences.readingWidth = button.dataset.quickWritingWidth as ReadingWidth;
      this.applyAndRender();
    }));

    document.querySelectorAll<HTMLButtonElement>("[data-writing-font]").forEach((button) => {
      button.addEventListener("click", () => {
        if (FONT_LIBRARY.some((font) => font.id === button.dataset.writingFont)) {
          this.preferences.fontId = button.dataset.writingFont!;
          this.applyAndRender();
        }
      });
    });
    this.fontSizeInput.addEventListener("input", () => {
      this.preferences.fontSize = Number(this.fontSizeInput.value);
      this.applyAndRender();
    });
    this.lineHeightInput.addEventListener("input", () => {
      this.preferences.lineHeight = Number(this.lineHeightInput.value);
      this.applyAndRender();
    });
    document.querySelectorAll<HTMLButtonElement>("[data-writing-width]").forEach((button) => {
      button.addEventListener("click", () => {
        this.preferences.readingWidth = button.dataset.writingWidth as ReadingWidth;
        this.applyAndRender();
      });
    });
    document.querySelectorAll<HTMLButtonElement>("[data-writing-palette]").forEach((button) => {
      button.addEventListener("click", () => {
        const theme = button.dataset.paletteTheme as ThemeName;
        if (theme === "nuit") this.preferences.palettes.nuit = button.dataset.writingPalette as NightPalette;
        if (theme === "aube") this.preferences.palettes.aube = button.dataset.writingPalette as DawnPalette;
        this.applyAndRender();
      });
    });
    this.requireElement<HTMLButtonElement>("[data-writing-preferences-reset]").addEventListener("click", () => {
      void this.reset();
    });
  }

  private open(): void {
    this.backdrop.hidden = false;
    queueMicrotask(() => this.backdrop.querySelector<HTMLButtonElement>("[data-writing-font].is-selected")?.focus());
  }

  private close(): void {
    this.backdrop.hidden = true;
  }

  private async reset(): Promise<void> {
    const action = await this.dialog.show({
      title: "Réinitialiser les réglages d’écriture ?",
      message: "La typographie, la taille, l’interligne, la largeur et les couleurs de lecture retrouveront leurs valeurs par défaut.",
      actions: [
        { id: "cancel", label: "Annuler" },
        { id: "reset", label: "Réinitialiser", tone: "danger" },
      ],
    });
    if (action !== "reset") return;
    this.preferences = this.storage.reset();
    this.applyAndRender(false);
  }

  private applyAndRender(persist = true): void {
    const font = FONT_LIBRARY.find((candidate) => candidate.id === this.preferences.fontId) ?? FONT_LIBRARY[0];
    const width = WIDTH_OPTIONS.find((candidate) => candidate.id === this.preferences.readingWidth) ?? WIDTH_OPTIONS[1];
    const theme = (document.documentElement.dataset.theme ?? "nuit") as ThemeName;
    const palette = this.preferences.palettes[theme];
    const root = document.documentElement.style;
    const isAvailable = this.availableFonts.get(font.id) ?? false;
    const appliedFamily = isAvailable ? font.family : font.fallbackFamily;
    root.setProperty("--writing-font-family", appliedFamily);
    root.setProperty("--writing-font-size", `${this.preferences.fontSize}px`);
    root.setProperty("--writing-line-height", String(this.preferences.lineHeight));
    root.setProperty("--writing-reading-width", width.value);
    root.setProperty("--writing-text-color", `var(--color-reading-${palette})`);

    if (persist) this.storage.save(this.preferences);
    this.fontSizeInput.value = String(this.preferences.fontSize);
    this.lineHeightInput.value = String(this.preferences.lineHeight);
    this.fontSizeOutput.value = `${this.preferences.fontSize} px`;
    this.lineHeightOutput.value = this.preferences.lineHeight.toLocaleString("fr-CA", { minimumFractionDigits: 1 });
    this.selectedFontName.textContent = isAvailable ? font.name : `${font.name} · repli ${font.fallbackName}`;
    const quickFont = document.querySelector<HTMLSelectElement>("[data-quick-writing-font]");
    if (quickFont) quickFont.value = font.id;
    const quickStatus = document.querySelector<HTMLElement>("[data-quick-font-status]");
    if (quickStatus) quickStatus.textContent = isAvailable ? "Disponible" : `Repli : ${font.fallbackName}`;
    const quickSize = document.querySelector<HTMLOutputElement>("[data-quick-font-size]");
    if (quickSize) quickSize.value = `${this.preferences.fontSize} px`;
    const quickLineHeight = document.querySelector<HTMLSelectElement>("[data-quick-line-height]");
    if (quickLineHeight) quickLineHeight.value = String(this.preferences.lineHeight);
    document.querySelector<HTMLButtonElement>("[data-quick-font-decrease]")!.disabled = this.preferences.fontSize <= 14;
    document.querySelector<HTMLButtonElement>("[data-quick-font-increase]")!.disabled = this.preferences.fontSize >= 28;
    document.querySelectorAll<HTMLButtonElement>("[data-quick-writing-width]").forEach((button) => {
      const selected = button.dataset.quickWritingWidth === width.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll<HTMLButtonElement>("[data-writing-font]").forEach((button) => {
      const selected = button.dataset.writingFont === font.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      const candidate = FONT_LIBRARY.find((item) => item.id === button.dataset.writingFont);
      if (!candidate) return;
      const candidateAvailable = this.availableFonts.get(candidate.id) ?? false;
      button.style.fontFamily = candidateAvailable ? candidate.family : candidate.fallbackFamily;
      button.classList.toggle("uses-fallback", !candidateAvailable);
      const availability = button.querySelector<HTMLElement>("[data-font-availability]");
      if (availability) availability.textContent = candidateAvailable ? "Disponible" : `Repli : ${candidate.fallbackName}`;
      button.setAttribute("aria-label", candidateAvailable ? `${candidate.name}, disponible` : `${candidate.name}, indisponible, repli ${candidate.fallbackName}`);
    });
    document.querySelectorAll<HTMLButtonElement>("[data-writing-width]").forEach((button) => {
      const selected = button.dataset.writingWidth === width.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll<HTMLElement>("[data-palette-group]").forEach((group) => {
      group.hidden = group.dataset.paletteGroup !== theme;
    });
    document.querySelectorAll<HTMLButtonElement>("[data-writing-palette]").forEach((button) => {
      const selected = button.dataset.paletteTheme === theme && button.dataset.writingPalette === palette;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const fontSummary = isAvailable ? font.name : `${font.name} (repli ${font.fallbackName})`;
    const summary = `${fontSummary} · ${this.preferences.fontSize} px · interligne ${this.preferences.lineHeight.toLocaleString("fr-CA")}`;
    document.querySelectorAll<HTMLElement>("[data-writing-preferences-summary]").forEach((element) => {
      element.textContent = summary;
    });
  }

  private isFontAvailable(name: string, genericFamily: "serif" | "sans-serif" | "monospace"): boolean {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return false;
    const samples = ["mmmmmmmmmmlliWW", "Plum3 de Nyx 012345", "Écrire avec grâce"];
    return samples.some((sample) => {
      context.font = `72px ${genericFamily}`;
      const fallbackWidth = context.measureText(sample).width;
      context.font = `72px "${name}", ${genericFamily}`;
      return Math.abs(context.measureText(sample).width - fallbackWidth) > 0.1;
    });
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de réglage d’écriture introuvable : ${selector}`);
    return element;
  }
}
