import { FONT_LIBRARY, PALETTES, WIDTH_OPTIONS, type FontCategory } from "./model";

const FONT_CATEGORIES: FontCategory[] = ["Narration", "Manuscrit", "Documentation", "Développement", "Composition"];

function renderFontLibrary(): string {
  return FONT_CATEGORIES.map((category) => `
    <section class="font-category">
      <h4>${category}</h4>
      <div class="font-options">
        ${FONT_LIBRARY.filter((font) => font.category === category).map((font) => `
          <button class="font-option" data-writing-font="${font.id}" type="button" style="font-family: ${font.family.replaceAll('"', "&quot;")}">
            <strong>${font.name}</strong><span data-font-availability>Vérification…</span>
          </button>`).join("")}
      </div>
    </section>`).join("");
}

function renderPaletteOptions(theme: "aube" | "nuit"): string {
  return PALETTES[theme].map((palette) => `
    <button class="palette-option" data-writing-palette="${palette.id}" data-palette-theme="${theme}" type="button">
      <i data-palette-swatch="${palette.id}" aria-hidden="true"></i><span>${palette.name}</span>
    </button>`).join("");
}

export function renderWritingPreferencesDialog(): string {
  return `
    <div class="app-dialog-backdrop writing-preferences-backdrop" data-writing-preferences-dialog hidden>
      <section class="writing-preferences-dialog" role="dialog" aria-modal="true" aria-labelledby="writing-preferences-title">
        <aside class="preferences-navigation" aria-label="Sections des paramètres">
          <strong>Paramètres</strong>
          <button class="is-active" type="button" aria-current="page">Écriture</button>
        </aside>
        <div class="preferences-content">
          <header class="preferences-header">
            <div><h2 id="writing-preferences-title">Réglages d’écriture</h2><p>Adapte la lecture sans modifier tes documents.</p></div>
            <button class="icon-button" data-writing-preferences-close type="button" aria-label="Fermer">×</button>
          </header>
          <div class="preferences-body">
            <div class="preferences-controls">
              <section class="preference-section typography-section">
                <div class="preference-heading"><h3>Typographie</h3><span data-selected-font-name>Literata</span></div>
                <div class="font-library">${renderFontLibrary()}</div>
              </section>
              <section class="preference-section compact-preferences">
                <label class="preference-range">
                  <span><strong>Taille du texte</strong><output data-font-size-output>18 px</output></span>
                  <input data-writing-font-size type="range" min="14" max="28" step="1" value="18" />
                </label>
                <label class="preference-range">
                  <span><strong>Interligne</strong><output data-line-height-output>1,7</output></span>
                  <input data-writing-line-height type="range" min="1.4" max="2" step="0.1" value="1.7" />
                </label>
              </section>
              <section class="preference-section">
                <h3>Largeur de lecture</h3>
                <div class="segmented-preference" data-width-options>
                  ${WIDTH_OPTIONS.map((option) => `<button data-writing-width="${option.id}" type="button">${option.name}</button>`).join("")}
                </div>
              </section>
              <section class="preference-section">
                <h3>Couleurs de lecture</h3>
                <div class="palette-group" data-palette-group="nuit">${renderPaletteOptions("nuit")}</div>
                <div class="palette-group" data-palette-group="aube">${renderPaletteOptions("aube")}</div>
              </section>
              <button class="reset-writing-preferences" data-writing-preferences-reset type="button">Réinitialiser les réglages d’écriture</button>
            </div>
            <aside class="writing-preview" aria-label="Aperçu des réglages d’écriture">
              <span class="preview-label">Aperçu</span>
              <article class="writing-preview-page">
                <h1>Une chambre pour écrire</h1>
                <h2>Le silence comme point de départ</h2>
                <p>Chaque mot trouve sa place lorsque l’espace reste calme, lisible et entièrement disponible à l’écriture.</p>
                <ul><li>Une idée claire</li><li>Un rythme confortable</li><li>Une lecture sans distraction</li></ul>
                <blockquote>« Écrire, c’est avancer une phrase à la fois. »</blockquote>
              </article>
            </aside>
          </div>
        </div>
      </section>
    </div>`;
}

export function renderQuickWritingPreferences(): string {
  return `
    <div class="quick-writing-preferences">
      <button class="quick-writing-trigger" data-quick-writing-toggle type="button" aria-label="Réglages rapides d’écriture" aria-expanded="false">Aa</button>
      <section class="quick-writing-menu" data-quick-writing-menu aria-label="Réglages rapides d’écriture" hidden>
        <header><strong>Écriture</strong><button data-writing-preferences-open type="button">Tous les réglages</button></header>
        <label>Typographie
          <select data-quick-writing-font>${FONT_LIBRARY.map((font) => `<option value="${font.id}">${font.name}</option>`).join("")}</select>
          <small data-quick-font-status aria-live="polite"></small>
        </label>
        <div class="quick-stepper" aria-label="Taille du texte">
          <span>Taille</span><button data-quick-font-decrease type="button" aria-label="Diminuer la taille du texte">−</button><output data-quick-font-size>18 px</output><button data-quick-font-increase type="button" aria-label="Augmenter la taille du texte">+</button>
        </div>
        <label>Interligne
          <select data-quick-line-height><option value="1.4">Compact · 1,4</option><option value="1.7">Normal · 1,7</option><option value="2">Aéré · 2,0</option></select>
        </label>
        <fieldset><legend>Largeur</legend><div class="quick-width-options">${WIDTH_OPTIONS.map((option) => `<button data-quick-writing-width="${option.id}" type="button">${option.name}</button>`).join("")}</div></fieldset>
      </section>
    </div>`;
}
