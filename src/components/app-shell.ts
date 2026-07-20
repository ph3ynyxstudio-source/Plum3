import { renderGenreOptions } from "../templates/template-dialog";
import { WRITING_TEMPLATES } from "../templates/writing-templates";
import { icon } from "../ui/icons";
import { FONT_CATEGORIES, FONT_LIBRARY, PALETTES } from "../features/writing-preferences/model";
import type { ThemeName } from "../theme/theme";

function renderRecentDocuments(): string {
  return '<p class="sidebar-empty" data-i18n="nav.noRecent">Aucun document récent.</p>';
}

function renderWritingTemplates(): string {
  const quickTemplateIds = ["blank", "novel", "song", "social-post", "character"];
  return WRITING_TEMPLATES.filter((template) => quickTemplateIds.includes(template.id))
    .map(
      (template) => `
        <button class="writing-style" data-template-quick="${template.id}" type="button">
          <span class="style-symbol">${template.symbol}</span>
          <span data-i18n="templates.${template.id}.name">${template.shortName ?? template.name}</span>
        </button>`,
    )
    .join("");
}

function renderPanelFontOptions(): string {
  const categoryKeys: Record<(typeof FONT_CATEGORIES)[number], string> = {
    Narration: "narration",
    Manuscrit: "manuscript",
    Documentation: "documentation",
    Développement: "development",
    Composition: "composition",
  };
  return FONT_CATEGORIES.map((category) => `
    <optgroup label="${category}" data-i18n-label="writing.category.${categoryKeys[category]}">
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
      data-i18n-aria-label="palette.${palette.id}"
      title="${palette.name}"
      data-i18n-title="palette.${palette.id}"
    ><i data-palette-swatch="${palette.id}" aria-hidden="true"></i></button>`).join("");
}

function renderToolbar(): string {
  return `
    <div class="editor-toolbar" aria-label="Outils d’écriture" data-i18n-aria-label="toolbar.label">
      <span class="toolbar-empty toolbar-message-desktop" data-i18n="toolbar.placeholder">Aperçu Markdown disponible. Les outils de mise en forme seront ajoutés dans une prochaine version.</span>
      <span class="toolbar-empty toolbar-message-android" data-i18n="toolbar.androidPlaceholder">Aperçu Markdown disponible. Mise en forme avancée à venir.</span>
    </div>`;
}

function renderEditor(): string {
  return `
    <main class="workspace" aria-label="Zone centrale d’écriture" data-i18n-aria-label="editor.workspace">
      ${renderToolbar()}
      <div class="editor-scroll">
        <textarea
          class="document-editor"
          data-document-editor
          aria-label="Contenu du document"
          data-i18n-aria-label="editor.content"
          placeholder="Commence à écrire…"
          data-i18n-placeholder="editor.placeholder"
          spellcheck="true"
        ></textarea>
        <article class="markdown-preview" data-markdown-preview aria-label="Aperçu Markdown" data-i18n-aria-label="editor.preview" hidden></article>
      </div>
    </main>`;
}

function renderMobileLibraryView(): string {
  return `
    <section class="mobile-library-view" data-library-view aria-labelledby="library-title">
      <div class="library-page-scroll">
        <header class="library-page-header">
          <div>
            <h1 id="library-title" data-i18n="library.title">Bibliothèque locale</h1>
            <p data-i18n="library.subtitle">Tous vos documents enregistrés sur cet appareil.</p>
          </div>
          ${icon("book")}
        </header>
        <button class="library-new-document" data-library-new type="button">${icon("plus")}<span data-i18n="nav.new">Nouveau document</span></button>
        <label class="library-search">
          ${icon("search")}
          <input data-library-search type="search" placeholder="Rechercher un document" data-i18n-placeholder="library.search" />
        </label>
        <div class="library-filters" role="group" aria-label="Filtres" data-i18n-aria-label="library.filters">
          <button class="is-active" data-library-filter="all" type="button" data-i18n="library.all">Tous</button>
          <button data-library-filter="recent" type="button" data-i18n="library.recent">Récents</button>
        </div>
        <div class="library-document-list" data-library-documents></div>
        <section class="library-empty-state" data-library-empty hidden>
          ${icon("book")}
          <h2 data-i18n="library.emptyTitle">Aucun document pour l’instant.</h2>
          <p data-i18n="library.emptyMessage">Crée ton premier document pour commencer.</p>
          <button data-library-new type="button" data-i18n="nav.new">Nouveau document</button>
        </section>
        <p class="library-no-results" data-library-no-results data-i18n="library.noResults" hidden>Aucun document ne correspond à cette recherche.</p>
        <aside class="library-local-note">${icon("folder")}<p><span class="library-storage-info library-storage-info-android"><span data-i18n="library.localInfo">Vos documents sont stockés localement sur cet appareil.</span><br /><span data-i18n="library.uninstallInfo">Ils seront supprimés si Plum3 est désinstallé.</span></span><span class="library-storage-info library-storage-info-windows" data-i18n="library.windowsStorageInfo">La bibliothèque Plum3 et l’Explorateur Windows sont deux emplacements séparés. Une sauvegarde dans l’un ne met pas automatiquement l’autre à jour.</span></p></aside>
      </div>
    </section>`;
}

