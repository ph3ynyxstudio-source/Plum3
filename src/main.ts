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

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Le conteneur principal est introuvable.");
}

app.innerHTML = renderAppShell();

applyTheme(getInitialTheme());

const appDialog = new AppDialog();

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
new DocumentRenameController(documentStore, fileService, appDialog).initialize();

const writingPreferences = new WritingPreferencesController(
  new WritingPreferencesStorage(),
  appDialog,
);
writingPreferences.initialize();
new DisplayPreferencesController(new DisplayPreferencesStorage(), documentStore).initialize();
new FocusModeController().initialize();
new DocumentExportController(documentStore, appDialog).initialize();

document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
  button.addEventListener("click", () => applyTheme(button.dataset.themeOption as ThemeName));
});

const shell = document.querySelector<HTMLElement>(".app-shell");

document.querySelector<HTMLButtonElement>(".collapse-left")?.addEventListener("click", () => {
  shell?.classList.add("is-left-collapsed");
});

document.querySelector<HTMLButtonElement>(".reveal-left")?.addEventListener("click", () => {
  shell?.classList.toggle("is-left-collapsed");
});

const rightPanelToggle = document.querySelector<HTMLButtonElement>(".collapse-right");

rightPanelToggle?.addEventListener("click", () => {
  if (!shell) return;
  const isCollapsed = shell.classList.toggle("is-right-collapsed");
  rightPanelToggle.setAttribute("aria-expanded", String(!isCollapsed));
  rightPanelToggle.setAttribute(
    "aria-label",
    isCollapsed ? "Ouvrir la colonne de personnalisation" : "Fermer la colonne de personnalisation",
  );
});
