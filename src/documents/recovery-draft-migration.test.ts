import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RecoveryDraftMigrationController,
  type LibraryDocument,
  type RecoveryDraftMigrationInvoker,
  type RecoveryDraftVerificationInvoker,
} from "./recovery-draft-migration";
import {
  RecoveryDraftService,
  type RecoveryDraft,
} from "./recovery-draft";

const KEY = "plum3.recovery-draft.v1";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const draft: RecoveryDraft = {
  name: "Mon brouillon.md",
  content: "# Titre\n\nContenu exact.\n",
  savedAt: "2026-07-17T18:59:00.000Z",
};

const document: LibraryDocument = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: null,
  title: draft.name,
  fileName: "11111111-1111-4111-8111-111111111111.md",
  templateType: null,
  createdAt: "2026-07-17T19:00:00.000Z",
  updatedAt: "2026-07-17T19:00:00.000Z",
  lastOpenedAt: null,
};

function setup(android = true) {
  const storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  const migrate = vi.fn<RecoveryDraftMigrationInvoker>().mockResolvedValue({
    document,
    created: true,
  });
  const verify = vi.fn<RecoveryDraftVerificationInvoker>().mockResolvedValue(document);
  const service = new RecoveryDraftService();
  const controller = new RecoveryDraftMigrationController(
    service,
    migrate,
    verify,
    android,
  );
  return { controller, migrate, service, storage, verify };
}

describe("RecoveryDraftMigrationController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignore proprement l’absence de brouillon", async () => {
    const { controller, migrate, verify } = setup();

    await expect(controller.initialize()).resolves.toBeNull();
    expect(migrate).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("ignore un brouillon vide ou composé uniquement d’espaces", async () => {
    const { controller, migrate, storage } = setup();
    storage.setItem(KEY, JSON.stringify({ ...draft, content: "  \n\t " }));

    await expect(controller.initialize()).resolves.toBeNull();
    expect(migrate).not.toHaveBeenCalled();
    expect(storage.getItem(KEY)).not.toBeNull();
  });

  it("gère un JSON invalide sans appel natif ni suppression", async () => {
    const { controller, migrate, storage } = setup();
    storage.setItem(KEY, "{JSON incomplet");

    await expect(controller.initialize()).resolves.toBeNull();
    expect(migrate).not.toHaveBeenCalled();
    expect(storage.getItem(KEY)).toBe("{JSON incomplet");
  });

  it("migre uniquement sur Android puis supprime la source après vérification", async () => {
    const { controller, migrate, storage, verify } = setup();
    storage.setItem(KEY, JSON.stringify(draft));

    await expect(controller.initialize()).resolves.toEqual({
      document,
      created: true,
    });
    expect(migrate).toHaveBeenCalledWith({
      name: draft.name,
      content: draft.content,
      savedAt: draft.savedAt,
      templateType: null,
    });
    expect(verify).toHaveBeenCalledWith({
      documentId: document.id,
      sourceSavedAt: draft.savedAt,
    });
    expect(storage.getItem(KEY)).toBeNull();
  });

  it("conserve localStorage lorsque la migration native échoue", async () => {
    const { controller, migrate, storage, verify } = setup();
    storage.setItem(KEY, JSON.stringify(draft));
    migrate.mockRejectedValue(new Error("dépôt indisponible"));

    await expect(controller.initialize()).resolves.toBeNull();
    expect(verify).not.toHaveBeenCalled();
    expect(storage.getItem(KEY)).toBe(JSON.stringify(draft));
  });

  it("conserve localStorage lorsque la vérification native échoue", async () => {
    const { controller, storage, verify } = setup();
    storage.setItem(KEY, JSON.stringify(draft));
    verify.mockRejectedValue(new Error("document absent"));

    await expect(controller.initialize()).resolves.toBeNull();
    expect(storage.getItem(KEY)).toBe(JSON.stringify(draft));
  });

  it("ne supprime pas un nouveau brouillon enregistré pendant la migration", async () => {
    const { controller, migrate, storage } = setup();
    const newerDraft = {
      ...draft,
      content: "contenu plus récent",
      savedAt: "2026-07-17T19:01:00.000Z",
    };
    storage.setItem(KEY, JSON.stringify(draft));
    migrate.mockImplementation(async () => {
      storage.setItem(KEY, JSON.stringify(newerDraft));
      return { document, created: true };
    });

    await controller.initialize();

    expect(storage.getItem(KEY)).toBe(JSON.stringify(newerDraft));
  });

  it("ne lit ni ne migre le brouillon sur Windows", async () => {
    const { controller, migrate, service, storage, verify } = setup(false);
    storage.setItem(KEY, JSON.stringify(draft));
    const load = vi.spyOn(service, "loadForMigration");

    await expect(controller.initialize()).resolves.toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect(migrate).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(storage.getItem(KEY)).toBe(JSON.stringify(draft));
  });
});
