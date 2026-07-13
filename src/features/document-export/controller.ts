import { invoke } from "@tauri-apps/api/core";
import type { DocumentStore } from "../../documents/document-state";
import { AppDialog } from "../../ui/app-dialog";

type ExportFormat = "pdf" | "docx";
type ExportFontKind = "serif" | "sans" | "mono";

interface ExportResult {
  path: string;
  name: string;
}

interface ExportErrorValue {
  code?: unknown;
  message?: unknown;
}

export class DocumentExportController {
  private readonly section = this.requireElement<HTMLElement>("[data-document-export]");
  private readonly editor = this.requireElement<HTMLTextAreaElement>("[data-document-editor]");
  private readonly status = this.requireElement<HTMLElement>("[data-export-status]");
  private readonly buttons = Array.from(
    this.section.querySelectorAll<HTMLButtonElement>("[data-export-format]"),
  );
  private busy = false;

  constructor(
    private readonly store: DocumentStore,
    private readonly dialog: AppDialog,
  ) {}

  initialize(): void {
    this.buttons.forEach((button) => {
      button.addEventListener("click", () => {
        void this.export(button.dataset.exportFormat as ExportFormat);
      });
    });
    this.store.subscribe((state) => {
      const hasOpenDocument = state.path !== null;
      this.section.hidden = !hasOpenDocument;
      if (!hasOpenDocument) this.status.textContent = "";
    });
  }

  private async export(format: ExportFormat): Promise<void> {
    const document = this.store.current;
    if (this.busy || !document.path) return;

    this.setBusy(true);
    this.status.textContent = format === "pdf" ? "Création du PDF…" : "Création du document Word…";
    try {
      const result = await invoke<ExportResult | null>("export_document", {
        request: {
          format,
          sourceName: document.name,
          content: document.content,
          style: this.readCurrentStyle(),
        },
      });
      this.status.textContent = result
        ? `Copie créée : ${result.name}`
        : "Export annulé.";
      if (result) this.status.title = result.path;
    } catch (cause) {
      this.status.textContent = "Export impossible.";
      await this.dialog.showError(
        "Export impossible",
        this.errorMessage(cause),
      );
    } finally {
      this.setBusy(false);
    }
  }

  private readCurrentStyle(): {
    fontKind: ExportFontKind;
    fontSize: number;
    lineHeight: number;
    textColor: string;
  } {
    const computed = getComputedStyle(this.editor);
    const fontSize = Number.parseFloat(computed.fontSize) || 18;
    const lineHeightPixels = Number.parseFloat(computed.lineHeight);
    return {
      fontKind: this.fontKind(computed.fontFamily),
      fontSize: fontSize * 0.75,
      lineHeight: Number.isFinite(lineHeightPixels) ? lineHeightPixels / fontSize : 1.7,
      textColor: this.toHexColor(computed.color),
    };
  }

  private fontKind(fontFamily: string): ExportFontKind {
    const normalized = fontFamily.toLowerCase();
    if (/mono|consolas|courier|code/u.test(normalized)) return "mono";
    if (/sans|inter|atkinson|arial|helvetica/u.test(normalized)) return "sans";
    return "serif";
  }

  private toHexColor(color: string): string {
    const channels = color.match(/\d+(?:\.\d+)?/gu)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) return "#302c34";
    return `#${channels
      .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    this.buttons.forEach((button) => {
      button.disabled = busy;
    });
  }

  private errorMessage(cause: unknown): string {
    if (cause && typeof cause === "object") {
      const value = cause as ExportErrorValue;
      if (typeof value.message === "string") return value.message;
    }
    if (typeof cause === "string") {
      try {
        const value = JSON.parse(cause) as ExportErrorValue;
        if (typeof value.message === "string") return value.message;
      } catch {
        return cause;
      }
    }
    return "Une erreur inattendue empêche la création de la copie exportée.";
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément d’export introuvable : ${selector}`);
    return element;
  }
}
