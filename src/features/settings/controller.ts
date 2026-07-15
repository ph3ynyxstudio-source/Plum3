import { getTauriVersion, getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getLocale, setLocale, subscribeLocale, t, type Locale } from "../../i18n/i18n";
import type { AppDialog } from "../../ui/app-dialog";

const STUDIO_URL = "https://ph3ynyx.dev/";
const FEEDBACK_RECIPIENT = "phey.rainville@hotmail.com";

export function buildFeedbackEmailUrl(version: string): string {
  const subject = t("feedback.emailSubject", { version });
  const body = [
    t("feedback.emailType"),
    t("feedback.emailTypeOptions"),
    "",
    t("feedback.emailDescription"),
    "",
    t("feedback.emailSteps"),
    "",
    t("feedback.emailExpected"),
    "",
    t("feedback.emailAppVersion"),
    version,
    "",
    t("feedback.emailWindowsVersion"),
    "",
  ].join("\r\n");

  return `mailto:${FEEDBACK_RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

interface AppInfo {
  os: string;
  arch: string;
}

export class SettingsController {
  private readonly backdrop = this.requireElement<HTMLElement>("[data-settings-dialog]");
  private readonly settingsView = this.requireElement<HTMLElement>('[data-settings-view="settings"]');
  private readonly aboutView = this.requireElement<HTMLElement>('[data-settings-view="about"]');
  private readonly localeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-locale-option]"));
  private readonly versionElement = this.requireElement<HTMLElement>("[data-about-version]");
  private readonly systemElement = this.requireElement<HTMLElement>("[data-about-system]");
  private readonly tauriElement = this.requireElement<HTMLElement>("[data-about-tauri]");
  private readonly copyStatus = this.requireElement<HTMLElement>("[data-about-copy-status]");
  private opener: HTMLElement | null = null;
  private version = "—";
  private tauriVersion = "—";
  private appInfo: AppInfo = { os: "Windows", arch: "—" };

  constructor(private readonly dialog: AppDialog) {}

  initialize(): void {
    document.querySelector<HTMLButtonElement>("[data-settings-open]")?.addEventListener("click", () => this.open());
    document.querySelector<HTMLButtonElement>("[data-settings-close]")?.addEventListener("click", () => this.close());
    document.querySelector<HTMLButtonElement>("[data-about-open]")?.addEventListener("click", () => this.showAbout());
    document.querySelector<HTMLButtonElement>("[data-about-back]")?.addEventListener("click", () => this.showSettings());
    document.querySelector<HTMLButtonElement>("[data-about-copy]")?.addEventListener("click", () => void this.copyInfo());
    document.querySelector<HTMLButtonElement>("[data-about-licenses]")?.addEventListener("click", () => void this.showLicenses());
    document.querySelector<HTMLButtonElement>("[data-feedback-email]")?.addEventListener("click", () => void this.sendFeedback());
    document.querySelector<HTMLAnchorElement>("[data-about-studio-url]")?.addEventListener("click", (event) => {
      event.preventDefault();
      void this.openStudioWebsite();
    });
    this.localeButtons.forEach((button) => {
      button.addEventListener("click", () => setLocale(button.dataset.localeOption as Locale));
    });
    this.backdrop.addEventListener("click", (event) => {
      if (event.target === this.backdrop) this.close();
    });
    document.addEventListener("keydown", (event) => {
      if (this.backdrop.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
      if (event.key === "Tab") this.trapFocus(event);
    });
    subscribeLocale(() => this.render());
    this.render();
    void this.loadInfo();
  }

  private open(): void {
    this.opener = document.activeElement as HTMLElement | null;
    this.showSettings();
    this.backdrop.hidden = false;
    queueMicrotask(() => this.localeButtons.find((button) => button.dataset.localeOption === getLocale())?.focus());
  }

  private close(): void {
    this.backdrop.hidden = true;
    this.copyStatus.textContent = "";
    this.opener?.focus();
  }

  private showSettings(): void {
    this.settingsView.hidden = false;
    this.aboutView.hidden = true;
  }

  private showAbout(): void {
    this.settingsView.hidden = true;
    this.aboutView.hidden = false;
    queueMicrotask(() => this.aboutView.querySelector<HTMLButtonElement>("button")?.focus());
  }

  private async loadInfo(): Promise<void> {
    try {
      [this.version, this.tauriVersion, this.appInfo] = await Promise.all([
        getVersion(),
        getTauriVersion(),
        invoke<AppInfo>("get_app_info"),
      ]);
    } catch {
      // The web preview has no Tauri runtime; placeholders remain readable.
    }
    this.render();
  }

  private render(): void {
    this.localeButtons.forEach((button) => {
      const selected = button.dataset.localeOption === getLocale();
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(selected));
    });
    this.versionElement.textContent = t("about.version", { version: this.version });
    this.systemElement.textContent = t("about.system", { os: this.appInfo.os, arch: this.appInfo.arch });
    this.tauriElement.textContent = t("about.tauri", { version: this.tauriVersion });
    this.requireElement<HTMLElement>("[data-about-year]").textContent = String(new Date().getFullYear());
  }

  private async copyInfo(): Promise<void> {
    const text = [
      `Plum3 ${this.version}`,
      `Tauri ${this.tauriVersion}`,
      `${this.appInfo.os} (${this.appInfo.arch})`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      this.copyStatus.textContent = t("about.copied");
    } catch {
      this.copyStatus.textContent = t("about.copyFailed");
    }
  }

  private async showLicenses(): Promise<void> {
    await this.dialog.show({
      title: t("about.licenses"),
      message: t("about.licenseMessage"),
      actions: [{ id: "ok", label: t("common.understood"), tone: "primary" }],
    });
  }

  private async openStudioWebsite(): Promise<void> {
    try {
      await openUrl(STUDIO_URL);
    } catch {
      this.copyStatus.textContent = t("about.websiteFailed");
    }
  }

  private async sendFeedback(): Promise<void> {
    try {
      const version = this.version === "—" ? await getVersion() : this.version;
      this.version = version;
      await openUrl(buildFeedbackEmailUrl(version));
    } catch {
      await this.dialog.showError(t("feedback.errorTitle"), t("feedback.errorMessage"));
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.backdrop.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'),
    ).filter((element) => !element.closest<HTMLElement>("[hidden]"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément de paramètres introuvable : ${selector}`);
    return element;
  }
}
