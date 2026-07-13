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

document.querySelector<HTMLButtonElement>(".collapse-right")?.addEventListener("click", () => {
  shell?.classList.toggle("is-right-collapsed");
});

document.querySelectorAll<HTMLButtonElement>(".setting-toggle").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const nextValue = toggle.getAttribute("aria-checked") !== "true";
    toggle.setAttribute("aria-checked", String(nextValue));
    toggle.classList.toggle("is-on", nextValue);
  });
});
