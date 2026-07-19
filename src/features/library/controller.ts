import { invoke } from "@tauri-apps/api/core";
import type { DocumentStore } from "../../documents/document-state";
import type { LibraryDocument } from "../../documents/recovery-draft-migration";
import { localeTag, subscribeLocale, t } from "../../i18n/i18n";
import { isAndroid } from "../../platform/platform";
import { WRITING_TEMPLATES } from "../../templates/writing-templates";
import type { AppDialog } from "../../ui/app-dialog";
import { icon } from "../../ui/icons";
import type { AndroidDocumentAutosave } from "../../documents/document-controller";

export interface LibraryDocumentContent {
  document: LibraryDocument;
  content: string;
}

export interface LibraryGateway {
  list(): Promise<LibraryDocument[]>;
  open(documentId: string): Promise<LibraryDocumentContent>;
}

const tauriGateway: LibraryGateway = {
  list: () => invoke("list_library_documents"),
  open: (documentId) => invoke("open_library_document", {
    request: { documentId },
  }),
};

export type LibraryFilter = "all" | "recent";

export function sortAllDocuments(documents: LibraryDocument[]): LibraryDocument[] {
  return [...documents].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
}

export function sortRecentDocuments(documents: LibraryDocument[]): LibraryDocument[] {
  return documents
    .filter((document) => document.lastOpenedAt !== null)
    .sort((left, right) =>
      right.lastOpenedAt!.localeCompare(left.lastOpenedAt!) || left.id.localeCompare(right.id));
}

export function selectPanelDocuments(documents: LibraryDocument[]): LibraryDocument[] {
  const recent = sortRecentDocuments(documents);
  const recentIds = new Set(recent.map((document) => document.id));
  return [
    ...recent,
    ...sortAllDocuments(documents).filter((document) => !recentIds.has(document.id)),
  ].slice(0, 4);
}

