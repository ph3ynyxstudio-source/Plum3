import { getCurrentWindow } from "@tauri-apps/api/window";
import { FileService } from "../services/file-service";
import { AppDialog } from "../ui/app-dialog";
import { DocumentNameError, validatedDocumentName } from "./document-name";
import { DocumentStore } from "./document-state";

export class DocumentRenameController {
  private readonly display = this.requireElement<HTMLButtonElement>("[data-document-title]");
  private readonly input = this.requireElement<HTMLInputElement>("[data-document-title-input]");
  private editing = false;

  constructor(private readonly store: DocumentStore, private readonly files: FileService, private readonly dialog: AppDialog) {}

  initialize(): void {
    this.display.addEventListener("click", () => this.start());
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); void this.commit(); }
      if (event.key === "Escape") { event.preventDefault(); this.cancel(); }
    });
    this.input.addEventListener("blur", () => { if (this.editing) void this.commit(); });
    this.store.subscribe((state) => {
      this.display.textContent = state.name;
      this.display.title = state.path ?? "Document non enregistré — cliquer pour renommer";
      void getCurrentWindow().setTitle(`${state.name} — Plum3 de Nyx`).catch(() => undefined);
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
      await this.dialog.showError("Nom de document invalide", cause instanceof DocumentNameError ? cause.message : "Ce nom ne peut pas être utilisé.");
      return;
    }
    if (name === previous.name) { this.cancel(); return; }

    if (!previous.path) {
      this.store.renameProposed(name);
      this.cancel();
      return;
    }

    const action = await this.dialog.show({
      title: "Renommer le fichier ?",
      message: `« ${previous.name} » deviendra « ${name} » dans le même dossier.`,
      actions: [{ id: "cancel", label: "Annuler" }, { id: "rename", label: "Renommer", tone: "primary" }],
    });
    if (action !== "rename") { this.cancel(); return; }
    try {
      this.store.markRenamed(await this.files.rename(previous.path, name));
      this.cancel();
    } catch (cause) {
      this.input.focus();
      await this.dialog.showError("Renommage impossible", cause instanceof Error ? cause.message : "Le fichier n’a pas pu être renommé.");
    }
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de renommage introuvable : ${selector}`);
    return element;
  }
}
