export interface FileVersion {
  modifiedMillis: number;
  size: number;
  fingerprint: string;
}

export interface DocumentState {
  name: string;
  path: string | null;
  content: string;
  savedContent: string;
  version: FileVersion | null;
  lastSavedAt: Date | null;
}

export type DocumentListener = (state: Readonly<DocumentState>) => void;

export class DocumentStore {
  private state: DocumentState = this.createBlankState();
  private readonly listeners = new Set<DocumentListener>();

  get current(): Readonly<DocumentState> {
    return this.state;
  }

  get isDirty(): boolean {
    return this.state.content !== this.state.savedContent;
  }

  subscribe(listener: DocumentListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  createNew(): void {
    this.state = this.createBlankState();
    this.emit();
  }

  createFromTemplate(name: string, content: string): void {
    this.state = {
      ...this.createBlankState(),
      name,
      content,
    };
    this.emit();
  }

  restoreDraft(name: string, content: string): void {
    this.state = {
      ...this.createBlankState(),
      name,
      content,
    };
    this.emit();
  }

  load(document: {
    name: string;
    path: string;
    content: string;
    version: FileVersion;
  }): void {
    this.state = {
      ...document,
      savedContent: document.content,
      lastSavedAt: new Date(document.version.modifiedMillis),
    };
    this.emit();
  }

  updateContent(content: string): void {
    if (content === this.state.content) return;
    this.state = { ...this.state, content };
    this.emit();
  }

  renameProposed(name: string): void {
    if (name === this.state.name || this.state.path) return;
    this.state = { ...this.state, name };
    this.emit();
  }

  markRenamed(result: { name: string; path: string; version: FileVersion }): void {
    this.state = {
      ...this.state,
      ...result,
      lastSavedAt: new Date(result.version.modifiedMillis),
    };
    this.emit();
  }

  markSaved(result: { name: string; path: string; version: FileVersion }): void {
    this.state = {
      ...this.state,
      ...result,
      savedContent: this.state.content,
      lastSavedAt: new Date(result.version.modifiedMillis),
    };
    this.emit();
  }

  private createBlankState(): DocumentState {
    return {
      name: "Sans titre.md",
      path: null,
      content: "",
      savedContent: "",
      version: null,
      lastSavedAt: null,
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
