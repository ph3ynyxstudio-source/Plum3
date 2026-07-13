import type { ThemeName } from "../../theme/theme";

export type FontCategory = "Narration" | "Manuscrit" | "Documentation" | "Développement" | "Composition";
export type ReadingWidth = "narrow" | "medium" | "wide" | "very-wide";
export type NightPalette = "classic" | "ivory" | "light-blue" | "soft-gray";
export type DawnPalette = "anthracite" | "dark-gray" | "dark-brown";

export interface FontOption {
  id: string;
  name: string;
  category: FontCategory;
  family: string;
  fallbackName: string;
  fallbackFamily: string;
  genericFamily: "serif" | "sans-serif" | "monospace";
}

export interface WritingPreferences {
  fontId: string;
  fontSize: number;
  lineHeight: number;
  readingWidth: ReadingWidth;
  palettes: {
    nuit: NightPalette;
    aube: DawnPalette;
  };
}

export interface PaletteOption {
  id: NightPalette | DawnPalette;
  name: string;
}

export const FONT_LIBRARY: FontOption[] = [
  { id: "literata", name: "Literata", category: "Narration", family: 'Literata, Georgia, serif', fallbackName: "Georgia", fallbackFamily: "Georgia, serif", genericFamily: "serif" },
  { id: "lora", name: "Lora", category: "Narration", family: 'Lora, Cambria, serif', fallbackName: "Cambria", fallbackFamily: "Cambria, serif", genericFamily: "serif" },
  { id: "merriweather", name: "Merriweather", category: "Narration", family: 'Merriweather, Constantia, serif', fallbackName: "Constantia", fallbackFamily: "Constantia, serif", genericFamily: "serif" },
  { id: "source-serif-4", name: "Source Serif 4", category: "Manuscrit", family: '"Source Serif 4", Cambria, serif', fallbackName: "Cambria", fallbackFamily: "Cambria, serif", genericFamily: "serif" },
  { id: "eb-garamond", name: "EB Garamond", category: "Manuscrit", family: '"EB Garamond", "Palatino Linotype", serif', fallbackName: "Palatino Linotype", fallbackFamily: '"Palatino Linotype", serif', genericFamily: "serif" },
  { id: "cormorant-garamond", name: "Cormorant Garamond", category: "Manuscrit", family: '"Cormorant Garamond", Georgia, serif', fallbackName: "Georgia", fallbackFamily: "Georgia, serif", genericFamily: "serif" },
  { id: "inter", name: "Inter", category: "Documentation", family: 'Inter, "Segoe UI", sans-serif', fallbackName: "Segoe UI", fallbackFamily: '"Segoe UI", sans-serif', genericFamily: "sans-serif" },
  { id: "atkinson-hyperlegible", name: "Atkinson Hyperlegible", category: "Documentation", family: '"Atkinson Hyperlegible", Arial, sans-serif', fallbackName: "Arial", fallbackFamily: "Arial, sans-serif", genericFamily: "sans-serif" },
  { id: "noto-sans", name: "Noto Sans", category: "Documentation", family: '"Noto Sans", Verdana, sans-serif', fallbackName: "Verdana", fallbackFamily: "Verdana, sans-serif", genericFamily: "sans-serif" },
  { id: "jetbrains-mono", name: "JetBrains Mono", category: "Développement", family: '"JetBrains Mono", "Cascadia Code", monospace', fallbackName: "Cascadia Code", fallbackFamily: '"Cascadia Code", monospace', genericFamily: "monospace" },
  { id: "geist-mono", name: "Geist Mono", category: "Développement", family: '"Geist Mono", Consolas, monospace', fallbackName: "Consolas", fallbackFamily: "Consolas, monospace", genericFamily: "monospace" },
  { id: "fira-code", name: "Fira Code", category: "Développement", family: '"Fira Code", "Courier New", monospace', fallbackName: "Courier New", fallbackFamily: '"Courier New", monospace', genericFamily: "monospace" },
  { id: "lexend", name: "Lexend", category: "Composition", family: 'Lexend, "Trebuchet MS", sans-serif', fallbackName: "Trebuchet MS", fallbackFamily: '"Trebuchet MS", sans-serif', genericFamily: "sans-serif" },
  { id: "nunito", name: "Nunito", category: "Composition", family: 'Nunito, Calibri, sans-serif', fallbackName: "Calibri", fallbackFamily: "Calibri, sans-serif", genericFamily: "sans-serif" },
  { id: "source-sans-3", name: "Source Sans 3", category: "Composition", family: '"Source Sans 3", Arial, sans-serif', fallbackName: "Arial", fallbackFamily: "Arial, sans-serif", genericFamily: "sans-serif" },
];

export const WIDTH_OPTIONS: Array<{ id: ReadingWidth; name: string; value: string }> = [
  { id: "narrow", name: "Étroite", value: "560px" },
  { id: "medium", name: "Moyenne", value: "680px" },
  { id: "wide", name: "Large", value: "800px" },
  { id: "very-wide", name: "Très large", value: "920px" },
];

export const PALETTES: Record<ThemeName, PaletteOption[]> = {
  nuit: [
    { id: "classic", name: "Classique" },
    { id: "ivory", name: "Ivoire" },
    { id: "light-blue", name: "Bleu très clair" },
    { id: "soft-gray", name: "Gris doux" },
  ],
  aube: [
    { id: "anthracite", name: "Anthracite" },
    { id: "dark-gray", name: "Gris foncé" },
    { id: "dark-brown", name: "Brun foncé" },
  ],
};

export const DEFAULT_WRITING_PREFERENCES: WritingPreferences = {
  fontId: "literata",
  fontSize: 18,
  lineHeight: 1.7,
  readingWidth: "medium",
  palettes: { nuit: "classic", aube: "anthracite" },
};

export function isFontId(value: unknown): value is string {
  return typeof value === "string" && FONT_LIBRARY.some((font) => font.id === value);
}

export function isReadingWidth(value: unknown): value is ReadingWidth {
  return WIDTH_OPTIONS.some((option) => option.id === value);
}

export function isPalette(theme: ThemeName, value: unknown): value is NightPalette | DawnPalette {
  return PALETTES[theme].some((palette) => palette.id === value);
}
