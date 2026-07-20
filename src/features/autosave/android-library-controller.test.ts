import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentStore } from "../../documents/document-state";
import type { LibraryDocument } from "../../documents/recovery-draft-migration";
import {
  AndroidLibraryAutosaveController,
  type AndroidLibraryGateway,
} from "./android-library-controller";

const documentMeta: LibraryDocument = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: null,
  title: "Document.md",
  fileName: "11111111-1111-4111-8111-111111111111.md",
  templateType: null,
  createdAt: "2026-07-17T19:00:00.000Z",
  updatedAt: "2026-07-17T19:00:00.000Z",
  lastOpenedAt: null,
};

function setup(activeContent: string | null = null, android = true) {
  const status = { textContent: "" };
  const visibilityListeners: Array<() => void> = [];
  vi.stubGlobal("document", {
    documentElement: { lang: "fr" },
    visibilityState: "visible",
    addEventListener: (type: string, listener: () => void) => {
      if (type === "visibilitychange") visibilityListeners.push(listener);
    },
  });
  vi.stubGlobal("window", {
    setTimeout,
    clearTimeout,
  });
  const gateway: AndroidLibraryGateway = {
    loadActive: vi.fn().mockResolvedValue(
      activeContent === null
        ? null
        : { document: documentMeta, content: activeContent },
    ),
    create: vi.fn().mockResolvedValue(documentMeta),
    save: vi.fn().mockResolvedValue(documentMeta),
  };
  const store = new DocumentStore();
  const root = {
    querySelector: () => status,
  } as unknown as ParentNode;
  const controller = new AndroidLibraryAutosaveController(
    store,
    gateway,
    android,
    root,
  );
  return { controller, gateway, status, store, visibilityListeners };
}

describe("AndroidLibraryAutosaveController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sauvegarde une modification après deux secondes sans frappe", async () => {
    const { controller, gateway, store } = setup("source");
    await controller.initialize();
    store.updateContent("contenu modifié");

    await vi.advanceTimersByTimeAsync(1_999);
    expect(gateway.save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(gateway.save).toHaveBeenCalledWith({
      documentId: documentMeta.id,
      content: "contenu modifié",
    });
    expect(store.isDirty).toBe(false);
  });

  it("publie les états non sauvegardé, en cours puis sauvegardé", async () => {
    const { controller, store } = setup("source");
    const states: string[] = [];
    controller.subscribeSaveState((state) => states.push(state));
    await controller.initialize();

    store.updateContent("contenu modifié");
    await vi.advanceTimersByTimeAsync(2_000);
    await controller.flush();

    expect(states).toContain("dirty");
    expect(states).toContain("saving");
    expect(states.at(-1)).toBe("saved");
  });

  it("sauvegarde le document précédent lorsqu’un nouveau document le remplace", async () => {
    const { controller, gateway, store } = setup("source");
    await controller.initialize();
    store.updateContent("ancien contenu modifié");
    store.createFromTemplate("Nouveau.md", "# Nouveau");

    await controller.flush();

    expect(gateway.save).toHaveBeenCalledWith({
      documentId: documentMeta.id,
      content: "ancien contenu modifié",
    });
    expect(gateway.create).toHaveBeenCalledWith({
      title: "Nouveau.md",
      content: "# Nouveau",
      templateType: null,
    });
  });

  it("sauvegarde immédiatement lors du passage en arrière-plan", async () => {
    const { controller, gateway, store, visibilityListeners } = setup("source");
    await controller.initialize();
    store.updateContent("avant arrière-plan");
    Object.defineProperty(document, "visibilityState", { value: "hidden" });

    visibilityListeners.forEach((listener) => listener());
    await controller.flush();

    expect(gateway.save).toHaveBeenCalledWith({
      documentId: documentMeta.id,
      content: "avant arrière-plan",
    });
  });

  it("signale l’échec et ne produit jamais un faux état sauvegardé", async () => {
    const { controller, gateway, status, store } = setup();
    const states: string[] = [];
    controller.subscribeSaveState((state) => states.push(state));
    vi.mocked(gateway.create).mockRejectedValue(new Error("échec disque"));
    await controller.initialize();
    store.createFromTemplate("Échec.md", "texte non sauvegardé");

    await vi.advanceTimersByTimeAsync(2_000);
    await controller.flush();

    expect(status.textContent).toBe("Sauvegarde automatique suspendue.");
    expect(store.isDirty).toBe(true);
    expect(states).toContain("saving");
    expect(states.at(-1)).toBe("error");
    expect(states.at(-1)).not.toBe("saved");
  });

  it("crée manuellement un document vide encore absent de la bibliothèque", async () => {
    const { controller, gateway, store } = setup();
    await controller.initialize();

    await expect(controller.saveNow()).resolves.toBe(true);

    expect(gateway.create).toHaveBeenCalledWith({
      title: "Sans titre.md",
      content: "",
      templateType: null,
    });
    expect(store.current.libraryDocumentId).toBe(documentMeta.id);
  });

  it("sauvegarde manuellement un document existant même sans modification", async () => {
    const { controller, gateway } = setup("stable");
    await controller.initialize();

    await expect(controller.saveNow()).resolves.toBe(true);

    expect(gateway.save).toHaveBeenCalledWith({
      documentId: documentMeta.id,
      content: "stable",
    });
  });

  it("ne crée pas de doublon si une sauvegarde automatique précède la sauvegarde manuelle", async () => {
    const { controller, gateway, store } = setup();
    await controller.initialize();
    store.createFromTemplate("Unique.md", "contenu");
    await vi.advanceTimersByTimeAsync(2_000);

    await controller.saveNow();

    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(gateway.save).toHaveBeenCalledWith({
      documentId: documentMeta.id,
      content: "contenu",
    });
  });

  it("reste entièrement inactif sur Windows", async () => {
    const { controller, gateway, store } = setup(null, false);
    await controller.initialize();
    store.createFromTemplate("Windows.md", "contenu");
    await vi.advanceTimersByTimeAsync(2_000);

    expect(gateway.loadActive).not.toHaveBeenCalled();
    expect(gateway.create).not.toHaveBeenCalled();
    expect(gateway.save).not.toHaveBeenCalled();
  });
});
