import "./styles.css";
import { renderAppShell } from "./components/app-shell";
import { DocumentController } from "./documents/document-controller";
import { DocumentStore } from "./documents/document-state";
import { FileService } from "./services/file-service";
import { applyTheme, getInitialTheme, type ThemeName } from "./theme/theme";
import { AppDialog } from "./ui/app-dialog";
import { TemplateDialog } from "./templates/template-dialog";
import { RecoveryDraftService } from "./documents/recovery-draft";
import { WritingPreferencesController } from "./features/writing-preferences/controller";
import { WritingPreferencesStorage } from "./features/writing-preferences/storage";
import { DocumentRenameController } from "./documents/document-rename-controller";
import { DisplayPreferencesController } from "./features/display-preferences/controller";
import { DisplayPreferencesStorage } from "./features/display-preferences/storage";
import { FocusModeController } from "./features/display-preferences/focus-mode-controller";
import { DocumentExportController } from "./features/document-export/controller";
import { SettingsController } from "./features/settings/controller";
import { t, translateDocument } from "./i18n/i18n";
import { AutosaveController } from "./features/autosave/controller";
import { applyPlatformMarker } from "./platform/platform";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Le conteneur principal est introuvable.");
}

const android = applyPlatformMarker();
app.innerHTML = renderAppShell();
translateDocument(app);

if (android) {
  document.querySelectorAll<HTMLButtonElement>(".save-document, .save-document-as, [data-export-open], [data-export-format]")
    .forEach((button) => { button.disabled = true; });
  const exportStatus = document.querySelector<HTMLElement>("[data-export-status]");
  if (exportStatus) {
    exportStatus.dataset.i18n = "android.exportUnavailable";
    exportStatus.textContent = t("android.exportUnavailable");
  }
}

applyTheme(getInitialTheme());

document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
  button.addEventListener("click", () => applyTheme(button.dataset.themeOption as ThemeName));
});

document.querySelector<HTMLButtonElement>(".mobile-theme-toggle")?.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "nuit" ? "aube" : "nuit");
});

initializeResponsiveLayout();
new FocusModeController().initialize();

const appDialog = new AppDialog();
new SettingsController(appDialog).initialize();

const documentStore = new DocumentStore();
const fileService = new FileService();
const documentController = new DocumentController(
  documentStore,
  fileService,
  appDialog,
  new TemplateDialog(),
  new RecoveryDraftService(),
);
void documentController.initialize();
new AutosaveController(documentStore, documentController, new RecoveryDraftService()).initialize();
new DocumentRenameController(documentStore, fileService, appDialog).initialize();

const writingPreferences = new WritingPreferencesController(
  new WritingPreferencesStorage(),
  appDialog,
);
writingPreferences.initialize();
new DisplayPreferencesController(new DisplayPreferencesStorage(), documentStore).initialize();
new DocumentExportController(documentStore, appDialog).initialize();

function initializeResponsiveLayout(): void {
  const shell = document.querySelector<HTMLElement>(".app-shell");
  const mobileLayout = window.matchMedia("(max-width: 700px)");
  const leftPanel = document.querySelector<HTMLElement>(".left-panel");
  const rightPanel = document.querySelector<HTMLElement>(".right-panel");
  const revealLeft = document.querySelector<HTMLButtonElement>(".reveal-left");
  const collapseLeft = document.querySelector<HTMLButtonElement>(".collapse-left");
  const mobileWritingToggle = document.querySelector<HTMLButtonElement>(".mobile-writing-toggle");
  const mobileWritingClose = document.querySelector<HTMLButtonElement>(".mobile-writing-close");
  const mobilePanelScrim = document.querySelector<HTMLButtonElement>(".mobile-panel-scrim");

function syncMobilePanelState(): void {
  if (!shell) return;
  const leftOpen = mobileLayout.matches && shell.classList.contains("is-mobile-left-open");
  const writingOpen = mobileLayout.matches && shell.classList.contains("is-mobile-writing-open");
  revealLeft?.setAttribute("aria-expanded", String(leftOpen));
  mobileWritingToggle?.setAttribute("aria-expanded", String(writingOpen));
  if (mobilePanelScrim) mobilePanelScrim.hidden = !(leftOpen || writingOpen);
}

function closeMobilePanels(): void {
  shell?.classList.remove("is-mobile-left-open", "is-mobile-writing-open");
  syncMobilePanelState();
}

function syncResponsiveLayout(): void {
  closeMobilePanels();
  if (mobileLayout.matches) {
    shell?.classList.remove("is-left-collapsed", "is-right-collapsed");
    rightPanel?.setAttribute("role", "dialog");
    rightPanel?.setAttribute("aria-modal", "true");
  } else {
    rightPanel?.removeAttribute("role");
    rightPanel?.removeAttribute("aria-modal");
  }
}

collapseLeft?.addEventListener("click", () => {
  if (mobileLayout.matches) closeMobilePanels();
  else shell?.classList.add("is-left-collapsed");
});

revealLeft?.addEventListener("click", () => {
  if (!shell) return;
  if (!mobileLayout.matches) {
    shell.classList.toggle("is-left-collapsed");
    return;
  }
  const opening = !shell.classList.contains("is-mobile-left-open");
  closeMobilePanels();
  shell.classList.toggle("is-mobile-left-open", opening);
  syncMobilePanelState();
  if (opening) requestAnimationFrame(() => collapseLeft?.focus());
});

const rightPanelToggle = document.querySelector<HTMLButtonElement>(".collapse-right");

rightPanelToggle?.addEventListener("click", () => {
  if (!shell || mobileLayout.matches) return;
  const isCollapsed = shell.classList.toggle("is-right-collapsed");
  rightPanelToggle.setAttribute("aria-expanded", String(!isCollapsed));
  rightPanelToggle.setAttribute(
    "aria-label",
    isCollapsed ? t("actions.openRight") : t("actions.closeRight"),
  );
});

mobileWritingToggle?.addEventListener("click", () => {
  if (!shell || !mobileLayout.matches) return;
  const opening = !shell.classList.contains("is-mobile-writing-open");
  closeMobilePanels();
  shell.classList.toggle("is-mobile-writing-open", opening);
  syncMobilePanelState();
  if (opening) requestAnimationFrame(() => mobileWritingClose?.focus());
});

mobileWritingClose?.addEventListener("click", () => {
  closeMobilePanels();
  mobileWritingToggle?.focus();
});

mobilePanelScrim?.addEventListener("click", closeMobilePanels);
document.addEventListener("plum3:focus-change", closeMobilePanels);

leftPanel?.addEventListener("click", (event) => {
  if (mobileLayout.matches && (event.target as HTMLElement).closest("button:not(.collapse-left)")) {
    closeMobilePanels();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileLayout.matches) closeMobilePanels();
});

  mobileLayout.addEventListener("change", syncResponsiveLayout);
  syncResponsiveLayout();
}
