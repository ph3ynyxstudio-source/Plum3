import { renderGenreOptions } from "../templates/template-dialog";
import { WRITING_TEMPLATES } from "../templates/writing-templates";
import { icon } from "../ui/icons";
import { FONT_CATEGORIES, FONT_LIBRARY, PALETTES } from "../features/writing-preferences/model";
import type { ThemeName } from "../theme/theme";

function renderRecentDocuments(): string {
  return '<p class="sidebar-empty">Aucun document récent.</p>';
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

function renderPanelFontOptions(): string {
  return FONT_CATEGORIES.map((category) => `
    <optgroup label="${category}">
      ${FONT_LIBRARY.filter((font) => font.category === category)
        .map((font) => `<option value="${font.id}">${font.name}</option>`)
        .join("")}
    </optgroup>`).join("");
}

function renderPanelPaletteOptions(theme: ThemeName): string {
  return PALETTES[theme].map((palette) => `
    <button
      class="panel-color-swatch"
      data-panel-writing-palette="${palette.id}"
      data-panel-palette-theme="${theme}"
      type="button"
      aria-label="${palette.name}"
      title="${palette.name}"
    ><i data-palette-swatch="${palette.id}" aria-hidden="true"></i></button>`).join("");
}

function renderToolbar(): string {
  return `
    <div class="editor-toolbar" aria-label="Outils d’écriture">
      <span class="toolbar-empty">Mise en forme Markdown disponible dans une prochaine phase.</span>
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
        <article class="markdown-preview" data-markdown-preview aria-label="Aperçu Markdown" hidden></article>
      </div>
    </main>`;
}

function renderRightPanel(): string {
  return `
    <aside class="right-panel" aria-label="Réglages d’écriture">
      <section class="settings-card writing-settings-card">
        <h2>Réglages d’écriture</h2>
        <label class="panel-select-setting">
          <span>Typographie</span>
          <select data-panel-writing-font>${renderPanelFontOptions()}</select>
          <small data-panel-font-status aria-live="polite"></small>
        </label>
        <div class="range-setting">
          <span>
            <span>Taille de police</span>
            <b class="range-value">
              <button data-panel-font-decrease type="button" aria-label="Diminuer la taille du texte">−</button>
              <output data-panel-font-size>18 px</output>
              <button data-panel-font-increase type="button" aria-label="Augmenter la taille du texte">+</button>
            </b>
          </span>
          <input data-panel-writing-font-size aria-label="Taille de police" type="range" min="14" max="28" step="1" value="18" />
        </div>
        <div class="range-setting">
          <span>
            <span>Interlignage</span>
            <b class="range-value">
              <button data-panel-line-height-decrease type="button" aria-label="Réduire l’interligne">−</button>
              <output data-panel-line-height>1,7</output>
              <button data-panel-line-height-increase type="button" aria-label="Augmenter l’interligne">+</button>
            </b>
          </span>
          <input data-panel-writing-line-height aria-label="Interlignage" type="range" min="1.4" max="2" step="0.1" value="1.7" />
        </div>
        <div class="range-setting">
          <span>
            <span>Largeur de lecture</span>
            <b class="range-value">
              <button data-panel-width-decrease type="button" aria-label="Réduire la largeur de lecture">−</button>
              <output data-panel-writing-width>680 px</output>
              <button data-panel-width-increase type="button" aria-label="Augmenter la largeur de lecture">+</button>
            </b>
          </span>
          <input data-panel-writing-width-range aria-label="Largeur de lecture" type="range" min="0" max="3" step="1" value="1" />
        </div>
        <fieldset class="panel-palette-setting">
          <legend>Couleur de lecture</legend>
          <div data-panel-palette-group="nuit">${renderPanelPaletteOptions("nuit")}</div>
          <div data-panel-palette-group="aube">${renderPanelPaletteOptions("aube")}</div>
        </fieldset>
        <button class="panel-reset-preferences" data-panel-writing-reset type="button">Réinitialiser les réglages</button>
      </section>
      <section class="settings-card">
        <h2>Affichage</h2>
        <button class="setting-toggle is-on" data-display-setting="wordCount" type="button" role="switch" aria-checked="true">
          <span>Compteur de mots</span><i aria-hidden="true"></i>
        </button>
        <button class="setting-toggle is-on" data-display-setting="characterCount" type="button" role="switch" aria-checked="true">
          <span>Compteur de caractères</span><i aria-hidden="true"></i>
        </button>
        <button class="setting-toggle is-on" data-display-setting="lineCount" type="button" role="switch" aria-checked="true">
          <span>Nombre de lignes</span><i aria-hidden="true"></i>
        </button>
        <button class="setting-toggle" data-display-setting="markdownPreview" type="button" role="switch" aria-checked="false">
          <span>Aperçu Markdown</span><i aria-hidden="true"></i>
        </button>
      </section>
      <section class="settings-card focus-card">
        <h2>Mode concentration</h2>
        <p>Masque les éléments non essentiels pour une écriture sans distraction.</p>
        <button class="secondary-action focus-mode-toggle" data-focus-mode-toggle type="button" aria-label="Activer le mode concentration" aria-pressed="false">${icon("focus")}<span data-focus-mode-label>Activer</span></button>
      </section>
      <section class="settings-card export-card" data-document-export hidden>
        <h2>Exporter</h2>
        <div class="export-actions">
          <button class="secondary-action export-action" data-export-format="pdf" type="button">PDF</button>
          <button class="secondary-action export-action" data-export-format="docx" type="button">Word (.docx)</button>
        </div>
        <p class="export-status" data-export-status aria-live="polite"></p>
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
            <div class="document-list" data-recent-documents>${renderRecentDocuments()}</div>
            <button class="open-document" data-document-action="open" type="button">${icon("folder")}<span>Ouvrir un document…</span></button>
          </section>
          <section class="nav-section styles-section">
            <div class="section-heading"><h2>Modèles d’écriture</h2></div>
            <div class="writing-style-list">${renderWritingTemplates()}</div>
            <button class="view-all-templates" data-template-open type="button">Voir tous les modèles</button>
          </section>
        </div>
        <button class="sidebar-settings" type="button" disabled title="Les réglages visuels sont disponibles dans la colonne droite">${icon("settings")}<span>Paramètres</span></button>
      </aside>

      <header class="topbar">
        <button class="icon-button reveal-left" type="button" aria-label="Afficher le panneau gauche">${icon("menu")}</button>
        <div class="document-title"><button class="document-title-button" data-document-title type="button" aria-label="Renommer le document">Sans titre</button><input class="document-title-input" data-document-title-input aria-label="Nouveau nom du document" maxlength="255" hidden /><span class="saved-dot is-unsaved" data-document-save-dot></span><small data-document-status>Nouveau document</small></div>
        <div class="topbar-actions">
          <div class="theme-switcher" aria-label="Choisir le thème">
            <button type="button" data-theme-option="aube" aria-pressed="false">${icon("sun")}<span>Aube</span></button>
            <button type="button" data-theme-option="nuit" aria-pressed="false">${icon("moon")}<span>Nuit</span></button>
          </div>
          <button class="icon-button document-action save-document" data-document-action="save" type="button" aria-label="Enregistrer" title="Enregistrer (Ctrl+S)">${icon("save")}</button>
          <button class="icon-button document-action save-document-as" data-document-action="save-as" type="button" aria-label="Enregistrer sous" title="Enregistrer sous (Ctrl+Maj+S)">${icon("saveAs")}</button>
          <button class="search-action" type="button" title="Recherche disponible dans une prochaine phase" disabled>${icon("search")}<span>Rechercher</span></button>
          <button class="icon-button collapse-right" type="button" aria-label="Fermer la colonne de personnalisation" aria-expanded="true">${icon("menu")}</button>
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
    </div>`;
}
