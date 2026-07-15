import { describe, expect, it, vi } from "vitest";
import { DocumentStore } from "../documents/document-state";
import { buildTemplateContent, WRITING_TEMPLATES } from "./writing-templates";

function template(id: string) {
  const result = WRITING_TEMPLATES.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Modèle introuvable : ${id}`);
  return result;
}

describe("contenu localisé des modèles d’écriture", () => {
  it("génère le modèle Creature en français", () => {
    const content = buildTemplateContent(template("creature"), "", "fr");
    expect(content).toContain("# Nom de la créature");
    expect(content).toContain("## Comportement");
    expect(content).not.toContain("# Creature Name");
  });

  it("génère le modèle Creature en anglais", () => {
    const content = buildTemplateContent(template("creature"), "", "en");
    expect(content).toContain("# Creature Name");
    expect(content).toContain("## Behavior");
    expect(content).not.toContain("# Nom de la créature");
  });

  it.each([
    ["fr", "Mystère", "État d’avancement"],
    ["en", "Mystery", "Progress"],
  ] as const)("génère le modèle Roman et son genre en %s", (locale, genre, heading) => {
    const content = buildTemplateContent(template("novel"), "mystery", locale);
    expect(content).toContain(`## Genre\n\n${genre}\n`);
    expect(content).toContain(`## ${heading}`);
  });

  it.each(["fr", "en"] as const)("laisse le document vide sans contenu en %s", (locale) => {
    expect(buildTemplateContent(template("blank"), "", locale)).toBe("");
  });

  it("ne modifie pas un document existant après un changement de langue", async () => {
    vi.resetModules();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
    });
    vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
    vi.stubGlobal("document", {
      documentElement: { lang: "", dataset: {} },
      querySelectorAll: () => [],
      dispatchEvent: () => true,
    });
    const { getLocale, setLocale } = await import("../i18n/i18n");
    const store = new DocumentStore();
    store.createFromTemplate("Créature.md", buildTemplateContent(template("creature"), "", getLocale()));
    const createdContent = store.current.content;

    setLocale("en");

    expect(store.current.content).toBe(createdContent);
    expect(store.current.content).toContain("# Nom de la créature");
  });

  it("fournit une version française et anglaise pour chaque modèle", () => {
    WRITING_TEMPLATES.forEach((writingTemplate) => {
      expect(writingTemplate.content).toHaveProperty("fr");
      expect(writingTemplate.content).toHaveProperty("en");
      if (writingTemplate.id !== "blank") {
        expect(writingTemplate.content.fr.trim()).not.toBe("");
        expect(writingTemplate.content.en.trim()).not.toBe("");
        expect(writingTemplate.content.en).not.toBe(writingTemplate.content.fr);
      }
    });
  });
});
