import { DEFAULT_DISPLAY_PREFERENCES, type DisplayPreferences } from "./model";

const STORAGE_KEY = "plum3.display-preferences.v1";

export class DisplayPreferencesStorage {
  load(): DisplayPreferences {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return { ...DEFAULT_DISPLAY_PREFERENCES };
      const candidate = JSON.parse(serialized) as Partial<DisplayPreferences>;
      return {
        wordCount: this.booleanOrDefault(candidate.wordCount, DEFAULT_DISPLAY_PREFERENCES.wordCount),
        characterCount: this.booleanOrDefault(candidate.characterCount, DEFAULT_DISPLAY_PREFERENCES.characterCount),
        lineCount: this.booleanOrDefault(candidate.lineCount, DEFAULT_DISPLAY_PREFERENCES.lineCount),
        markdownPreview: this.booleanOrDefault(candidate.markdownPreview, DEFAULT_DISPLAY_PREFERENCES.markdownPreview),
      };
    } catch {
      return { ...DEFAULT_DISPLAY_PREFERENCES };
    }
  }

  save(preferences: DisplayPreferences): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }

  private booleanOrDefault(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
  }
}