function renderRightPanel(): string {
  return `
    <aside id="writing-settings-panel" class="right-panel" aria-label="Réglages d’écriture" data-i18n-aria-label="writing.title">
      <header class="mobile-panel-header">
        <h2 data-i18n="writing.title">Réglages d’écriture</h2>
        <button class="icon-button mobile-writing-close" type="button" aria-label="Fermer" data-i18n-aria-label="common.close">${icon("chevronRight")}</button>
      </header>
      <section class="settings-card writing-settings-card">
        <h2 data-i18n="writing.title">Réglages d’écriture</h2>
        <label class="panel-select-setting">
          <span data-i18n="writing.typography">Typographie</span>
          <select data-panel-writing-font>${renderPanelFontOptions()}</select>
          <small data-panel-font-status aria-live="polite"></small>
        </label>
        <div class="range-setting">
          <span>
            <span data-i18n="writing.fontSize">Taille de police</span>
            <b class="range-value">
              <button data-panel-font-decrease type="button" aria-label="Diminuer la taille du texte" data-i18n-aria-label="writing.decreaseFont">−</button>
              <output data-panel-font-size>18 px</output>
              <button data-panel-font-increase type="button" aria-label="Augmenter la taille du texte" data-i18n-aria-label="writing.increaseFont">+</button>
            </b>
          </span>
          <input data-panel-writing-font-size aria-label="Taille de police" data-i18n-aria-label="writing.fontSize" type="range" min="14" max="28" step="1" value="18" />
        </div>
        <div class="range-setting">
          <span>
            <span data-i18n="writing.lineHeight">Interlignage</span>
            <b class="range-value">
              <button data-panel-line-height-decrease type="button" aria-label="Réduire l’interligne" data-i18n-aria-label="writing.decreaseLine">−</button>
              <output data-panel-line-height>1,7</output>
              <button data-panel-line-height-increase type="button" aria-label="Augmenter l’interligne" data-i18n-aria-label="writing.increaseLine">+</button>
            </b>
          </span>
          <input data-panel-writing-line-height aria-label="Interlignage" data-i18n-aria-label="writing.lineHeight" type="range" min="1.4" max="2" step="0.1" value="1.7" />
        </div>
        <div class="range-setting">
          <span>
            <span data-i18n="writing.readingWidth">Largeur de lecture</span>
            <b class="range-value">
              <button data-panel-width-decrease type="button" aria-label="Réduire la largeur de lecture" data-i18n-aria-label="writing.decreaseWidth">−</button>
              <output data-panel-writing-width>680 px</output>
              <button data-panel-width-increase type="button" aria-label="Augmenter la largeur de lecture" data-i18n-aria-label="writing.increaseWidth">+</button>
            </b>
          </span>
          <input data-panel-writing-width-range aria-label="Largeur de lecture" data-i18n-aria-label="writing.readingWidth" type="range" min="0" max="3" step="1" value="1" />
        </div>
        <fieldset class="panel-palette-setting">
          <legend data-i18n="writing.readingColor">Couleur de lecture</legend>
          <div data-panel-palette-group="nuit">${renderPanelPaletteOptions("nuit")}</div>
          <div data-panel-palette-group="aube">${renderPanelPaletteOptions("aube")}</div>
        </fieldset>
        <button class="panel-reset-preferences" data-panel-writing-reset type="button" data-i18n="writing.reset">Réinitialiser les réglages</button>
      </section>
      <section class="settings-card">
        <h2 data-i18n="display.title">Affichage</h2>
        <button class="setting-toggle is-on" data-display-setting="wordCount" type="button" role="switch" aria-checked="true">
          <span data-i18n="display.words">Compteur de mots</span><i aria-hidden="true"></i>
        </button>
        <button class="setting-toggle is-on" data-display-setting="characterCount" type="button" role="switch" aria-checked="true">
          <span data-i18n="display.characters">Compteur de caractères</span><i aria-hidden="true"></i>
        </button>
        <button class="setting-toggle is-on" data-display-setting="lineCount" type="button" role="switch" aria-checked="true">
          <span data-i18n="display.lines">Nombre de lignes</span><i aria-hidden="true"></i>
        </button>
        <button class="setting-toggle" data-display-setting="markdownPreview" type="button" role="switch" aria-checked="false">
          <span data-i18n="display.preview">Aperçu Markdown</span><i aria-hidden="true"></i>
        </button>
      </section>
      <section class="settings-card focus-card">
        <h2 data-i18n="focus.title">Mode concentration</h2>
        <p data-i18n="focus.description">Masque les éléments non essentiels pour une écriture sans distraction.</p>
        <button class="secondary-action focus-mode-toggle" data-focus-mode-toggle type="button" aria-label="Activer le mode concentration" aria-pressed="false">${icon("focus")}<span data-focus-mode-label>Activer</span></button>
      </section>
      <section class="settings-card autosave-card">
        <h2 data-i18n="autosave.title">Sauvegarde automatique</h2>
        <button class="setting-toggle" data-autosave-toggle type="button" role="switch" aria-checked="false">
          <span data-i18n="autosave.disabled">Désactivée</span><i aria-hidden="true"></i>
        </button>
        <p data-autosave-status data-i18n="autosave.draftOnly">Le brouillon local reste protégé jusqu’au premier enregistrement.</p>
      </section>
      <section class="settings-card export-card" data-document-export>
        <h2 data-i18n="export.title">Exporter</h2>
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
      <aside id="mobile-library-panel" class="left-panel" aria-label="Bibliothèque de documents" data-i18n-aria-label="nav.library">
        <div class="brand">
          <div class="brand-logos">
            <img class="brand-logo brand-logo-aube" src="/logo-aube.webp" alt="Plum3 — Dépose ton encre." />
            <img class="brand-logo brand-logo-nuit" src="/logo-nuit.webp" alt="Plum3 — Dépose ton encre." />
          </div>
          <button class="icon-button collapse-left" type="button" aria-label="Replier le panneau gauche" data-i18n-aria-label="nav.collapseLeft">${icon("chevronLeft")}</button>
        </div>
        <button class="new-document" data-document-action="new" type="button" aria-label="Nouveau document" data-i18n-aria-label="nav.new" title="Nouveau document" data-i18n-title="nav.new">${icon("plus")}<span data-i18n="nav.new">Nouveau document</span><b>🪶</b></button>
        <div class="sidebar-scroll">
          <section class="nav-section mobile-library-section">
            <div class="section-heading"><h2 data-i18n="library.section">Bibliothèque</h2></div>
            <div class="mobile-library-quick-list" data-library-quick-list></div>
            <button class="view-full-library" data-library-open type="button">${icon("book")}<span data-i18n="library.viewAll">Voir toute la bibliothèque</span>${icon("chevronRight")}</button>
          </section>
          <section class="nav-section document-files-section">
            <div class="section-heading"><h2 data-i18n="nav.recent">Documents récents</h2></div>
            <div class="document-list" data-recent-documents>${renderRecentDocuments()}</div>
            <button class="open-document" data-document-action="open" type="button" aria-label="Ouvrir un document" data-i18n-aria-label="nav.open" title="Ouvrir un document" data-i18n-title="nav.open">${icon("folderOpen")}<span data-i18n="nav.open">Ouvrir un document</span></button>
          </section>
          <section class="nav-section styles-section">
            <div class="section-heading"><h2 data-i18n="nav.templates">Modèles d’écriture</h2></div>
            <div class="writing-style-list">${renderWritingTemplates()}</div>
            <button class="view-all-templates" data-template-open type="button" aria-label="Modèles d’écriture" data-i18n-aria-label="nav.templates" title="Modèles d’écriture" data-i18n-title="nav.templates">${icon("templates")}<span data-i18n="nav.templates">Modèles d’écriture</span></button>
          </section>
        </div>
        <button class="sidebar-share-markdown" data-share-markdown type="button" aria-label="Partager en Markdown" data-i18n-aria-label="share.markdown" title="Partager en Markdown" data-i18n-title="share.markdown" hidden>${icon("export")}<span data-share-markdown-label data-i18n="share.markdown">Partager en Markdown</span></button>
        <button class="sidebar-export" data-export-open type="button" aria-label="Exporter le document" data-i18n-aria-label="export.document" title="Exporter le document" data-i18n-title="export.document">${icon("export")}<span data-i18n="export.document">Exporter le document</span></button>
        <div class="mobile-android-limitations" aria-live="polite">
          <p data-i18n="android.saveUnavailable">La sauvegarde de fichiers Android sera disponible dans une prochaine version.</p>
          <p data-i18n="android.exportInfo">Les copies DOCX exportées sont distinctes de la bibliothèque Plum3.</p>
        </div>
        <button class="sidebar-settings" data-settings-open type="button" aria-label="Paramètres" data-i18n-aria-label="nav.settings" title="Paramètres" data-i18n-title="nav.settings">${icon("settings")}<span data-i18n="nav.settings">Paramètres</span></button>
      </aside>

      <header class="topbar">
        <button class="icon-button reveal-left" type="button" aria-label="Afficher le panneau gauche" data-i18n-aria-label="nav.showLeft" aria-controls="mobile-library-panel" aria-expanded="false">${icon("menu")}</button>
        <div class="document-title"><button class="document-title-button" data-document-title type="button" aria-label="Renommer le document" data-i18n-aria-label="editor.rename">Sans titre</button><input class="document-title-input" data-document-title-input aria-label="Nouveau nom du document" data-i18n-aria-label="editor.newName" maxlength="255" hidden /><span class="saved-dot is-unsaved" data-document-save-dot></span><small data-document-status>Nouveau document</small></div>
        <div class="topbar-actions">
          <div class="theme-switcher" aria-label="Choisir le thème" data-i18n-aria-label="theme.choose">
            <button type="button" data-theme-option="aube" aria-pressed="false">${icon("sun")}<span data-i18n="theme.dawn">Aube</span></button>
            <button type="button" data-theme-option="nuit" aria-pressed="false">${icon("moon")}<span data-i18n="theme.night">Nuit</span></button>
          </div>
          <button class="mobile-theme-toggle" type="button" aria-label="Choisir le thème" data-i18n-aria-label="theme.choose">
            <span class="mobile-theme-aube">${icon("sun")}<span data-i18n="theme.dawn">Aube</span></span>
            <span class="mobile-theme-nuit">${icon("moon")}<span data-i18n="theme.night">Nuit</span></span>
          </button>
          <button class="icon-button document-action save-document" data-document-action="save" type="button" aria-label="Enregistrer" data-i18n-aria-label="actions.save" title="Enregistrer (Ctrl+S)" data-i18n-title="actions.saveShortcut">${icon("save")}</button>
          <button class="icon-button document-action save-document-as" data-document-action="save-as" type="button" aria-label="Enregistrer sous" data-i18n-aria-label="actions.saveAs" title="Enregistrer sous… (Ctrl+Maj+S)" data-i18n-title="actions.saveAsShortcut">${icon("saveAs")}</button>
          <button class="icon-button collapse-right" type="button" aria-label="Fermer la colonne de personnalisation" data-i18n-aria-label="actions.closeRight" aria-expanded="true">${icon("menu")}</button>
          <button class="icon-button mobile-writing-toggle" type="button" aria-label="Réglages d’écriture" data-i18n-aria-label="writing.title" aria-controls="writing-settings-panel" aria-expanded="false">${icon("edit")}</button>
        </div>
      </header>

      ${renderEditor()}
      ${renderMobileLibraryView()}
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
          <span class="status-save-label"><span data-i18n="editor.lastSave">Dernière sauvegarde</span> <time class="status-save-time" data-last-save-time>—</time></span>
          <i class="saved-dot is-unsaved" data-document-save-dot></i>
        </div>
      </footer>
      <button class="mobile-panel-scrim" type="button" aria-label="Fermer" data-i18n-aria-label="common.close" hidden></button>
      <div class="app-dialog-backdrop" data-app-dialog hidden>
        <section class="app-dialog" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
          <h2 id="app-dialog-title" data-dialog-title></h2>
          <p id="app-dialog-message" data-dialog-message></p>
          <label class="dialog-input-field" data-dialog-input-field hidden><span data-dialog-input-label></span><input data-dialog-input type="text" autocomplete="off" /></label>
          <div class="dialog-actions" data-dialog-actions></div>
        </section>
      </div>
      <div class="app-dialog-backdrop template-dialog-backdrop" data-template-dialog hidden>
        <section class="app-dialog template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
          <header class="template-dialog-header">
            <div><h2 id="template-dialog-title" data-i18n="templates.dialogTitle">Créer avec un modèle</h2><p data-i18n="templates.dialogDescription">Choisis un point de départ Markdown. Tout restera librement modifiable.</p></div>
            <button class="icon-button" data-template-cancel type="button" aria-label="Fermer" data-i18n-aria-label="common.close">×</button>
          </header>
          <div class="template-list" data-template-list></div>
          <footer class="template-dialog-footer">
            <label class="template-genre" data-template-genre-field hidden><span data-i18n="templates.optionalGenre">Genre optionnel</span><select data-template-genre>${renderGenreOptions()}</select></label>
            <div class="dialog-actions"><button class="dialog-action is-neutral" data-template-cancel type="button" data-i18n="common.cancel">Annuler</button><button class="dialog-action is-primary" data-template-create type="button" data-i18n="templates.create">Créer le document</button></div>
          </footer>
        </section>
      </div>
      <div class="app-dialog-backdrop settings-dialog-backdrop" data-settings-dialog hidden>
        <section class="app-dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
          <header class="settings-dialog-header">
            <h2 id="settings-dialog-title" data-i18n="settings.title">Paramètres</h2>
            <button class="icon-button" data-settings-close type="button" aria-label="Fermer" data-i18n-aria-label="common.close">×</button>
          </header>
          <div class="settings-dialog-body" data-settings-view="settings">
            <section class="settings-page-card">
              <h3 data-i18n="settings.languageTitle">Langue / Language</h3>
              <p data-i18n="settings.languageDescription">La langue change immédiatement et sera conservée au prochain lancement.</p>
              <div class="language-options" role="radiogroup" aria-label="Langue / Language">
                <button type="button" data-locale-option="fr" role="radio" aria-checked="false" data-i18n="settings.french">Français</button>
                <button type="button" data-locale-option="en" role="radio" aria-checked="false" data-i18n="settings.english">English</button>
              </div>
            </section>
            <section class="settings-page-card feedback-card">
              <h3 data-i18n="feedback.title">Retour utilisateur</h3>
              <p data-i18n="feedback.description">Signalez un bug, proposez une amélioration ou partagez votre avis sur Plum3.</p>
              <p class="feedback-examples" data-i18n="feedback.examples">Exemples : problème d’interface, export inattendu ou modèle difficile à utiliser.</p>
              <button class="secondary-action feedback-email-action" data-feedback-email type="button" data-i18n="feedback.send">Envoyer un retour par courriel</button>
            </section>
            <button class="settings-about-link" data-about-open type="button"><span data-i18n="settings.about">À propos</span><span aria-hidden="true">›</span></button>
          </div>
          <div class="settings-dialog-body about-page" data-settings-view="about" hidden>
            <button class="about-back" data-about-back type="button">‹ <span data-i18n="about.back">Retour aux paramètres</span></button>
            <h3>Plum3</h3>
            <p class="about-tagline" data-i18n="about.tagline">Dépose ton encre.</p>
            <p data-about-version></p>
            <p data-i18n="about.description">Un éditeur Markdown local-first pour écrire, structurer et conserver ses idées.</p>
            <p data-i18n="about.developedBy">Développé par Ph3yNyx.Studio</p>
            <div class="about-studio">
              <img class="about-studio-logo" src="/logo-ph3ynyx-studio.svg" alt="" aria-hidden="true" />
              <p class="about-studio-name">Ph3yNyx.Studio</p>
              <a class="about-studio-link" href="https://ph3ynyx.dev/" data-about-studio-url>https://ph3ynyx.dev/</a>
            </div>
            <ul class="about-facts">
              <li data-i18n="about.localFirst">Les documents restent sur cet appareil dans des fichiers Markdown ou texte locaux.</li>
              <li data-i18n="about.noAccount">Aucun compte n’est requis.</li>
              <li data-i18n="about.noTracking">Aucun suivi publicitaire ni aucune télémétrie ne sont intégrés.</li>
            </ul>
            <p data-about-system></p><p data-about-tauri></p>
            <div class="about-links">
              <button type="button" data-about-licenses data-i18n="about.licenses">Licences open source</button>
              <button type="button" data-about-privacy data-i18n="about.privacy">Politique de confidentialité</button>
              <button type="button" data-about-support data-i18n="about.support">Soutien ou contact</button>
            </div>
            <button class="secondary-action" data-about-copy type="button" data-i18n="about.copy">Copier les informations de version</button>
            <p class="about-copy-status" data-about-copy-status aria-live="polite"></p>
            <p class="about-copyright">© <span data-about-year></span> Ph3yNyx.Studio</p>
          </div>
        </section>
      </div>
    </div>`;
}
