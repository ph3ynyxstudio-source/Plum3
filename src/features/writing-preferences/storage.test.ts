import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WRITING_PREFERENCES } from "./model";
import { WritingPreferencesStorage } from "./storage";

describe("WritingPreferencesStorage", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  it("valide les valeurs chargées au lieu de faire confiance au JSON", () => {
    localStorage.setItem("plum3.writing-preferences.v1", JSON.stringify({ fontSize: 500, lineHeight: 0 }));
    const loaded = new WritingPreferencesStorage().load();
    expect(loaded.fontSize).toBe(28);
    expect(loaded.lineHeight).toBe(1.4);
  });

  it("réinitialise les préférences", () => {
    const storage = new WritingPreferencesStorage();
    expect(storage.reset()).toEqual(DEFAULT_WRITING_PREFERENCES);
  });
});
