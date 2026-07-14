import { subscribeLocale, t } from "../../i18n/i18n";

export class FocusModeController {
  private readonly shell = this.requireElement<HTMLElement>(".app-shell");
  private readonly toggle = this.requireElement<HTMLButtonElement>("[data-focus-mode-toggle]");
  private readonly label = this.requireElement<HTMLElement>("[data-focus-mode-label]");
  private readonly editor = this.requireElement<HTMLTextAreaElement>("[data-document-editor]");
  private active = false;

  initialize(): void {
    this.toggle.addEventListener("click", () => this.setActive(!this.active));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !this.active) return;
      event.preventDefault();
      this.setActive(false);
    });
    subscribeLocale(() => this.render());
    this.render();
  }

  private setActive(active: boolean): void {
    this.active = active;
    this.shell.classList.toggle("is-focus-mode", active);
    this.render();
    if (active && !this.editor.hidden) this.editor.focus();
    if (!active) this.toggle.focus();
  }

  private render(): void {
    this.toggle.setAttribute("aria-pressed", String(this.active));
    this.toggle.setAttribute("aria-label", this.active ? t("focus.disableLabel") : t("focus.enableLabel"));
    this.label.textContent = this.active ? t("focus.disable") : t("focus.enable");
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément du mode concentration introuvable : ${selector}`);
    return element;
  }
}
