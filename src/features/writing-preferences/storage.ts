import {
  DEFAULT_WRITING_PREFERENCES,
  isFontId,
  isPalette,
  isReadingWidth,
  type WritingPreferences,
} from "./model";

const STORAGE_KEY = "plum3.writing-preferences.v1";

export class WritingPreferencesStorage {
  load(): WritingPreferences {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return structuredClone(DEFAULT_WRITING_PREFERENCES);
      const candidate = JSON.parse(serialized) as Partial<WritingPreferences>;
      return {
        fontId: isFontId(candidate.fontId) ? candidate.fontId : DEFAULT_WRITING_PREFERENCES.fontId,
        fontSize: this.clampNumber(candidate.fontSize, 14, 28, DEFAULT_WRITING_PREFERENCES.fontSize),
        lineHeight: this.clampNumber(candidate.lineHeight, 1.4, 2, DEFAULT_WRITING_PREFERENCES.lineHeight),
        readingWidth: isReadingWidth(candidate.readingWidth)
          ? candidate.readingWidth
          : DEFAULT_WRITING_PREFERENCES.readingWidth,
        palettes: {
          nuit: isPalette("nuit", candidate.palettes?.nuit)
            ? candidate.palettes.nuit
            : DEFAULT_WRITING_PREFERENCES.palettes.nuit,
          aube: isPalette("aube", candidate.palettes?.aube)
            ? candidate.palettes.aube
            : DEFAULT_WRITING_PREFERENCES.palettes.aube,
        },
      };
    } catch {
      return structuredClone(DEFAULT_WRITING_PREFERENCES);
    }
  }

  save(preferences: WritingPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }

  reset(): WritingPreferences {
    localStorage.removeItem(STORAGE_KEY);
    return structuredClone(DEFAULT_WRITING_PREFERENCES);
  }

  private clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value)
      ? Math.min(maximum, Math.max(minimum, value))
      : fallback;
  }
}
