import { recentDocuments } from "../data/shell-content";
import { renderGenreOptions } from "../templates/template-dialog";
import { WRITING_TEMPLATES } from "../templates/writing-templates";
import { icon } from "../ui/icons";
import { renderQuickWritingPreferences, renderWritingPreferencesDialog } from "../features/writing-preferences/ui";

function renderRecentDocuments(): string {
  if (recentDocuments.length === 0) {
    return '<p class="sidebar-empty">Aucun document récent.</p>';
  }

  return recentDocuments
    .map(
      (document) => `
        <button class="document-card${document.active ? " is-active" : ""}" type="button">
          <span class="document-icon">${icon("document")}</span>
          <span class="document-copy">
            <strong>${document.title}</strong>
            <span><time>${document.time}</time><em>${document.style}</em></span>
          </span>
          ${icon("chevronRight")}
        </button>`,
    )
    .join("");
}

function renderWritingTemplates(): string {
  const quickTemplateIds = ["blank", "novel", "song", "social-post", "character"];
  return WRITING_TEMPLATES.filter((template) => quickTemplateIds.includes(template.id))
    .map(
      (template) => `
        <button class="writing-style" data-template-quick="${template.id}" type="button">
          <span class="style-symbol">${template.symbol}</span>
          <span>${template.shortName ?? template.name}</span>
        </button>`,
    )
    .join("");
}

function renderToolbar(): string {
  return `
    <div class="editor-toolbar" aria-label="Outils d’écriture">
      <span class="toolbar-empty">Mise en forme Markdown disponible dans une prochaine phase.</span>
      ${renderQuickWritingPreferences()}
    </div>`;
}

function renderEditor(): string {
  return `
    <main class="workspace" aria-label="Zone centrale d’écriture">
      ${renderToolbar()}
      <div class="editor-scroll">
        <textarea
          class="document-editor"
          data-document-editor
          aria-label="Contenu du document"
          placeholder="Commence à écrire…"
          spellcheck="true"
        ></textarea>
      </div>
    </main>`;
}

function renderRightPanel(): string {
  return `
    <aside class="right-panel" aria-label="Réglages d’écriture">
      <section class="settings-card">
        <h2>Réglages d’écriture</h2>
        <p class="settings-empty" data-writing-preferences-summary>Literata · 18 px · interligne 1,7</p>
        <button class="secondary-action writing-preferences-open" data-writing-preferences-open type="button">Personnaliser l’écriture</button>
      </section>
      <section class="settings-card">
        <h2>Affichage</h2>
        <p class="settings-empty">Aucune option d’affichage disponible.</p>
      </section>
      <section class="settings-card focus-card">
        <h2>Mode concentration</h2>
        <p class="settings-empty">Non disponible dans cette phase.</p>
      </section>
      <section class="settings-card autosave-card">
        <h2>Sauvegarde automatique</h2>
        <p class="settings-empty">Non configurée.</p>
      </section>
    </aside>`;
}

