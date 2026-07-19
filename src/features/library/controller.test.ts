import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentStore } from "../../documents/document-state";
import type { LibraryDocument } from "../../documents/recovery-draft-migration";
import type { AppDialog } from "../../ui/app-dialog";
import {
  filterLibraryDocuments,
  MobileLibraryController,
  selectPanelDocuments,
  sortAllDocuments,
  sortRecentDocuments,
  type LibraryGateway,
} from "./controller";

function documentMeta(
  id: string,
  updatedAt: string,
  lastOpenedAt: string | null = null,
  title = `Document ${id}`,
): LibraryDocument {
  return {
    id,
    projectId: null,
    title,
    fileName: `${id}.md`,
    templateType: null,
    createdAt: updatedAt,
    updatedAt,
    lastOpenedAt,
  };
}

class FakeClassList {
  private readonly values = new Set<string>();

  toggle(value: string, force?: boolean): boolean {
    if (force === false) this.values.delete(value);
    else this.values.add(value);
    return this.values.has(value);
  }
}

function controllerSetup(documents: LibraryDocument[] = []) {
  const shell = { classList: new FakeClassList(), dataset: {} as Record<string, string> };
  const root = {
    querySelector: (selector: string) => selector === ".app-shell" ? shell : null,
  } as unknown as ParentNode;
  vi.stubGlobal("document", {
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: vi.fn(),
  });
  const gateway: LibraryGateway = {
    list: vi.fn().mockResolvedValue(documents),
    open: vi.fn(),
    read: vi.fn(),
    rename: vi.fn(),
    delete: vi.fn(),
  };
  const store = new DocumentStore();
  const autosave = {
    flush: vi.fn().mockResolvedValue(true),
    saveNow: vi.fn().mockResolvedValue(true),
  };
  const dialog = {
    show: vi.fn(),
    showError: vi.fn(),
    prompt: vi.fn(),
  } as unknown as AppDialog;
  const markdownShare = { shareDocument: vi.fn().mockResolvedValue(true) };
  const controller = new MobileLibraryController(
    store,
    autosave,
    dialog,
    markdownShare,
    gateway,
    true,
    root,
  );
  return { autosave, controller, dialog, gateway, markdownShare, shell, store };
}

