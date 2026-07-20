import { describe, expect, it } from "vitest";
import { icon } from "../ui/icons";
import { renderAppShell } from "./app-shell";

describe("actions de la colonne gauche", () => {
  it("rend les cinq actions V1 dans l’ordre attendu sans bouton Projets", () => {
    const shell = renderAppShell();
    const selectors = [
      'class="new-document"',
      'class="open-document"',
      'class="view-all-templates"',
      'class="sidebar-share-markdown"',
      'class="sidebar-export"',
      'class="sidebar-settings"',
    ];
    const positions = selectors.map((selector) => shell.indexOf(selector));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(shell).not.toContain("data-project");
    expect(shell).not.toContain("search-action");
    expect(shell).not.toContain("nav.searchDocuments");
  });

  it("fournit un aria-label et un title localisables à chaque action", () => {
    const shell = renderAppShell();
    ["nav.new", "nav.open", "nav.templates", "share.markdown", "export.document", "nav.settings"].forEach((key) => {
      expect(shell).toContain(`data-i18n-aria-label="${key}"`);
      expect(shell).toContain(`data-i18n-title="${key}"`);
    });
  });

  it("utilise des icônes SVG distinctes en currentColor", () => {
    const icons = [icon("plus"), icon("folderOpen"), icon("templates"), icon("export"), icon("settings")];
    expect(new Set(icons).size).toBe(icons.length);
    icons.forEach((svg) => {
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('stroke-width="1.8"');
    });
  });

  it("expose les deux panneaux mobiles sans dupliquer leur contenu", () => {
    const shell = renderAppShell();
    expect(shell).toContain('id="mobile-library-panel"');
    expect(shell).toContain('class="nav-section document-files-section"');
    expect(shell).toContain('aria-controls="mobile-library-panel"');
    expect(shell).toContain('id="writing-settings-panel"');
    expect(shell).toContain('class="icon-button mobile-writing-toggle"');
    expect(shell).toContain('class="mobile-theme-toggle"');
    expect(shell).toContain('data-i18n="android.saveUnavailable"');
    expect(shell).toContain('data-i18n="android.exportInfo"');
    expect(shell).toContain("data-share-markdown");
    expect(shell).not.toContain("sidebar-library-save");
    expect(shell.indexOf("mobile-theme-toggle")).toBeLessThan(shell.indexOf("save-document"));
    expect(shell.indexOf("save-document")).toBeLessThan(shell.indexOf("mobile-writing-toggle"));
    expect(shell).toContain(icon("edit"));
    expect(shell).toContain('class="icon-button mobile-writing-close"');
    expect(shell).toContain('class="mobile-panel-scrim"');
    expect(shell.match(/data-i18n="writing.title"/g)?.length).toBe(2);
  });

  it("sépare les explications de stockage Android et Windows", () => {
    const shell = renderAppShell();

    expect(shell).toContain('class="library-storage-info library-storage-info-android"');
    expect(shell).toContain('data-i18n="library.localInfo"');
    expect(shell).toContain('data-i18n="library.uninstallInfo"');
    expect(shell).toContain('class="library-storage-info library-storage-info-windows"');
    expect(shell).toContain('data-i18n="library.windowsStorageInfo"');
  });
});
