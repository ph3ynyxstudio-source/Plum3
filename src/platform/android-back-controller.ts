import { onBackButtonPress } from "@tauri-apps/api/app";
import { invoke, type PluginListener } from "@tauri-apps/api/core";
import { isAndroid } from "./platform";

export type AndroidBackRegistrar = typeof onBackButtonPress;
export type AppCloseRequester = () => Promise<void>;

const requestAppClose: AppCloseRequester = () => invoke("close_android_app");

export class AndroidBackController {
  private listener: PluginListener | null = null;

  constructor(
    private readonly android = isAndroid(),
    private readonly registerBackButton: AndroidBackRegistrar = onBackButtonPress,
    private readonly closeApp: AppCloseRequester = requestAppClose,
  ) {}

  async initialize(): Promise<boolean> {
    if (!this.android) return false;
    if (this.listener) return true;
    return this.register();
  }

  private async register(): Promise<boolean> {
    try {
      this.listener = await this.registerBackButton(() => this.handleBack());
      return true;
    } catch (cause) {
      console.error("Impossible d’enregistrer le bouton Retour Android.", cause);
      return false;
    }
  }

  private handleBack(): void {
    const appDialog = document.querySelector<HTMLElement>("[data-app-dialog]");
    if (this.isVisible(appDialog)) {
      appDialog.querySelector<HTMLButtonElement>("[data-dialog-actions] button")?.click();
      return;
    }

    const templateDialog = document.querySelector<HTMLElement>("[data-template-dialog]");
    if (this.isVisible(templateDialog)) {
      templateDialog.querySelector<HTMLButtonElement>("[data-template-cancel]")?.click();
      return;
    }

    const settingsDialog = document.querySelector<HTMLElement>("[data-settings-dialog]");
    if (this.isVisible(settingsDialog)) {
      const aboutView = settingsDialog.querySelector<HTMLElement>('[data-settings-view="about"]');
      const selector = this.isVisible(aboutView) ? "[data-about-back]" : "[data-settings-close]";
      settingsDialog.querySelector<HTMLButtonElement>(selector)?.click();
      return;
    }

    const titleInput = document.querySelector<HTMLInputElement>("[data-document-title-input]");
    if (this.isVisible(titleInput)) {
      titleInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return;
    }

    const shell = document.querySelector<HTMLElement>(".app-shell");
    if (shell?.classList.contains("is-focus-mode")) {
      document.querySelector<HTMLButtonElement>("[data-focus-mode-toggle]")?.click();
      return;
    }
    if (shell?.classList.contains("is-mobile-writing-open")) {
      document.querySelector<HTMLButtonElement>(".mobile-writing-close")?.click();
      return;
    }
    if (shell?.classList.contains("is-mobile-left-open")) {
      document.querySelector<HTMLButtonElement>(".collapse-left")?.click();
      return;
    }
    if (shell?.dataset.mobileView === "editor") {
      document.dispatchEvent(new CustomEvent("plum3:request-library"));
      return;
    }

    void this.closeApp().catch((cause) => {
      console.error("Impossible de fermer Plum3 depuis la bibliothèque Android.", cause);
    });
  }

  private isVisible(element: HTMLElement | null): element is HTMLElement {
    return Boolean(element && !element.hidden);
  }
}
