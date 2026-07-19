import type { DocumentController } from "../../documents/document-controller";
import type { DocumentStore } from "../../documents/document-state";
import { RecoveryDraftService } from "../../documents/recovery-draft";
import { subscribeLocale, t } from "../../i18n/i18n";
import { isAndroid } from "../../platform/platform";

const STORAGE_KEY = "plum3.autosave.v1";
const DELAY_MS = 2_000;

export class AutosaveController {
  private readonly toggle = this.requireElement<HTMLButtonElement>("[data-autosave-toggle]");
  private readonly label = this.requireElement<HTMLElement>("[data-autosave-toggle] span");
  private readonly status = this.requireElement<HTMLElement>("[data-autosave-status]");
  private enabled = this.load();
  private timer: number | null = null;
  private paused = false;

  constructor(
    private readonly store: DocumentStore,
    private readonly documents: DocumentController,
    private readonly recoveryDrafts: RecoveryDraftService,
    private readonly android = isAndroid(),
  ) {}

  initialize(): void {
    if (this.android) {
      this.enabled = true;
      this.toggle.disabled = true;
      this.render();
      return;
    }
    this.toggle.addEventListener("click", () => {
      this.enabled = !this.enabled;
      this.paused = false;
      localStorage.setItem(STORAGE_KEY, String(this.enabled));
      this.render();
      this.schedule();
    });
    this.store.subscribe(() => this.schedule());
    subscribeLocale(() => this.render());
    this.render();
  }

  private schedule(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    if (!this.enabled || this.paused || !this.store.isDirty) {
      this.render();
      return;
    }
    this.timer = window.setTimeout(() => void this.save(), DELAY_MS);
  }

  private async save(): Promise<void> {
    this.timer = null;
    const state = this.store.current;
    if (!this.enabled || !this.store.isDirty) return;
    if (!state.path) {
      try {
        this.recoveryDrafts.save(state);
        this.status.textContent = t("autosave.draftOnly");
      } catch {
        this.paused = true;
        this.status.textContent = t("autosave.paused");
      }
      return;
    }
    this.status.textContent = t("autosave.saving");
    const saved = await this.documents.autosaveCurrentDocument();
    if (saved) {
      this.status.textContent = t("autosave.saved");
    } else if (this.store.isDirty) {
      this.paused = true;
      this.status.textContent = t("autosave.paused");
    }
  }

  private render(): void {
    this.toggle.classList.toggle("is-on", this.enabled);
    this.toggle.setAttribute("aria-checked", String(this.enabled));
    this.label.textContent = this.enabled ? t("autosave.enabled") : t("autosave.disabled");
    if (this.paused) this.status.textContent = t("autosave.paused");
    else if (!this.store.current.path) this.status.textContent = t("autosave.draftOnly");
    else if (!this.enabled) this.status.textContent = t("autosave.description");
  }

  private load(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément d’autosauvegarde introuvable : ${selector}`);
    return element;
  }
}
