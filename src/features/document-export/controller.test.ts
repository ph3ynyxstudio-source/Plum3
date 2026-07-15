import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderAppShell } from "../../components/app-shell";
import { DocumentStore } from "../../documents/document-state";
import { setLocale, type Locale } from "../../i18n/i18n";
import type { AppDialog } from "../../ui/app-dialog";
import { DocumentExportController, type ExportInvoker } from "./controller";

type EventListener = () => void;

class FakeElement {
  dataset: DOMStringMap = {};
  disabled = false;
  hidden = false;
  textContent = "";
  title = "";
  children: FakeElement[] = [];
  private readonly listeners = new Map<string, EventListener[]>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  querySelectorAll<T>(): T[] {
    return this.children as T[];
  }

  removeAttribute(name: string): void {
    if (name === "title") this.title = "";
  }

  click(): void {
    this.listeners.get("click")?.forEach((listener) => listener());
  }
}

function setup(invokeExport: ExportInvoker) {
  const section = new FakeElement();
  const editor = new FakeElement();
  const status = new FakeElement();
  const menuButton = new FakeElement();
  const pdfButton = new FakeElement();
  const docxButton = new FakeElement();
  pdfButton.dataset.exportFormat = "pdf";
  docxButton.dataset.exportFormat = "docx";
  section.children = [pdfButton, docxButton];
  const elements = new Map<string, FakeElement>([
    ["[data-document-export]", section],
    ["[data-document-editor]", editor],
    ["[data-export-status]", status],
    ["[data-export-open]", menuButton],
  ]);
  vi.stubGlobal("document", {
    documentElement: { lang: "", dataset: {} },
    querySelector: (selector: string) => elements.get(selector) ?? null,
    querySelectorAll: () => [],
    dispatchEvent: () => true,
  });
  vi.stubGlobal("getComputedStyle", () => ({
    fontFamily: "Georgia, serif",
    fontSize: "18px",
    lineHeight: "30.6px",
    color: "rgb(48, 44, 52)",
  }));
  const show = vi.fn().mockResolvedValue("ok");
  const showError = vi.fn().mockResolvedValue(undefined);
  const dialog = { show, showError } as unknown as AppDialog;
  const store = new DocumentStore();
  store.restoreDraft("Brouillon.md", "# Source\n\nContenu **Markdown**.");
  new DocumentExportController(store, dialog, invokeExport).initialize();
  return { docxButton, menuButton, pdfButton, show, showError, status, store };
}

describe("DocumentExportController", () => {
  beforeEach(() => {
    vi.stubGlobal("document", {
      documentElement: { lang: "", dataset: {} },
      querySelectorAll: () => [],
      dispatchEvent: () => true,
    });
    setLocale("fr");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("expose une entrée Exporter dans le menu principal", () => {
    expect(renderAppShell()).toContain("data-export-open");
  });

  it.each([
    ["PDF", "pdf"],
    ["DOCX", "docx"],
  ] as const)("exporte une copie %s sans modifier le Markdown source", async (_, format) => {
    const invokeExport = vi.fn<ExportInvoker>().mockResolvedValue({
      path: `C:/Exports/Brouillon.${format}`,
      name: `Brouillon.${format}`,
    });
    const context = setup(invokeExport);
    const sourceBefore = context.store.current.content;

    (format === "pdf" ? context.pdfButton : context.docxButton).click();

    await vi.waitFor(() => expect(invokeExport).toHaveBeenCalledOnce());
    expect(invokeExport.mock.calls[0][0]).toMatchObject({
      format,
      sourceName: "Brouillon.md",
      content: sourceBefore,
      locale: "fr",
    });
    expect(context.store.current.content).toBe(sourceBefore);
    await vi.waitFor(() => expect(context.show).toHaveBeenCalledWith(expect.objectContaining({
      title: "Export terminé",
    })));
  });

  it("traite l’annulation de la boîte de destination sans erreur", async () => {
    const invokeExport = vi.fn<ExportInvoker>().mockResolvedValue(null);
    const context = setup(invokeExport);

    context.pdfButton.click();

    await vi.waitFor(() => expect(invokeExport).toHaveBeenCalledOnce());
    expect(context.status.textContent).toBe("Export annulé.");
    expect(context.showError).not.toHaveBeenCalled();
  });

  it("affiche une erreur claire lorsque l’écriture échoue", async () => {
    const invokeExport = vi.fn<ExportInvoker>().mockRejectedValue({ code: "export_write_error" });
    const context = setup(invokeExport);

    context.docxButton.click();

    await vi.waitFor(() => expect(context.showError).toHaveBeenCalledWith(
      "Export impossible.",
      "La copie exportée n’a pas pu être écrite à l’emplacement choisi.",
    ));
    expect(context.status.textContent).toBe("Export impossible.");
  });

  it.each([
    ["fr", "Exporter", "Exporter en PDF", "Exporter en DOCX"],
    ["en", "Export", "Export as PDF", "Export as DOCX"],
  ] as const)("présente le choix des formats en %s", async (locale, title, pdfLabel, docxLabel) => {
    setLocale(locale as Locale);
    const invokeExport = vi.fn<ExportInvoker>();
    const context = setup(invokeExport);
    context.show.mockResolvedValueOnce("cancel");

    context.menuButton.click();

    await vi.waitFor(() => expect(context.show).toHaveBeenCalledOnce());
    const options = context.show.mock.calls[0][0];
    expect(options.title).toBe(title);
    expect(options.actions.map((action: { label: string }) => action.label)).toEqual([
      locale === "fr" ? "Annuler" : "Cancel",
      pdfLabel,
      docxLabel,
    ]);
    expect(invokeExport).not.toHaveBeenCalled();
  });
});
