import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DISPLAY_PREFERENCES } from "./model";
import { DisplayPreferencesStorage } from "./storage";

describe("DisplayPreferencesStorage", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  it("revient aux valeurs sûres si le stockage est invalide", () => {
    localStorage.setItem("plum3.display-preferences.v1", "invalide");
    expect(new DisplayPreferencesStorage().load()).toEqual(DEFAULT_DISPLAY_PREFERENCES);
  });

  it("conserve les quatre préférences", () => {
    const storage = new DisplayPreferencesStorage();
    const preferences = { wordCount: false, characterCount: true, lineCount: false, markdownPreview: true };
    storage.save(preferences);
    expect(storage.load()).toEqual(preferences);
  });
});