export function renderAppShell(): string {
  return `
    <div class="app-shell">
      <aside class="left-panel" aria-label="Bibliothèque de documents">
        <div class="brand">
          <span class="brand-feather" aria-hidden="true">🪶</span>
          <div class="sidebar-copy"><strong>Plum3 de Nyx</strong><span>Un espace calme pour écrire,<br />structurer et conserver tes idées.</span></div>
          <button class="icon-button collapse-left" type="button" aria-label="Replier le panneau gauche">${icon("chevronLeft")}</button>
        </div>
        <button class="new-document" data-document-action="new" type="button">${icon("plus")}<span>Nouvelle plume</span><b>🪶</b></button>
        <div class="sidebar-scroll">
          <section class="nav-section">
            <div class="section-heading"><h2>Documents récents</h2><button type="button" aria-label="Rechercher dans les documents" title="Recherche disponible dans une prochaine phase" disabled>${icon("search")}</button></div>
            <div class="document-list">${renderRecentDocuments()}</div>
            <button class="open-document" data-document-action="open" type="button">${icon("folder")}<span>Ouvrir un document…</span></button>
          </section>
          <section class="nav-section styles-section">
            <div class="section-heading"><h2>Modèles d’écriture</h2></div>
            <div class="writing-style-list">${renderWritingTemplates()}</div>
            <button class="view-all-templates" data-template-open type="button">Voir tous les modèles</button>
          </section>
        </div>
        <button class="sidebar-settings" data-writing-preferences-open type="button">${icon("settings")}<span>Paramètres</span></button>
      </aside>

      <header class="topbar">
        <button class="icon-button reveal-left" type="button" aria-label="Afficher le panneau gauche">${icon("menu")}</button>
        <div class="document-title"><button class="document-title-button" data-document-title type="button" aria-label="Renommer le document">Sans titre.md</button><input class="document-title-input" data-document-title-input aria-label="Nouveau nom du document" maxlength="255" hidden /><span class="saved-dot is-unsaved" data-document-save-dot></span><small data-document-status>Nouveau document</small></div>
        <div class="topbar-actions">
          <div class="theme-switcher" aria-label="Choisir le thème">
            <button type="button" data-theme-option="aube" aria-pressed="false">${icon("sun")}<span>Aube</span></button>
            <button type="button" data-theme-option="nuit" aria-pressed="false">${icon("moon")}<span>Nuit</span></button>
          </div>
          <button class="icon-button document-action save-document" data-document-action="save" type="button" aria-label="Enregistrer" title="Enregistrer (Ctrl+S)">${icon("save")}</button>
          <button class="icon-button document-action save-document-as" data-document-action="save-as" type="button" aria-label="Enregistrer sous" title="Enregistrer sous (Ctrl+Maj+S)">${icon("saveAs")}</button>
          <button class="search-action" type="button" title="Recherche disponible dans une prochaine phase" disabled>${icon("search")}<span>Rechercher</span></button>
          <button class="icon-button collapse-right" type="button" aria-label="Replier le panneau droit">${icon("menu")}</button>
        </div>
      </header>

      ${renderEditor()}
      ${renderRightPanel()}

      <footer class="statusbar">
        <div class="status-group status-left">
          <span data-word-count>0 mots</span>
          <span class="status-secondary" data-character-count>0 caractères</span>
          <span class="status-secondary" data-line-count>1 ligne</span>
        </div>
        <div class="status-group status-center">
          <span class="status-format" data-document-format data-short-label="MD">Markdown</span>
          <span class="status-feather">🪶</span>
        </div>
        <div class="status-group status-right">
          <span class="status-save-label">Dernière sauvegarde <time class="status-save-time" data-last-save-time>—</time></span>
          <i class="saved-dot is-unsaved" data-document-save-dot></i>
        </div>
      </footer>
      <div class="app-dialog-backdrop" data-app-dialog hidden>
        <section class="app-dialog" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
          <h2 id="app-dialog-title" data-dialog-title></h2>
          <p id="app-dialog-message" data-dialog-message></p>
          <div class="dialog-actions" data-dialog-actions></div>
        </section>
      </div>
      <div class="app-dialog-backdrop template-dialog-backdrop" data-template-dialog hidden>
        <section class="app-dialog template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
          <header class="template-dialog-header">
            <div><h2 id="template-dialog-title">Créer avec un modèle</h2><p>Choisis un point de départ Markdown. Tout restera librement modifiable.</p></div>
            <button class="icon-button" data-template-cancel type="button" aria-label="Fermer">×</button>
          </header>
          <div class="template-list" data-template-list></div>
          <footer class="template-dialog-footer">
            <label class="template-genre" data-template-genre-field hidden>Genre optionnel<select data-template-genre>${renderGenreOptions()}</select></label>
            <div class="dialog-actions"><button class="dialog-action is-neutral" data-template-cancel type="button">Annuler</button><button class="dialog-action is-primary" data-template-create type="button">Créer le document</button></div>
          </footer>
        </section>
      </div>
      ${renderWritingPreferencesDialog()}
    </div>`;
}
