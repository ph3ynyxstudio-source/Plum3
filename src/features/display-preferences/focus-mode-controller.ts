import { onBackButtonPress } from "@tauri-apps/api/app";
import type { PluginListener } from "@tauri-apps/api/core";
import { subscribeLocale, t } from "../../i18n/i18n";
import { isAndroid } from "../../platform/platform";

export type AndroidBackRegistrar = typeof onBackButtonPress;

export class FocusModeController {
  private readonly shell = this.requireElement<HTMLElement>(".app-shell");
  private readonly toggle = this.requireElement<HTMLButtonElement>("[data-focus-mode-toggle]");
  private readonly label = this.requireElement<HTMLElement>("[data-focus-mode-label]");
  private readonly editor = this.requireElement<HTMLTextAreaElement>("[data-document-editor]");
  private active = false;
  private backButtonListener: PluginListener | null = null;

  constructor(
    private readonly android = isAndroid(),
    private readonly registerBackButton: AndroidBackRegistrar = onBackButtonPress,
  ) {}

  initialize(): void {
    this.toggle.addEventListener("click", () => void this.setActive(!this.active));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !this.active) return;
      event.preventDefault();
      void this.setActive(false);
    });
    subscribeLocale(() => this.render());
    this.render();
  }

  private async setActive(active: boolean): Promise<void> {
    this.active = active;
    this.shell.classList.toggle("is-focus-mode", active);
    document.dispatchEvent(new CustomEvent("plum3:focus-change", { detail: { active } }));
    this.render();
    await this.syncAndroidBackButton();
    if (active && !this.editor.hidden) this.editor.focus();
    if (!active) this.toggle.focus();
  }

  private async syncAndroidBackButton(): Promise<void> {
    if (!this.android) return;
    if (!this.active) {
      await this.backButtonListener?.unregister();
      this.backButtonListener = null;
      return;
    }
    if (this.backButtonListener) return;
    try {
      this.backButtonListener = await this.registerBackButton(() => void this.setActive(false));
    } catch {
      // Le bouton de sortie reste disponible si l’API native n’est pas joignable.
    }
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
