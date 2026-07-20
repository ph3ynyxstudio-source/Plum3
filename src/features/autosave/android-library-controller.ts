import { invoke } from "@tauri-apps/api/core";
import type { DocumentState, DocumentStore } from "../../documents/document-state";
import type { LibraryDocument } from "../../documents/recovery-draft-migration";
import { t } from "../../i18n/i18n";
import { isAndroid } from "../../platform/platform";

const DELAY_MS = 2_000;

export type AndroidSaveState = "dirty" | "error" | "saved" | "saving";
export type AndroidSaveStateListener = (state: AndroidSaveState) => void;

export interface LibraryDocumentContent {
  document: LibraryDocument;
  content: string;
}

export interface AndroidLibraryGateway {
  loadActive(): Promise<LibraryDocumentContent | null>;
  create(request: {
    title: string;
    content: string;
    templateType: string | null;
  }): Promise<LibraryDocument>;
  save(request: {
    documentId: string;
    content: string;
  }): Promise<LibraryDocument>;
}

const tauriGateway: AndroidLibraryGateway = {
  loadActive: () => invoke("load_active_library_document"),
  create: (request) => invoke("create_library_document", { request }),
  save: (request) => invoke("save_library_document", { request }),
};

interface SaveSnapshot {
  libraryDocumentId: string | null;
  name: string;
  content: string;
  savedContent: string;
}

export class AndroidLibraryAutosaveController {
  private timer: number | null = null;
  private queue: Promise<boolean> = Promise.resolve(true);
  private previous: SaveSnapshot | null = null;
  private initialized = false;
  private applyingSavedState = false;
  private readonly status: HTMLElement | null;
  private saveState: AndroidSaveState = "dirty";
  private readonly saveStateListeners = new Set<AndroidSaveStateListener>();

  constructor(
    private readonly store: DocumentStore,
    private readonly gateway: AndroidLibraryGateway = tauriGateway,
    private readonly android = isAndroid(),
    root: ParentNode = document,
  ) {
    this.status = root.querySelector<HTMLElement>("[data-autosave-status]");
  }

  async initialize(): Promise<void> {
    if (!this.android || this.initialized) return;
    this.initialized = true;
    let loadFailed = false;
    try {
      const active = await this.gateway.loadActive();
      if (active) {
        this.store.loadLibraryDocument({
          id: active.document.id,
          title: active.document.title,
          content: active.content,
          updatedAt: active.document.updatedAt,
        });
      }
    } catch {
      this.setStatus("autosave.paused");
      loadFailed = true;
    }

    this.previous = this.snapshot(this.store.current);
    this.store.subscribe((state) => this.handleState(state));
    this.setSaveState(
      loadFailed
        ? "error"
        : this.store.current.libraryDocumentId && !this.store.isDirty
          ? "saved"
          : "dirty",
    );
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void this.flush();
    });
  }

  subscribeSaveState(listener: AndroidSaveStateListener): () => void {
    this.saveStateListeners.add(listener);
    listener(this.saveState);
    return () => this.saveStateListeners.delete(listener);
  }

  async flush(): Promise<boolean> {
    if (!this.android) return true;
    this.cancelTimer();
    const snapshot = this.snapshot(this.store.current);
    if (snapshot.content !== snapshot.savedContent) {
      this.enqueue(snapshot);
    }
    return this.queue;
  }

  async saveNow(): Promise<boolean> {
    if (!this.android) return false;
    this.cancelTimer();
    this.enqueue(this.snapshot(this.store.current), true);
    return this.queue;
  }

  private handleState(state: Readonly<DocumentState>): void {
    const current = this.snapshot(state);
    if (this.applyingSavedState) {
      this.previous = current;
      return;
    }
    if (current.content !== current.savedContent || !current.libraryDocumentId) {
      this.setSaveState("dirty");
    }
    if (
      this.previous &&
      this.previous.libraryDocumentId !== current.libraryDocumentId &&
      this.previous.content !== this.previous.savedContent
    ) {
      this.enqueue(this.previous);
    }
    this.previous = current;
    this.schedule();
  }

  private schedule(): void {
    this.cancelTimer();
    if (!this.store.isDirty) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.enqueue(this.snapshot(this.store.current));
    }, DELAY_MS);
  }

  private enqueue(snapshot: SaveSnapshot, force = false): void {
    this.queue = this.queue
      .then(() => this.persist(snapshot, force))
      .catch(() => false);
  }

  private async persist(snapshot: SaveSnapshot, force = false): Promise<boolean> {
    if (!force && snapshot.content === snapshot.savedContent) return true;
    this.setStatus("autosave.saving");
    this.setSaveState("saving");
    try {
      const currentBeforeSave = this.store.current;
      const resolvedDocumentId = snapshot.libraryDocumentId
        ?? (currentBeforeSave.name === snapshot.name ? currentBeforeSave.libraryDocumentId : null);
      const document = resolvedDocumentId
        ? await this.gateway.save({
            documentId: resolvedDocumentId,
            content: snapshot.content,
          })
        : await this.gateway.create({
            title: snapshot.name,
            content: snapshot.content,
            templateType: null,
          });
      const current = this.store.current;
      const sameDocument = resolvedDocumentId
        ? current.libraryDocumentId === resolvedDocumentId
        : current.libraryDocumentId === null && current.name === snapshot.name;
      if (sameDocument) {
        this.applyingSavedState = true;
        try {
          this.store.markLibrarySaved(document, snapshot.content);
        } finally {
          this.applyingSavedState = false;
        }
        if (!this.store.isDirty) {
          this.setStatus("autosave.saved");
          this.setSaveState("saved");
        } else {
          this.setSaveState("dirty");
        }
      } else {
        this.setSaveState(
          this.store.isDirty || !this.store.current.libraryDocumentId ? "dirty" : "saved",
        );
      }
      return true;
    } catch {
      this.setStatus("autosave.paused");
      this.setSaveState("error");
      return false;
    }
  }

  private snapshot(state: Readonly<DocumentState>): SaveSnapshot {
    return {
      libraryDocumentId: state.libraryDocumentId,
      name: state.name,
      content: state.content,
      savedContent: state.savedContent,
    };
  }

  private cancelTimer(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  private setStatus(key: "autosave.paused" | "autosave.saved" | "autosave.saving"): void {
    if (this.status) this.status.textContent = t(key);
  }

  private setSaveState(state: AndroidSaveState): void {
    if (this.saveState === state) return;
    this.saveState = state;
    this.saveStateListeners.forEach((listener) => listener(state));
  }
}
