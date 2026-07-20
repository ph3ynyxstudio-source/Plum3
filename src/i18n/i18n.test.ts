import { beforeEach, describe, expect, it, vi } from "vitest";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  } satisfies Storage;
}

describe("i18n", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("localStorage", storage());
    vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
    vi.stubGlobal("document", {
      documentElement: { lang: "", dataset: {} },
      querySelectorAll: () => [],
      dispatchEvent: () => true,
    });
  });

  it("utilise le français par défaut et gère les pluriels", async () => {
    const { getLocale, t } = await import("./i18n");
    expect(getLocale()).toBe("fr");
    expect(t("editor.words", { count: 1 })).toBe("1 mot");
    expect(t("editor.words", { count: 2 })).toBe("2 mots");
  });

  it("change immédiatement de langue et conserve la préférence", async () => {
    const { getLocale, setLocale, t } = await import("./i18n");
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(t("dialog.unsavedTitle")).toBe("Unsaved changes");
    expect(localStorage.getItem("plum3.locale.v1")).toBe("en");
  });

  it("compose le dialogue non enregistré avec des actions verbales pour chaque destination", async () => {
    const { setLocale, t } = await import("./i18n");
    const name = "Publication réseau social.md";

    expect(t("dialog.unsavedMessage", { name, action: t("dialog.openLibrary") })).toBe(
      "Voulez-vous enregistrer « Publication réseau social.md » avant d’ouvrir la bibliothèque locale ?",
    );
    expect(t("dialog.unsavedMessage", { name, action: t("dialog.createFromTemplate") })).toBe(
      "Voulez-vous enregistrer « Publication réseau social.md » avant de créer un document depuis un modèle ?",
    );
    expect(t("dialog.unsavedMessage", { name, action: t("dialog.openAnother") })).toBe(
      "Voulez-vous enregistrer « Publication réseau social.md » avant d’ouvrir un autre document ?",
    );

    setLocale("en");
    expect(t("dialog.unsavedMessage", { name, action: t("dialog.openLibrary") })).toBe(
      "Do you want to save “Publication réseau social.md” before you open the local library?",
    );
  });
});
