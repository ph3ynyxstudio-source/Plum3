import { invoke } from "@tauri-apps/api/core";
import type { DocumentStore } from "../../documents/document-state";
import { t } from "../../i18n/i18n";
import { isAndroid } from "../../platform/platform";
import { AppDialog } from "../../ui/app-dialog";

interface MarkdownShareRequest {
  sourceName: string;
  content: string;
  chooserTitle: string;
}

interface MarkdownShareResult {
  name: string;
}

export type MarkdownShareInvoker = (
  request: MarkdownShareRequest,
) => Promise<MarkdownShareResult>;

const invokeMarkdownShare: MarkdownShareInvoker = (request) =>
  invoke<MarkdownShareResult>("share_markdown_document", { request });

export class MarkdownShareController {
  private readonly button: HTMLButtonElement | null;
  private readonly label: HTMLElement | null;
  private busy = false;

  constructor(
    private readonly store: DocumentStore,
    private readonly dialog: AppDialog,
    private readonly invokeShare: MarkdownShareInvoker = invokeMarkdownShare,
    private readonly android = isAndroid(),
    root: ParentNode = document,
  ) {
    this.button = root.querySelector<HTMLButtonElement>("[data-share-markdown]");
    this.label = this.button?.querySelector<HTMLElement>("[data-share-markdown-label]") ?? null;
  }

  initialize(): void {
    if (!this.android || !this.button || !this.label) return;
    this.button.hidden = false;
    this.button.addEventListener("click", () => {
      void this.share();
    });
  }

  private async share(): Promise<void> {
    if (this.busy || !this.button || !this.label) return;
    const current = this.store.current;
    this.setBusy(true);
    try {
      await this.invokeShare({
        sourceName: current.name,
        content: current.content,
        chooserTitle: t("share.chooserTitle"),
      });
    } catch {
      await this.dialog.showError(t("share.failed"), t("share.failedMessage"));
    } finally {
      this.setBusy(false);
    }
  }

  private setBusy(busy: boolean): void {
    if (!this.button || !this.label) return;
    this.busy = busy;
    this.button.disabled = busy;
    this.button.setAttribute("aria-busy", String(busy));
    this.label.textContent = t(busy ? "share.preparing" : "share.markdown");
  }
}
