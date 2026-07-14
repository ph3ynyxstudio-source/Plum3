export interface DialogAction {
  id: string;
  label: string;
  tone?: "primary" | "danger" | "neutral";
}

export interface DialogOptions {
  title: string;
  message: string;
  actions: DialogAction[];
}

export class AppDialog {
  private readonly backdrop: HTMLElement;
  private readonly title: HTMLElement;
  private readonly message: HTMLElement;
  private readonly actions: HTMLElement;

  constructor() {
    this.backdrop = this.requireElement("[data-app-dialog]");
    this.title = this.requireElement("[data-dialog-title]");
    this.message = this.requireElement("[data-dialog-message]");
    this.actions = this.requireElement("[data-dialog-actions]");
  }

  show(options: DialogOptions): Promise<string> {
    this.title.textContent = options.title;
    this.message.textContent = options.message;
    this.actions.replaceChildren();
    this.backdrop.hidden = false;

    return new Promise((resolve) => {
      const finish = (action: string) => {
        this.backdrop.hidden = true;
        document.removeEventListener("keydown", onKeyDown);
        resolve(action);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") finish("cancel");
      };

      options.actions.forEach((action, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `dialog-action is-${action.tone ?? "neutral"}`;
        button.textContent = action.label;
        button.addEventListener("click", () => finish(action.id), { once: true });
        this.actions.append(button);
        if (index === 0) queueMicrotask(() => button.focus());
      });

      document.addEventListener("keydown", onKeyDown);
    });
  }

  async showError(title: string, message: string): Promise<void> {
    await this.show({
      title,
      message,
      actions: [{ id: "ok", label: t("common.understood"), tone: "primary" }],
    });
  }

  private requireElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Élément de dialogue introuvable : ${selector}`);
    return element;
  }
}
import { t } from "../i18n/i18n";