export function filterLibraryDocuments(
  documents: LibraryDocument[],
  filter: LibraryFilter,
  query: string,
): LibraryDocument[] {
  const normalizedQuery = normalizeSearch(query);
  const ordered = filter === "recent"
    ? sortRecentDocuments(documents)
    : sortAllDocuments(documents);
  if (!normalizedQuery) return ordered;
  return ordered.filter((document) =>
    normalizeSearch(document.title).includes(normalizedQuery));
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

export class MobileLibraryController {
  private documents: LibraryDocument[] = [];
  private filter: LibraryFilter = "all";
  private query = "";
  private readonly shell: HTMLElement | null;
  private readonly quickList: HTMLElement | null;
  private readonly list: HTMLElement | null;
  private readonly empty: HTMLElement | null;
  private readonly noResults: HTMLElement | null;
  private readonly search: HTMLInputElement | null;

  constructor(
    private readonly store: DocumentStore,
    private readonly autosave: AndroidDocumentAutosave,
    private readonly dialog: AppDialog,
    private readonly gateway: LibraryGateway = tauriGateway,
    private readonly android = isAndroid(),
    root: ParentNode = document,
  ) {
    this.shell = root.querySelector<HTMLElement>(".app-shell");
    this.quickList = root.querySelector<HTMLElement>("[data-library-quick-list]");
    this.list = root.querySelector<HTMLElement>("[data-library-documents]");
    this.empty = root.querySelector<HTMLElement>("[data-library-empty]");
    this.noResults = root.querySelector<HTMLElement>("[data-library-no-results]");
    this.search = root.querySelector<HTMLInputElement>("[data-library-search]");
  }

  async initialize(): Promise<void> {
    if (!this.android) return;
    this.bind();
    await this.refresh();
    this.navigate(this.store.current.libraryDocumentId ? "editor" : "library");
    subscribeLocale(() => this.render());
  }

  async showLibrary(): Promise<boolean> {
    if (!this.android || !(await this.autosave.flush())) return false;
    await this.refresh();
    this.navigate("library");
    return true;
  }

  private bind(): void {
    document.querySelectorAll<HTMLButtonElement>("[data-library-open]").forEach((button) => {
      button.addEventListener("click", () => void this.showLibrary());
    });
    document.querySelectorAll<HTMLButtonElement>("[data-library-new]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector<HTMLButtonElement>(".new-document")?.click();
      });
    });
    document.querySelectorAll<HTMLButtonElement>("[data-library-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        this.filter = button.dataset.libraryFilter === "recent" ? "recent" : "all";
        this.render();
      });
    });
    this.search?.addEventListener("input", () => {
      this.query = this.search?.value ?? "";
      this.render();
    });
    this.quickList?.addEventListener("click", (event) => this.handleDocumentClick(event));
    this.list?.addEventListener("click", (event) => this.handleDocumentClick(event));
    document.addEventListener("plum3:document-created", () => {
      this.navigate("editor");
      void this.autosave.flush().then(() => this.refresh());
    });
    document.addEventListener("plum3:request-library", () => {
      void this.showLibrary();
    });
  }

  private handleDocumentClick(event: Event): void {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-library-document-id]");
    if (button?.dataset.libraryDocumentId) {
      void this.openDocument(button.dataset.libraryDocumentId);
    }
  }

  private async openDocument(documentId: string): Promise<void> {
    if (!(await this.autosave.flush())) return;
    try {
      const opened = await this.gateway.open(documentId);
      this.store.loadLibraryDocument({
        id: opened.document.id,
        title: opened.document.title,
        content: opened.content,
        updatedAt: opened.document.updatedAt,
      });
      this.navigate("editor");
      await this.refresh();
    } catch (cause) {
      await this.dialog.showError(
        t("error.openDocument"),
        cause instanceof Error ? cause.message : t("error.unexpected"),
      );
      this.navigate("library");
    }
  }

  private async refresh(): Promise<void> {
    try {
      this.documents = await this.gateway.list();
    } catch {
      this.documents = [];
    }
    this.render();
  }

  private render(): void {
    this.renderQuickList();
    this.renderFullList();
    document.querySelectorAll<HTMLButtonElement>("[data-library-filter]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.libraryFilter === this.filter);
    });
  }

  private renderQuickList(): void {
    if (!this.quickList) return;
    const documents = selectPanelDocuments(this.documents);
    if (documents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.textContent = t("library.emptyTitle");
      this.quickList.replaceChildren(empty);
      return;
    }
    this.quickList.replaceChildren(...documents.map((document) => this.createQuickRow(document)));
  }

  private renderFullList(): void {
    if (!this.list || !this.empty || !this.noResults) return;
    const visible = filterLibraryDocuments(this.documents, this.filter, this.query);
    this.list.replaceChildren(...visible.map((document) => this.createFullRow(document)));
    this.empty.hidden = this.documents.length !== 0;
    this.noResults.hidden = this.documents.length === 0 || visible.length !== 0;
  }

  private createQuickRow(document: LibraryDocument): HTMLButtonElement {
    const button = documentElement("button", "library-quick-document");
    button.type = "button";
    button.dataset.libraryDocumentId = document.id;
    button.innerHTML = `${icon(templateIcon(document.templateType))}<span><strong></strong><small></small></span>`;
    button.querySelector("strong")!.textContent = document.title;
    button.querySelector("small")!.textContent = templateLabel(document.templateType);
    return button;
  }

  private createFullRow(document: LibraryDocument): HTMLButtonElement {
    const button = documentElement("button", "library-document-row");
    button.type = "button";
    button.dataset.libraryDocumentId = document.id;
    button.innerHTML = `${icon(templateIcon(document.templateType))}<span><strong></strong><small></small></span><span class="library-document-meta"><time></time><em></em></span>`;
    button.querySelector("strong")!.textContent = document.title;
    button.querySelector("small")!.textContent = templateLabel(document.templateType);
    const time = button.querySelector("time")!;
    time.dateTime = document.updatedAt;
    time.textContent = new Date(document.updatedAt).toLocaleDateString(localeTag(), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    button.querySelector("em")!.textContent = t("library.localBadge");
    return button;
  }

  private navigate(view: "editor" | "library"): void {
    if (!this.shell) return;
    this.shell.classList.toggle("is-library-view", view === "library");
    this.shell.dataset.mobileView = view;
  }
}

function templateLabel(templateType: string | null): string {
  if (!templateType) return t("library.unknownType");
  const template = WRITING_TEMPLATES.find((candidate) => candidate.id === templateType);
  return template
    ? t(`templates.${template.id}.name`)
    : t("library.unknownType");
}

function templateIcon(templateType: string | null): "book" | "document" {
  return templateType === "novel" ? "book" : "document";
}

function documentElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.className = className;
  return element;
}
