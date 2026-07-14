import { describe, expect, it } from "vitest";
import { DocumentStore } from "./document-state";

describe("DocumentStore", () => {
  it("ne modifie jamais le contenu enregistré avant une sauvegarde confirmée", () => {
    const store = new DocumentStore();
    store.load({ name: "test.md", path: "C:/test.md", content: "source", version: { modifiedMillis: 1, size: 6, fingerprint: "a" } });
    store.updateContent("modifié");
    expect(store.isDirty).toBe(true);
    expect(store.current.savedContent).toBe("source");
  });

  it("conserve les caractères Unicode dans un brouillon", () => {
    const store = new DocumentStore();
    store.restoreDraft("brouillon.md", "café — 東京 🌙");
    expect(store.current.content).toBe("café — 東京 🌙");
  });
});
