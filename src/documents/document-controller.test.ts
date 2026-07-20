import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppDialog } from "../ui/app-dialog";
import type { TemplateDialog } from "../templates/template-dialog";
import type { RecoveryDraftService } from "./recovery-draft";
import type { FileService } from "../services/file-service";
import { DocumentController } from "./document-controller";
import { DocumentStore } from "./document-state";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: vi.fn().mockResolvedValue(() => undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  }),
}));

type Listener = (event: {
  altKey?: boolean;
  ctrlKey?: boolean;
  key?: string;
  metaKey?: boolean;
  shiftKey?: boolean;
  preventDefault: () => void;
  target?: FakeElement;
}) => void;

class FakeClassList {
  private readonly values = new Set<string>();

  toggle(value: string, force?: boolean): boolean {
    const enabled = force ?? !this.values.has(value);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeElement {
  readonly classList = new FakeClassList();
  readonly dataset: Record<string, string> = {};
  readonly focus = vi.fn();
  className = "";
  disabled = false;
  hidden = false;
  textContent = "";
  title = "";
  value = "";
  dateTime = "";
  private readonly listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  click(): void {
    this.listeners.get("click")?.forEach((listener) => listener({ preventDefault: vi.fn(), target: this }));
  }

  dispatch(type: string, event: Parameters<Listener>[0]): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  querySelectorAll<T>(): T[] {
    return [];
  }

  replaceChildren(): void {}
  removeAttribute(): void {}
}

function setup(android: boolean, libraryEnabled = android) {
  const editor = new FakeElement();
  const recentDocuments = new FakeElement();
  const openButton = new FakeElement();
  const saveButton = new FakeElement();
  const saveAsButton = new FakeElement();
  const saveDot = new FakeElement();
  const documentStatus = new FakeElement();
  openButton.dataset.documentAction = "open";
  saveButton.dataset.documentAction = "save";
  saveAsButton.dataset.documentAction = "save-as";
  const documentListeners = new Map<string, Listener[]>();
  const elements = new Map<string, FakeElement>([
    ["[data-document-editor]", editor],
    ["[data-document-title]", new FakeElement()],
    ["[data-document-status]", documentStatus],
    ["[data-last-save-time]", new FakeElement()],
    ["[data-word-count]", new FakeElement()],
    ["[data-character-count]", new FakeElement()],
    ["[data-line-count]", new FakeElement()],
    ["[data-document-format]", new FakeElement()],
    ["[data-recent-documents]", recentDocuments],
    [".open-document", openButton],
    [".save-document", saveButton],
    [".save-document-as", saveAsButton],
  ]);
  vi.stubGlobal("document", {
    documentElement: { lang: "fr" },
    createElement: () => new FakeElement(),
    querySelector: (selector: string) => elements.get(selector) ?? null,
    querySelectorAll: (selector: string) => {
      if (selector === "[data-document-action]") {
        return [openButton, saveButton, saveAsButton];
      }
      if (selector === "[data-document-save-dot]") return [saveDot];
      if (selector === ".open-document, .save-document-as") return [openButton, saveAsButton];
      return [];
    },
    addEventListener: (type: string, listener: Listener) => {
      documentListeners.set(type, [...(documentListeners.get(type) ?? []), listener]);
    },
  });
  const files = {
    chooseDocumentToOpen: vi.fn().mockResolvedValue(null),
    listRecentDocuments: vi.fn().mockResolvedValue([]),
    removeRecentDocument: vi.fn().mockResolvedValue(true),
    openRecentDocument: vi.fn(),
    chooseSavePath: vi.fn(),
    save: vi.fn(),
    rename: vi.fn(),
  };
  const dialog = {
    show: vi.fn().mockResolvedValue("cancel"),
    showError: vi.fn().mockResolvedValue(undefined),
  };
  const templates = { show: vi.fn().mockResolvedValue(null) };
  const recoveryDrafts = {
    clear: vi.fn(),
    load: vi.fn().mockReturnValue(null),
    save: vi.fn(),
  };
  const store = new DocumentStore();
  let saveStateListener: ((state: "dirty" | "error" | "saved" | "saving") => void) | null = null;
  const androidAutosave = {
    flush: vi.fn().mockResolvedValue(true),
    saveNow: vi.fn().mockResolvedValue(true),
    subscribeSaveState: vi.fn((listener: typeof saveStateListener) => {
      saveStateListener = listener;
      listener?.("dirty");
      return vi.fn();
    }),
  };
  const controller = new DocumentController(
    store,
    files as unknown as FileService,
    dialog as unknown as AppDialog,
    templates as unknown as TemplateDialog,
    recoveryDrafts as unknown as RecoveryDraftService,
    android,
    androidAutosave,
    libraryEnabled,
  );
  (controller as unknown as { bindActions(): void }).bindActions();
  return {
    controller,
    dialog,
    documentListeners,
    files,
    openButton,
    saveButton,
    saveAsButton,
    androidAutosave,
    recoveryDrafts,
    saveDot,
    documentStatus,
    setSaveState: (state: "dirty" | "error" | "saved" | "saving") => saveStateListener?.(state),
    store,
  };
}

describe("DocumentController et les fichiers Android", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("neutralise le bouton, Ctrl+O et toutes les voies de documents récents sur Android", async () => {
    const context = setup(true);
    const preventDefault = vi.fn();

    context.openButton.click();
    context.documentListeners.get("keydown")?.forEach((listener) => listener({
      ctrlKey: true,
      key: "o",
      preventDefault,
    }));
    const internal = context.controller as unknown as {
      openDocument(): Promise<void>;
      openRecentDocument(path: string): Promise<void>;
      refreshRecentDocuments(): Promise<void>;
      removeRecentDocument(path: string): Promise<void>;
    };
    await internal.openDocument();
    await internal.openRecentDocument("C:/Document.md");
    await internal.refreshRecentDocuments();
    await internal.removeRecentDocument("C:/Document.md");

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(context.files.chooseDocumentToOpen).not.toHaveBeenCalled();
    expect(context.files.openRecentDocument).not.toHaveBeenCalled();
    expect(context.files.listRecentDocuments).not.toHaveBeenCalled();
    expect(context.files.removeRecentDocument).not.toHaveBeenCalled();
    expect(context.dialog.show).not.toHaveBeenCalled();
  });

  it("conserve l’ouverture native et Ctrl+O sur Windows", async () => {
    const context = setup(false);

    context.documentListeners.get("keydown")?.forEach((listener) => listener({
      ctrlKey: true,
      key: "o",
      preventDefault: vi.fn(),
    }));

    await vi.waitFor(() => expect(context.files.chooseDocumentToOpen).toHaveBeenCalledOnce());
  });

  it("utilise l’icône Enregistrer pour sauvegarder dans la bibliothèque Android", async () => {
    const context = setup(true);

    context.saveButton.click();

    await vi.waitFor(() => expect(context.androidAutosave.saveNow).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(context.saveButton.disabled).toBe(false));
    expect(context.files.save).not.toHaveBeenCalled();
    expect(context.openButton.disabled).toBe(true);
    expect(context.saveAsButton.disabled).toBe(true);
    expect(context.dialog.show).not.toHaveBeenCalled();
  });

  it("reflète les quatre états de sauvegarde uniquement dans l’interface Android", async () => {
    const context = setup(true);
    await context.controller.initialize();

    expect(context.saveDot.classList.contains("is-dirty")).toBe(true);
    context.setSaveState("saving");
    expect(context.saveDot.classList.contains("is-saving")).toBe(true);
    expect(context.documentStatus.textContent).toBe("Sauvegarde automatique…");
    context.setSaveState("saved");
    expect(context.saveDot.classList.contains("is-saving")).toBe(false);
    expect(context.saveDot.classList.contains("is-dirty")).toBe(false);
    expect(context.documentStatus.textContent).toBe("Enregistré");
    context.setSaveState("error");
    expect(context.saveDot.classList.contains("is-error")).toBe(true);
    expect(context.documentStatus.textContent).toBe("Sauvegarde automatique suspendue.");
  });

  it("ne restaure plus directement le brouillon dans DocumentStore sur Android", async () => {
    const context = setup(true);
    context.recoveryDrafts.load.mockReturnValue({
      name: "Android.md",
      content: "contenu à migrer",
      savedAt: "2026-07-17T18:59:00.000Z",
    });

    await context.controller.initialize();

    expect(context.recoveryDrafts.load).not.toHaveBeenCalled();
    expect(context.store.current.content).toBe("");
  });

  it("conserve la restauration directe du brouillon sur Windows", async () => {
    const context = setup(false);
    context.recoveryDrafts.load.mockReturnValue({
      name: "Windows.md",
      content: "contenu récupéré",
      savedAt: "2026-07-17T18:59:00.000Z",
    });

    await context.controller.initialize();

    expect(context.recoveryDrafts.load).toHaveBeenCalledOnce();
    expect(context.store.current.name).toBe("Brouillon récupéré - Windows.md");
    expect(context.store.current.content).toBe("contenu récupéré");
  });

  it("confie la restauration à la bibliothèque lorsque celle-ci est activée sur Windows", async () => {
    const context = setup(false, true);
    context.recoveryDrafts.load.mockReturnValue({
      name: "Windows.md",
      content: "contenu à migrer",
      savedAt: "2026-07-17T18:59:00.000Z",
    });

    await context.controller.initialize();

    expect(context.recoveryDrafts.load).not.toHaveBeenCalled();
    expect(context.store.current.content).toBe("");
  });

  it("enregistre un document de bibliothèque sous Windows sans désactiver les fichiers externes", async () => {
    const context = setup(false, true);
    context.dialog.show.mockResolvedValueOnce("library");

    context.saveButton.click();

    await vi.waitFor(() => expect(context.androidAutosave.saveNow).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(context.openButton.disabled).toBe(false));
    expect(context.files.save).not.toHaveBeenCalled();
    expect(context.saveAsButton.disabled).toBe(false);
  });

  it("propose la bibliothèque ou l’Explorateur au premier enregistrement Windows", async () => {
    const context = setup(false, true);
    context.dialog.show.mockResolvedValueOnce("library");
    context.store.updateContent("Premier contenu");

    context.saveButton.click();

    await vi.waitFor(() => expect(context.dialog.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Choisir où enregistrer",
        actions: expect.arrayContaining([
          expect.objectContaining({ id: "library", label: "Bibliothèque Plum3" }),
          expect.objectContaining({ id: "explorer", label: "Explorateur Windows" }),
        ]),
      }),
    ));
    await vi.waitFor(() => expect(context.androidAutosave.saveNow).toHaveBeenCalledOnce());
    expect(context.files.chooseSavePath).not.toHaveBeenCalled();
  });

