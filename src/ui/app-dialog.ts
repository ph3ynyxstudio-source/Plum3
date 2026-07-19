export interface DialogAction {
  id: string;
  label: string;
  tone?: "primary" | "danger" | "neutral";
}

export interface DialogOptions {
  title: string;
  message: string;
  actions: DialogAction[];
  input?: {
    label: string;
    value: string;
    maxLength?: number;
  };
}

export class AppDialog {
  private readonly backdrop: HTMLElement;
  private readonly title: HTMLElement;
  private readonly message: HTMLElement;
  private readonly inputField: HTMLLabelElement;
  private readonly inputLabel: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly actions: HTMLElement;

  constructor() {
    this.backdrop = this.requireElement("[data-app-dialog]");
    this.title = this.requireElement("[data-dialog-title]");
    this.message = this.requireElement("[data-dialog-message]");
    this.inputField = this.requireElement("[data-dialog-input-field]");
    this.inputLabel = this.requireElement("[data-dialog-input-label]");
    this.input = this.requireElement("[data-dialog-input]");
    this.actions = this.requireElement("[data-dialog-actions]");
  }

  show(options: DialogOptions): Promise<string> {
    this.title.textContent = options.title;
    this.message.textContent = options.message;
    this.inputField.hidden = !options.input;
    if (options.input) {
      this.inputLabel.textContent = options.input.label;
      this.input.value = options.input.value;
      this.input.maxLength = options.input.maxLength ?? 255;
    }
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
        if (event.key === "Enter" && options.input) {
          event.preventDefault();
          finish("confirm");
        }
      };

      options.actions.forEach((action, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `dialog-action is-${action.tone ?? "neutral"}`;
        button.textContent = action.label;
        button.addEventListener("click", () => finish(action.id), { once: true });
        this.actions.append(button);
        if (index === 0) {
          queueMicrotask(() => options.input ? this.input.focus() : button.focus());
        }
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

  async prompt(options: {
    title: string;
    message: string;
    label: string;
    value: string;
    confirmLabel: string;
  }): Promise<string | null> {
    const action = await this.show({
      title: options.title,
      message: options.message,
      input: {
        label: options.label,
        value: options.value,
      },
      actions: [
        { id: "cancel", label: t("common.cancel") },
        { id: "confirm", label: options.confirmLabel, tone: "primary" },
      ],
    });
    return action === "confirm" ? this.input.value : null;
  }

  private requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de dialogue introuvable : ${selector}`);
    return element;
  }
}
import { t } from "../i18n/i18n";
