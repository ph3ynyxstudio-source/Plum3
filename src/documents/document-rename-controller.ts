import { getCurrentWindow } from "@tauri-apps/api/window";
import { FileService } from "../services/file-service";
import { AppDialog } from "../ui/app-dialog";
import { displayDocumentName, DocumentNameError, validatedDocumentName } from "./document-name";
import { DocumentStore } from "./document-state";
import { subscribeLocale, t } from "../i18n/i18n";
import { invoke } from "@tauri-apps/api/core";
import type { LibraryDocument } from "./recovery-draft-migration";
import { isAndroid } from "../platform/platform";

export type LibraryRenameInvoker = (documentId: string, title: string) => Promise<LibraryDocument>;

const invokeLibraryRename: LibraryRenameInvoker = (documentId, title) =>
  invoke("rename_library_document", { request: { documentId, title } });

export class DocumentRenameController {
  private readonly display = this.requireElement<HTMLButtonElement>("[data-document-title]");
  private readonly input = this.requireElement<HTMLInputElement>("[data-document-title-input]");
  private editing = false;

  constructor(
    private readonly store: DocumentStore,
    private readonly files: FileService,
    private readonly dialog: AppDialog,
    private readonly android = isAndroid(),
    private readonly renameLibrary: LibraryRenameInvoker = invokeLibraryRename,
  ) {}

  initialize(): void {
    this.display.addEventListener("click", () => this.start());
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); void this.commit(); }
      if (event.key === "Escape") { event.preventDefault(); this.cancel(); }
    });
    this.input.addEventListener("blur", () => { if (this.editing) void this.commit(); });
    this.store.subscribe((state) => {
      this.display.textContent = displayDocumentName(state.name);
      this.display.title = state.path ?? t("rename.unsavedTitle");
      void getCurrentWindow().setTitle(`${state.name} — Plum3`).catch(() => undefined);
    });
    subscribeLocale(() => {
      if (!this.store.current.path) this.display.title = t("rename.unsavedTitle");
    });
  }

  private start(): void {
    if (this.editing) return;
    this.editing = true;
    const name = this.store.current.name.replace(/\.(md|txt)$/iu, "");
    this.input.value = name;
    this.display.hidden = true;
    this.input.hidden = false;
    this.input.focus();
    this.input.select();
  }

  private cancel(): void {
    this.editing = false;
    this.input.hidden = true;
    this.display.hidden = false;
    this.display.focus();
  }

  private async commit(): Promise<void> {
    if (!this.editing) return;
    const previous = this.store.current;
    let name: string;
    try {
      name = validatedDocumentName(this.input.value, previous.name);
    } catch (cause) {
      this.input.focus();
      await this.dialog.showError(t("rename.invalidTitle"), cause instanceof DocumentNameError ? cause.message : t("rename.windowsInvalid"));
      return;
    }
    if (name === previous.name) { this.cancel(); return; }

    if (this.android && previous.libraryDocumentId) {
      try {
        this.store.markLibraryRenamed(await this.renameLibrary(previous.libraryDocumentId, name));
        document.dispatchEvent(new CustomEvent("plum3:library-updated"));
        this.cancel();
      } catch (cause) {
        this.input.focus();
        await this.dialog.showError(
          t("rename.failedTitle"),
          cause instanceof Error ? cause.message : t("library.renameFailed"),
        );
      }
      return;
    }

    if (!previous.path) {
      this.store.renameProposed(name);
      this.cancel();
      return;
    }

    const action = await this.dialog.show({
      title: t("rename.confirmTitle"),
      message: t("rename.confirmMessage", { previous: previous.name, name }),
      actions: [{ id: "cancel", label: t("common.cancel") }, { id: "rename", label: t("dialog.rename"), tone: "primary" }],
    });
    if (action !== "rename") { this.cancel(); return; }
    try {
      this.store.markRenamed(await this.files.rename(previous.path, name));
      this.cancel();
    } catch (cause) {
      this.input.focus();
      await this.dialog.showError(t("rename.failedTitle"), cause instanceof Error ? cause.message : t("rename.failed"));
    }
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de renommage introuvable : ${selector}`);
    return element;
  }
}