  it("enregistre dans un fichier distinct lorsque l’Explorateur est choisi sous Windows", async () => {
    const context = setup(false, true);
    context.dialog.show.mockResolvedValueOnce("explorer");
    context.files.chooseSavePath.mockResolvedValue({
      path: "C:/Documents/Plum3.md",
      name: "Plum3.md",
      exists: false,
    });
    context.files.save.mockResolvedValue({
      path: "C:/Documents/Plum3.md",
      name: "Plum3.md",
      version: { modifiedMillis: 2, size: 7, fingerprint: "saved" },
    });
    context.store.updateContent("Contenu");

    context.saveButton.click();

    await vi.waitFor(() => expect(context.files.chooseSavePath).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(context.files.save).toHaveBeenCalledOnce());
    expect(context.androidAutosave.saveNow).not.toHaveBeenCalled();
    expect(context.store.current.path).toBe("C:/Documents/Plum3.md");
  });

  it("affiche rouge, orange puis vert pendant une sauvegarde Windows", async () => {
    const context = setup(false, true);
    let finishSave: ((result: {
      path: string;
      name: string;
      version: { modifiedMillis: number; size: number; fingerprint: string };
    }) => void) | undefined;
    context.files.save.mockImplementation(() => new Promise((resolve) => {
      finishSave = resolve;
    }));
    context.store.load({
      path: "C:/Documents/Plum3.md",
      name: "Plum3.md",
      content: "Avant",
      version: { modifiedMillis: 1, size: 5, fingerprint: "before" },
    });
    context.store.updateContent("Après");
    await context.controller.initialize();

    expect(context.saveDot.classList.contains("is-dirty")).toBe(true);
    context.saveButton.click();
    await vi.waitFor(() => expect(context.saveDot.classList.contains("is-saving")).toBe(true));
    expect(context.saveDot.classList.contains("is-dirty")).toBe(false);

    finishSave?.({
      path: "C:/Documents/Plum3.md",
      name: "Plum3.md",
      version: { modifiedMillis: 2, size: 5, fingerprint: "after" },
    });
    await vi.waitFor(() => expect(context.saveDot.classList.contains("is-saving")).toBe(false));
    expect(context.saveDot.classList.contains("is-dirty")).toBe(false);
    expect(context.documentStatus.textContent).toBe("Enregistré");
  });
});
