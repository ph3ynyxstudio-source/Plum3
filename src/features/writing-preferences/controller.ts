import type { ThemeName } from "../../theme/theme";
import { AppDialog } from "../../ui/app-dialog";
import {
  DEFAULT_WRITING_PREFERENCES,
  FONT_LIBRARY,
  WIDTH_OPTIONS,
  type DawnPalette,
  type NightPalette,
  type WritingPreferences,
} from "./model";
import { WritingPreferencesStorage } from "./storage";

export class WritingPreferencesController {
  private readonly panelFontSelect = this.requireElement<HTMLSelectElement>("[data-panel-writing-font]");
  private readonly panelFontStatus = this.requireElement<HTMLElement>("[data-panel-font-status]");
  private readonly panelFontSizeInput = this.requireElement<HTMLInputElement>("[data-panel-writing-font-size]");
  private readonly panelLineHeightInput = this.requireElement<HTMLInputElement>("[data-panel-writing-line-height]");
  private readonly panelWidthInput = this.requireElement<HTMLInputElement>("[data-panel-writing-width-range]");
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
    document.addEventListener("plum3:theme-change", () => this.applyAndRender(false));

    this.panelFontSelect.addEventListener("change", () => {
      this.preferences.fontId = this.panelFontSelect.value;
      this.applyAndRender();
    });

    this.panelFontSizeInput.addEventListener("input", () => {
      this.preferences.fontSize = Number(this.panelFontSizeInput.value);
      this.applyAndRender();
    });
    this.panelLineHeightInput.addEventListener("input", () => {
      this.preferences.lineHeight = Number(this.panelLineHeightInput.value);
      this.applyAndRender();
    });
    this.panelWidthInput.addEventListener("input", () => {
      this.preferences.readingWidth = WIDTH_OPTIONS[Number(this.panelWidthInput.value)]?.id ?? "medium";
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-panel-font-decrease]")?.addEventListener("click", () => {
      this.preferences.fontSize = Math.max(14, this.preferences.fontSize - 1);
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-panel-font-increase]")?.addEventListener("click", () => {
      this.preferences.fontSize = Math.min(28, this.preferences.fontSize + 1);
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-panel-line-height-decrease]")?.addEventListener("click", () => {
      this.preferences.lineHeight = Math.max(1.4, Math.round((this.preferences.lineHeight - 0.1) * 10) / 10);
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-panel-line-height-increase]")?.addEventListener("click", () => {
      this.preferences.lineHeight = Math.min(2, Math.round((this.preferences.lineHeight + 0.1) * 10) / 10);
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-panel-width-decrease]")?.addEventListener("click", () => {
      const index = Math.max(0, WIDTH_OPTIONS.findIndex((option) => option.id === this.preferences.readingWidth) - 1);
      this.preferences.readingWidth = WIDTH_OPTIONS[index].id;
      this.applyAndRender();
    });
    document.querySelector<HTMLButtonElement>("[data-panel-width-increase]")?.addEventListener("click", () => {
      const currentIndex = WIDTH_OPTIONS.findIndex((option) => option.id === this.preferences.readingWidth);
      this.preferences.readingWidth = WIDTH_OPTIONS[Math.min(WIDTH_OPTIONS.length - 1, currentIndex + 1)].id;
      this.applyAndRender();
    });

    document.querySelectorAll<HTMLButtonElement>("[data-panel-writing-palette]").forEach((button) => {
      button.addEventListener("click", () => {
        const theme = button.dataset.panelPaletteTheme as ThemeName;
        if (theme === "nuit") this.preferences.palettes.nuit = button.dataset.panelWritingPalette as NightPalette;
        if (theme === "aube") this.preferences.palettes.aube = button.dataset.panelWritingPalette as DawnPalette;
        this.applyAndRender();
      });
    });
    this.requireElement<HTMLButtonElement>("[data-panel-writing-reset]").addEventListener("click", () => {
      void this.reset();
    });
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

    const widthIndex = Math.max(0, WIDTH_OPTIONS.findIndex((option) => option.id === width.id));
    this.panelFontSelect.value = font.id;
    this.panelFontSelect.style.fontFamily = appliedFamily;
    this.panelFontStatus.textContent = isAvailable ? "Police disponible" : `Police de repli : ${font.fallbackName}`;
    this.panelFontSizeInput.value = String(this.preferences.fontSize);
    this.panelFontSizeInput.style.setProperty("--range-progress", `${((this.preferences.fontSize - 14) / 14) * 100}%`);
    this.panelLineHeightInput.value = String(this.preferences.lineHeight);
    this.panelLineHeightInput.style.setProperty("--range-progress", `${((this.preferences.lineHeight - 1.4) / 0.6) * 100}%`);
    this.panelWidthInput.value = String(widthIndex);
    this.panelWidthInput.style.setProperty("--range-progress", `${(widthIndex / (WIDTH_OPTIONS.length - 1)) * 100}%`);
    this.requireElement<HTMLOutputElement>("[data-panel-font-size]").value = `${this.preferences.fontSize} px`;
    this.requireElement<HTMLOutputElement>("[data-panel-line-height]").value = this.preferences.lineHeight.toLocaleString("fr-CA", { minimumFractionDigits: 1 });
    this.requireElement<HTMLOutputElement>("[data-panel-writing-width]").value = width.value.replace("px", " px");
    this.requireElement<HTMLButtonElement>("[data-panel-font-decrease]").disabled = this.preferences.fontSize <= 14;
    this.requireElement<HTMLButtonElement>("[data-panel-font-increase]").disabled = this.preferences.fontSize >= 28;
    this.requireElement<HTMLButtonElement>("[data-panel-line-height-decrease]").disabled = this.preferences.lineHeight <= 1.4;
    this.requireElement<HTMLButtonElement>("[data-panel-line-height-increase]").disabled = this.preferences.lineHeight >= 2;
    this.requireElement<HTMLButtonElement>("[data-panel-width-decrease]").disabled = widthIndex === 0;
    this.requireElement<HTMLButtonElement>("[data-panel-width-increase]").disabled = widthIndex === WIDTH_OPTIONS.length - 1;

    document.querySelectorAll<HTMLElement>("[data-panel-palette-group]").forEach((group) => {
      group.hidden = group.dataset.panelPaletteGroup !== theme;
    });
    document.querySelectorAll<HTMLButtonElement>("[data-panel-writing-palette]").forEach((button) => {
      const selected = button.dataset.panelPaletteTheme === theme && button.dataset.panelWritingPalette === palette;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
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
