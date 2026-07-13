import { getCurrentWindow } from "@tauri-apps/api/window";
import { FileService, FileServiceError, type RecentDocument, type SaveTarget } from "../services/file-service";
import { AppDialog } from "../ui/app-dialog";
import { TemplateDialog } from "../templates/template-dialog";
import { buildTemplateContent, templateDocumentName } from "../templates/writing-templates";
import { DocumentStore, type FileVersion } from "./document-state";
import { recoveredDocumentName, RecoveryDraftService } from "./recovery-draft";
import { displayDocumentName } from "./document-name";
import { icon } from "../ui/icons";

export class DocumentController {
  private readonly editor = this.requireElement<HTMLTextAreaElement>("[data-document-editor]");
  private readonly title = this.requireElement<HTMLElement>("[data-document-title]");
  private readonly documentStatus = this.requireElement<HTMLElement>("[data-document-status]");
  private readonly saveDots = Array.from(
    document.querySelectorAll<HTMLElement>("[data-document-save-dot]"),
  );
  private readonly lastSave = this.requireElement<HTMLTimeElement>("[data-last-save-time]");
  private readonly wordCount = this.requireElement<HTMLElement>("[data-word-count]");
  private readonly characterCount = this.requireElement<HTMLElement>("[data-character-count]");
  private readonly lineCount = this.requireElement<HTMLElement>("[data-line-count]");
  private readonly documentFormat = this.requireElement<HTMLElement>("[data-document-format]");
  private readonly recentDocuments = this.requireElement<HTMLElement>("[data-recent-documents]");
  private readonly actionButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-document-action]"),
  );
  private busy = false;
  private closing = false;
  private recentActivePath: string | null | undefined;

  constructor(
    private readonly store: DocumentStore,
    private readonly files: FileService,
    private readonly dialog: AppDialog,
    private readonly templates: TemplateDialog,
    private readonly recoveryDrafts: RecoveryDraftService,
  ) {}

  async initialize(): Promise<void> {
    this.bindActions();
    const recoveryDraft = this.recoveryDrafts.load();
    if (recoveryDraft) {
      this.store.restoreDraft(
        recoveredDocumentName(recoveryDraft.name),
        recoveryDraft.content,
      );
    }
    this.store.subscribe((state) => {
      this.render();
      if (state.path !== this.recentActivePath) {
        this.recentActivePath = state.path;
        void this.refreshRecentDocuments();
      }
    });

    await getCurrentWindow().onCloseRequested(async (event) => {
      if (this.closing || !this.store.isDirty) return;
      event.preventDefault();
      if (this.busy) {
        await this.dialog.showError(
          "Opération en cours",
          "Terminez ou annulez l’opération de fichier avant de fermer l’application.",
        );
        return;
      }

      const canClose = await this.resolveCloseRequest();
      if (canClose) {
        this.closing = true;
        try {
          await getCurrentWindow().destroy();
        } catch (cause) {
          this.closing = false;
          await this.showFileError("Impossible de fermer l’application", cause);
        }
      }
    });
  }

  private bindActions(): void {
    this.editor.addEventListener("input", () => this.store.updateContent(this.editor.value));

    document.querySelector<HTMLButtonElement>(".new-document")?.addEventListener("click", () => {
      void this.openTemplateAssistant();
    });
    document.querySelector<HTMLButtonElement>("[data-template-open]")?.addEventListener("click", () => {
      void this.openTemplateAssistant();
    });
    document.querySelectorAll<HTMLButtonElement>("[data-template-quick]").forEach((button) => {
      button.addEventListener("click", () => void this.openTemplateAssistant(button.dataset.templateQuick));
    });
    document.querySelector<HTMLButtonElement>(".open-document")?.addEventListener("click", () => {
      void this.openDocument();
    });
    this.recentDocuments.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>("[data-recent-document-path]");
      if (button?.dataset.recentDocumentPath) {
        void this.openRecentDocument(button.dataset.recentDocumentPath);
      }
    });
    document.querySelector<HTMLButtonElement>(".save-document")?.addEventListener("click", () => {
      void this.saveCurrentDocument();
    });
    document.querySelector<HTMLButtonElement>(".save-document-as")?.addEventListener("click", () => {
      void this.saveCurrentDocumentAs();
    });

    document.addEventListener("keydown", (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        void (event.shiftKey ? this.saveCurrentDocumentAs() : this.saveCurrentDocument());
      } else if (key === "n") {
        event.preventDefault();
        void this.openTemplateAssistant();
      } else if (key === "o") {
        event.preventDefault();
        void this.openDocument();
      }
    });
  }

  private async openTemplateAssistant(initialTemplateId?: string): Promise<void> {
    if (this.busy) return;
    const selection = await this.templates.show(initialTemplateId);
    if (!selection) return;
    if (!(await this.resolveUnsavedChanges("créer un document depuis un modèle"))) return;
    const content = buildTemplateContent(selection.template, selection.genre);
    this.recoveryDrafts.clear();
    this.store.createFromTemplate(templateDocumentName(selection.template), content);
    this.editor.focus();
  }

  private async openDocument(): Promise<void> {
    if (!(await this.resolveUnsavedChanges("ouvrir un autre document"))) return;
    await this.runBusy(async () => {
      try {
        const document = await this.files.chooseDocumentToOpen();
        if (document) {
          this.recoveryDrafts.clear();
          this.store.load(document);
          this.editor.focus();
        }
      } catch (cause) {
        await this.showFileError("Impossible d’ouvrir le document", cause);
      }
    });
  }

  private async openRecentDocument(path: string): Promise<void> {
    if (this.busy) return;
    if (!(await this.resolveUnsavedChanges("ouvrir un autre document"))) return;
    await this.runBusy(async () => {
      try {
        const document = await this.files.openRecentDocument(path);
        this.recoveryDrafts.clear();
        this.store.load(document);
        this.editor.focus();
      } catch (cause) {
        await this.refreshRecentDocuments();
        await this.showFileError("Impossible d’ouvrir le document récent", cause);
      }
    });
  }

  private async saveCurrentDocument(): Promise<boolean> {
    if (this.busy) return false;
    const document = this.store.current;
    if (!document.path) return this.saveCurrentDocumentAs();

    return this.runBusy(async () =>
      this.writeDocument(
        { path: document.path!, name: document.name, exists: true },
        document.version,
        false,
      ),
    );
  }

  private async saveCurrentDocumentAs(): Promise<boolean> {
    if (this.busy) return false;
    return this.runBusy(async () => {
      try {
        const target = await this.files.chooseSavePath(this.store.current.name);
        if (!target) return false;

        let allowOverwrite = false;
        if (target.exists) {
          const action = await this.dialog.show({
            title: "Remplacer le fichier existant ?",
            message: `« ${target.name} » existe déjà. Son contenu sera remplacé uniquement si vous confirmez.`,
            actions: [
              { id: "cancel", label: "Annuler" },
              { id: "overwrite", label: "Remplacer", tone: "danger" },
            ],
          });
          if (action !== "overwrite") return false;
          allowOverwrite = true;
        }

        const expectedVersion = target.path === this.store.current.path ? this.store.current.version : null;
        return this.writeDocument(target, expectedVersion, allowOverwrite);
      } catch (cause) {
        await this.showFileError("Impossible de choisir la destination", cause);
        return false;
      }
    });
  }

  private async writeDocument(
    target: SaveTarget,
    expectedVersion: FileVersion | null,
    allowOverwrite: boolean,
  ): Promise<boolean> {
    try {
      const result = await this.files.save({
        path: target.path,
        content: this.store.current.content,
        expectedVersion,
        allowOverwrite,
      });
      this.store.markSaved(result);
      this.recoveryDrafts.clear();
      return true;
    } catch (cause) {
      if (
        cause instanceof FileServiceError &&
        (cause.code === "external_change" || cause.code === "already_exists") &&
        !allowOverwrite
      ) {
        const action = await this.dialog.show({
          title: "Le fichier a changé",
          message: cause.message,
          actions: [
            { id: "cancel", label: "Annuler" },
            { id: "overwrite", label: "Écraser quand même", tone: "danger" },
          ],
        });
        if (action === "overwrite") return this.writeDocument(target, expectedVersion, true);
        return false;
      }

      await this.showFileError("Enregistrement impossible", cause);
      return false;
    }
  }

  private async resolveUnsavedChanges(nextAction: string): Promise<boolean> {
    if (!this.store.isDirty) return true;

    const action = await this.dialog.show({
      title: "Modifications non sauvegardées",
      message: `Voulez-vous enregistrer « ${this.store.current.name} » avant de ${nextAction} ?`,
      actions: [
        { id: "cancel", label: "Annuler" },
        { id: "discard", label: "Ignorer", tone: "danger" },
        { id: "save", label: "Enregistrer", tone: "primary" },
      ],
    });

    if (action === "discard") return true;
    if (action === "save") return this.saveCurrentDocument();
    return false;
  }

  private async resolveCloseRequest(): Promise<boolean> {
    const action = await this.dialog.show({
      title: "Modifications non sauvegardées",
      message:
        `Voulez-vous enregistrer « ${this.store.current.name} » avant de fermer l’application ?\n\n` +
        "Si vous fermez sans enregistrer, un brouillon local sera restauré au prochain démarrage.",
      actions: [
        { id: "cancel", label: "Annuler" },
        { id: "recover", label: "Fermer sans enregistrer", tone: "danger" },
        { id: "save", label: "Enregistrer", tone: "primary" },
      ],
    });

    if (action === "save") return this.saveCurrentDocument();
    if (action !== "recover") return false;

    try {
      this.recoveryDrafts.save(this.store.current);
      return true;
    } catch (cause) {
      await this.showFileError("Brouillon de récupération impossible", cause);
      return false;
    }
  }

  private render(): void {
    const state = this.store.current;
    const dirty = this.store.isDirty;

    if (this.editor.value !== state.content) this.editor.value = state.content;
    this.title.textContent = displayDocumentName(state.name);
    this.title.title = state.path ?? "Document non enregistré";
    const isUnsaved = !state.path;
    this.documentStatus.textContent = dirty
      ? "Modifié"
      : isUnsaved
        ? "Nouveau document"
        : "Enregistré";
    this.saveDots.forEach((dot) => {
      dot.classList.toggle("is-dirty", dirty);
      dot.classList.toggle("is-unsaved", isUnsaved && !dirty);
    });
    if (state.lastSavedAt) {
      const savedDate = state.lastSavedAt.toLocaleDateString("fr-CA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const savedTime = state.lastSavedAt.toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      this.lastSave.textContent = `${savedDate} à ${savedTime}`;
      this.lastSave.dateTime = state.lastSavedAt.toISOString();
      this.lastSave.title = state.lastSavedAt.toLocaleString("fr-CA", {
        dateStyle: "full",
        timeStyle: "medium",
        hour12: false,
      });
    } else {
      this.lastSave.textContent = "—";
      this.lastSave.removeAttribute("datetime");
      this.lastSave.removeAttribute("title");
    }

    const trimmed = state.content.trim();
    const words = trimmed ? trimmed.split(/\s+/u).length : 0;
    const lines = state.content ? state.content.split(/\r\n|\r|\n/u).length : 1;
    this.wordCount.textContent = `${words.toLocaleString("fr-CA")} mot${words === 1 ? "" : "s"}`;
    this.characterCount.textContent = `${state.content.length.toLocaleString("fr-CA")} caractères`;
    this.lineCount.textContent = `${lines.toLocaleString("fr-CA")} ligne${lines === 1 ? "" : "s"}`;

    const extension = state.name.split(".").pop()?.toLowerCase();
    const format = extension === "txt"
      ? { full: "Texte", short: "TXT" }
      : extension === "md"
        ? { full: "Markdown", short: "MD" }
        : { full: "Document", short: "DOC" };
    this.documentFormat.textContent = format.full;
    this.documentFormat.dataset.shortLabel = format.short;
  }

  private async refreshRecentDocuments(): Promise<void> {
    try {
      this.renderRecentDocuments(await this.files.listRecentDocuments());
    } catch {
      this.renderRecentDocuments([]);
    }
  }

  private renderRecentDocuments(documents: RecentDocument[]): void {
    if (documents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "sidebar-empty";
      empty.textContent = "Aucun document récent.";
      this.recentDocuments.replaceChildren(empty);
      return;
    }

    const cards = documents.map((recent) => {
      const button = document.createElement("button");
      button.className = "document-card";
      button.classList.toggle("is-active", recent.path === this.store.current.path);
      button.type = "button";
      button.dataset.recentDocumentPath = recent.path;
      button.title = recent.path;

      const documentIcon = document.createElement("span");
      documentIcon.className = "document-icon";
      documentIcon.innerHTML = icon("document");

      const copy = document.createElement("span");
      copy.className = "document-copy";
      const title = document.createElement("strong");
      title.textContent = displayDocumentName(recent.name);
      const details = document.createElement("span");
      const time = document.createElement("time");
      time.dateTime = new Date(recent.modifiedMillis).toISOString();
      time.textContent = this.formatRecentDate(recent.modifiedMillis);
      const format = document.createElement("em");
      format.textContent = recent.name.toLowerCase().endsWith(".txt") ? "TXT" : "MD";
      details.append(time, format);
      copy.append(title, details);

      button.append(documentIcon, copy);
      button.insertAdjacentHTML("beforeend", icon("chevronRight"));
      return button;
    });
    this.recentDocuments.replaceChildren(...cards);
  }

  private formatRecentDate(modifiedMillis: number): string {
    const modified = new Date(modifiedMillis);
    const today = new Date();
    if (modified.toDateString() === today.toDateString()) {
      return modified.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
    }
    return modified.toLocaleDateString("fr-CA", { day: "2-digit", month: "short" });
  }

  private async showFileError(title: string, cause: unknown): Promise<void> {
    const message = cause instanceof Error ? cause.message : "Une erreur inconnue est survenue.";
    await this.dialog.showError(title, message);
  }

  private async runBusy<T>(operation: () => Promise<T>): Promise<T> {
    this.setBusy(true);
    try {
      return await operation();
    } finally {
      this.setBusy(false);
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.actionButtons.forEach((button) => {
      button.disabled = busy;
    });
    this.recentDocuments.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.disabled = busy;
    });
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de document introuvable : ${selector}`);
    return element;
  }
}
