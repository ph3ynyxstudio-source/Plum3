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

  it("détache la copie Explorateur de son document de bibliothèque", () => {
    const store = new DocumentStore();
    store.loadLibraryDocument({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Bibliothèque.md",
      content: "copie locale",
      updatedAt: "2026-07-20T11:00:00.000Z",
    });

    store.markSaved({
      name: "Explorateur.md",
      path: "C:/Documents/Explorateur.md",
      version: { modifiedMillis: 2, size: 12, fingerprint: "explorer" },
    });

    expect(store.current.libraryDocumentId).toBeNull();
    expect(store.current.path).toBe("C:/Documents/Explorateur.md");
  });
});
