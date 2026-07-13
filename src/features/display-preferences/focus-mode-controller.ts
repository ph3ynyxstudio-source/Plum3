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
  }

  private setActive(active: boolean): void {
    this.active = active;
    this.shell.classList.toggle("is-focus-mode", active);
    this.toggle.setAttribute("aria-pressed", String(active));
    this.toggle.setAttribute("aria-label", active ? "Quitter le mode concentration" : "Activer le mode concentration");
    this.label.textContent = active ? "Quitter" : "Activer";
    if (active && !this.editor.hidden) this.editor.focus();
    if (!active) this.toggle.focus();
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément du mode concentration introuvable : ${selector}`);
    return element;
  }
}