describe("Bibliothèque mobile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("limite le panneau à quatre documents et privilégie lastOpenedAt", () => {
    const documents = [
      documentMeta("a", "2026-07-17T10:00:00Z"),
      documentMeta("b", "2026-07-17T09:00:00Z", "2026-07-17T14:00:00Z"),
      documentMeta("c", "2026-07-17T13:00:00Z"),
      documentMeta("d", "2026-07-17T12:00:00Z", "2026-07-17T15:00:00Z"),
      documentMeta("e", "2026-07-17T11:00:00Z"),
    ];

    expect(selectPanelDocuments(documents).map(({ id }) => id)).toEqual(["d", "b", "c", "e"]);
  });

  it("classe Tous par updatedAt et Récents par lastOpenedAt", () => {
    const documents = [
      documentMeta("a", "2026-07-17T10:00:00Z", "2026-07-17T15:00:00Z"),
      documentMeta("b", "2026-07-17T12:00:00Z"),
      documentMeta("c", "2026-07-17T11:00:00Z", "2026-07-17T16:00:00Z"),
    ];

    expect(sortAllDocuments(documents).map(({ id }) => id)).toEqual(["b", "c", "a"]);
    expect(sortRecentDocuments(documents).map(({ id }) => id)).toEqual(["c", "a"]);
    expect(filterLibraryDocuments(documents, "recent", "").map(({ id }) => id)).toEqual(["c", "a"]);
  });

  it("recherche le titre sans tenir compte de la casse ni des accents", () => {
    const documents = [
      documentMeta("a", "2026-07-17T10:00:00Z", null, "L’Écho de Verre"),
      documentMeta("b", "2026-07-17T11:00:00Z", null, "Chapitre"),
    ];

    expect(filterLibraryDocuments(documents, "all", "echo").map(({ id }) => id)).toEqual(["a"]);
    expect(filterLibraryDocuments(documents, "all", "ABSENT")).toEqual([]);
  });

  it("affiche la bibliothèque au lancement sans document actif", async () => {
    const { controller, shell } = controllerSetup([]);

    await controller.initialize();

    expect(shell.dataset.mobileView).toBe("library");
  });

  it("ouvre un document puis navigue de la bibliothèque vers l’éditeur", async () => {
    const metadata = documentMeta("a", "2026-07-17T10:00:00Z");
    const { autosave, controller, gateway, shell, store } = controllerSetup([metadata]);
    vi.mocked(gateway.open).mockResolvedValue({
      document: metadata,
      content: "# Contenu",
    });

    await (controller as unknown as { openDocument(id: string): Promise<void> })
      .openDocument("a");

    expect(autosave.flush).toHaveBeenCalledOnce();
    expect(store.current.libraryDocumentId).toBe("a");
    expect(store.current.content).toBe("# Contenu");
    expect(shell.dataset.mobileView).toBe("editor");
  });

  it("sauvegarde avant de revenir de l’éditeur vers la bibliothèque", async () => {
    const { autosave, controller, shell } = controllerSetup([]);
    shell.dataset.mobileView = "editor";

    await expect(controller.showLibrary()).resolves.toBe(true);

    expect(autosave.flush).toHaveBeenCalledOnce();
    expect(shell.dataset.mobileView).toBe("library");
  });

  it("renomme les métadonnées et synchronise le document actif", async () => {
    const metadata = documentMeta("a", "2026-07-17T10:00:00Z", null, "Avant.md");
    const renamed = { ...metadata, title: "Après.md", updatedAt: "2026-07-17T11:00:00Z" };
    const { controller, dialog, gateway, store } = controllerSetup([metadata]);
    store.loadLibraryDocument({
      id: metadata.id,
      title: metadata.title,
      content: "contenu",
      updatedAt: metadata.updatedAt,
    });
    vi.mocked(dialog.prompt).mockResolvedValue("Après");
    vi.mocked(gateway.rename).mockResolvedValue(renamed);
    await controller.initialize();

    await (controller as unknown as { renameDocument(id: string): Promise<void> })
      .renameDocument(metadata.id);

    expect(gateway.rename).toHaveBeenCalledWith(metadata.id, "Après.md");
    expect(store.current.name).toBe("Après.md");
  });

  it("partage un document sans l’ouvrir ni changer le document actif", async () => {
    const active = documentMeta("a", "2026-07-17T10:00:00Z");
    const selected = documentMeta("b", "2026-07-17T11:00:00Z", null, "Partage.md");
    const { controller, gateway, markdownShare, store } = controllerSetup([active, selected]);
    store.loadLibraryDocument({
      id: active.id,
      title: active.title,
      content: "actif",
      updatedAt: active.updatedAt,
    });
    vi.mocked(gateway.read).mockResolvedValue({ document: selected, content: "# À partager" });
    await controller.initialize();

    await (controller as unknown as { shareDocument(id: string): Promise<void> })
      .shareDocument(selected.id);

    expect(gateway.open).not.toHaveBeenCalled();
    expect(markdownShare.shareDocument).toHaveBeenCalledWith("Partage.md", "# À partager");
    expect(store.current.libraryDocumentId).toBe(active.id);
  });

  it("annule puis confirme une suppression permanente", async () => {
    const metadata = documentMeta("a", "2026-07-17T10:00:00Z");
    const { controller, dialog, gateway } = controllerSetup([metadata]);
    await controller.initialize();
    vi.mocked(dialog.show).mockResolvedValueOnce("cancel").mockResolvedValueOnce("delete");

    await (controller as unknown as { deleteDocument(id: string): Promise<void> })
      .deleteDocument(metadata.id);
    expect(gateway.delete).not.toHaveBeenCalled();

    await (controller as unknown as { deleteDocument(id: string): Promise<void> })
      .deleteDocument(metadata.id);
    expect(gateway.delete).toHaveBeenCalledWith(metadata.id);
  });
});
