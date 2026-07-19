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
  toggle(): boolean {
    return false;
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

function setup(android: boolean) {
  const editor = new FakeElement();
  const recentDocuments = new FakeElement();
  const openButton = new FakeElement();
  const saveButton = new FakeElement();
  const saveAsButton = new FakeElement();
  const documentListeners = new Map<string, Listener[]>();
  const elements = new Map<string, FakeElement>([
    ["[data-document-editor]", editor],
    ["[data-document-title]", new FakeElement()],
    ["[data-document-status]", new FakeElement()],
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
      if (selector === ".open-document, .save-document, .save-document-as") {
        return [openButton, saveButton, saveAsButton];
      }
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
  const controller = new DocumentController(
    store,
    files as unknown as FileService,
    dialog as unknown as AppDialog,
    templates as unknown as TemplateDialog,
    recoveryDrafts as unknown as RecoveryDraftService,
    android,
  );
  (controller as unknown as { bindActions(): void }).bindActions();
  return {
    controller,
    dialog,
    documentListeners,
    files,
    openButton,
    recoveryDrafts,
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
});
