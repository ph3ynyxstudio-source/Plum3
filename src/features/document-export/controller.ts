import { invoke } from "@tauri-apps/api/core";
import type { DocumentStore } from "../../documents/document-state";
import { AppDialog } from "../../ui/app-dialog";
import { getLocale, t } from "../../i18n/i18n";
import { isAndroid } from "../../platform/platform";

type ExportFormat = "pdf" | "docx";
type ExportFontKind = "serif" | "sans" | "mono";

interface ExportResult {
  path: string;
  name: string;
  exportId?: string;
  mimeType?: string;
}

interface ExportRequest {
  format: ExportFormat;
  sourceName: string;
  content: string;
  style: {
    fontKind: ExportFontKind;
    fontSize: number;
    lineHeight: number;
    textColor: string;
  };
  locale: string;
}

export type ExportInvoker = (request: ExportRequest) => Promise<ExportResult | null>;
export type ExportShareInvoker = (exportId: string, chooserTitle: string) => Promise<void>;

const invokeExport: ExportInvoker = (request) => invoke<ExportResult | null>("export_document", { request });
const invokeExportShare: ExportShareInvoker = (exportId, chooserTitle) =>
  invoke<void>("share_exported_document", {
    request: { exportId, chooserTitle },
  });

function errorCode(cause: unknown): string | null {
  if (typeof cause === "object" && cause !== null && "code" in cause) {
    const code = (cause as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  if (typeof cause !== "string") return null;
  try {
    const parsed = JSON.parse(cause) as { code?: unknown };
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

export function exportErrorMessage(cause: unknown): string {
  switch (errorCode(cause)) {
    case "export_write_error":
      return t("export.writeFailed");
    case "pdf_generation_error":
      return t("export.pdfFailed");
    case "docx_generation_error":
      return t("export.docxFailed");
    case "export_share_error":
      return t("export.shareFailedMessage");
    default:
      return t("error.unexpected");
  }
}

export class DocumentExportController {
  private readonly section = this.requireElement<HTMLElement>("[data-document-export]");
  private readonly editor = this.requireElement<HTMLTextAreaElement>("[data-document-editor]");
  private readonly status = this.requireElement<HTMLElement>("[data-export-status]");
  private readonly menuButton = this.requireElement<HTMLButtonElement>("[data-export-open]");
  private readonly buttons = Array.from(
    this.section.querySelectorAll<HTMLButtonElement>("[data-export-format]"),
  );
  private busy = false;

  constructor(
    private readonly store: DocumentStore,
    private readonly dialog: AppDialog,
    private readonly invokeDocumentExport: ExportInvoker = invokeExport,
    private readonly android = isAndroid(),
    private readonly invokeShareExport: ExportShareInvoker = invokeExportShare,
  ) {}

  initialize(): void {
    if (this.android) {
      this.buttons
        .filter((button) => button.dataset.exportFormat === "pdf")
        .forEach((button) => {
          button.disabled = true;
          button.hidden = true;
        });
      this.status.textContent = t("android.exportInfo");
    }
    this.buttons.forEach((button) => {
      if (this.android && button.dataset.exportFormat === "pdf") return;
      button.addEventListener("click", () => {
        void this.export(button.dataset.exportFormat as ExportFormat);
      });
    });
    this.menuButton.addEventListener("click", () => {
      void this.chooseFormat();
    });
  }

  private async chooseFormat(): Promise<void> {
    if (this.busy) return;
    const formatActions = this.android
      ? [{ id: "docx", label: t("export.asDocx"), tone: "primary" as const }]
      : [
          { id: "pdf", label: t("export.asPdf"), tone: "primary" as const },
          { id: "docx", label: t("export.asDocx"), tone: "primary" as const },
        ];
    const action = await this.dialog.show({
      title: t("export.title"),
      message: t("export.chooseFormat"),
      actions: [
        { id: "cancel", label: t("common.cancel") },
        ...formatActions,
      ],
    });
    if (action === "pdf" || action === "docx") await this.export(action);
  }

  private async export(format: ExportFormat): Promise<void> {
    const document = this.store.current;
    if (this.busy) return;

    this.setBusy(true);
    this.status.textContent = format === "pdf" ? t("export.pdfCreating") : t("export.wordCreating");
    try {
      const result = await this.invokeDocumentExport({
        format,
        sourceName: document.name,
        content: document.content,
        style: this.readCurrentStyle(),
        locale: getLocale(),
      });
      this.status.textContent = result
        ? t("export.created", { name: result.name })
        : t("export.cancelled");
      if (result) {
        if (result.path) this.status.title = result.path;
        else this.status.removeAttribute("title");
        await this.showCompletion(result);
      } else {
        this.status.removeAttribute("title");
      }
    } catch (cause) {
      this.status.textContent = t("export.failed");
      this.status.removeAttribute("title");
      await this.dialog.showError(t("export.failed"), exportErrorMessage(cause));
    } finally {
      this.setBusy(false);
    }
  }

  private async showCompletion(result: ExportResult): Promise<void> {
    if (!this.android || !result.exportId) {
      await this.dialog.show({
        title: t("export.createdTitle"),
        message: t("export.created", { name: result.name }),
        actions: [{ id: "ok", label: t("common.understood"), tone: "primary" }],
      });
      return;
    }

    const action = await this.dialog.show({
      title: t("export.createdTitle"),
      message: `${t("export.created", { name: result.name })}\n\n${t("export.savedIndependent")}`,
      actions: [
        { id: "close", label: t("common.close") },
        { id: "share", label: t("export.share"), tone: "primary" },
      ],
    });
    if (action !== "share") return;
    try {
      await this.invokeShareExport(result.exportId, t("export.shareChooserTitle"));
    } catch {
      await this.dialog.showError(t("export.shareFailed"), t("export.shareFailedMessage"));
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
      button.disabled =
        busy || (this.android && button.dataset.exportFormat === "pdf");
    });
    this.menuButton.disabled = busy;
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément d’export introuvable : ${selector}`);
    return element;
  }
}
