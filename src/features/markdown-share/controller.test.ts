import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentStore } from "../../documents/document-state";
import { setLocale } from "../../i18n/i18n";
import type { AppDialog } from "../../ui/app-dialog";
import {
  MarkdownShareController,
  type MarkdownShareInvoker,
} from "./controller";

type EventListener = () => void;

class FakeElement {
  disabled = false;
  hidden = true;
  textContent = "";
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, EventListener[]>();

  constructor(private readonly child: FakeElement | null = null) {}

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  querySelector<T>(): T | null {
    return this.child as T | null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  click(): void {
    this.listeners.get("click")?.forEach((listener) => listener());
  }
}

function setup(invokeShare: MarkdownShareInvoker, android: boolean) {
  const label = new FakeElement();
  label.textContent = "Partager en Markdown";
  const button = new FakeElement(label);
  const root = {
    querySelector: (selector: string) =>
      selector === "[data-share-markdown]" ? button : null,
  } as unknown as ParentNode;
  const showError = vi.fn().mockResolvedValue(undefined);
  const dialog = { showError } as unknown as AppDialog;
  const store = new DocumentStore();
  store.createFromTemplate("Mon roman.md", "# Chapitre 1");

  new MarkdownShareController(
    store,
    dialog,
    invokeShare,
    android,
    root,
  ).initialize();

  return { button, label, showError };
}

describe("MarkdownShareController", () => {
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

  it("partage le nom et le contenu Markdown actuels uniquement sur Android", async () => {
    const invokeShare = vi.fn<MarkdownShareInvoker>().mockResolvedValue({ name: "Mon roman.md" });
    const { button } = setup(invokeShare, true);

    expect(button.hidden).toBe(false);
    button.click();
    await vi.waitFor(() => expect(invokeShare).toHaveBeenCalledOnce());
    expect(invokeShare).toHaveBeenCalledWith({
      sourceName: "Mon roman.md",
      content: "# Chapitre 1",
      chooserTitle: "Partager le document Markdown",
    });
  });

  it("reste masqué et inactif sur Windows", () => {
    const invokeShare = vi.fn<MarkdownShareInvoker>();
    const { button } = setup(invokeShare, false);

    button.click();
    expect(button.hidden).toBe(true);
    expect(invokeShare).not.toHaveBeenCalled();
  });

  it("réactive le bouton et affiche une erreur si le partage natif échoue", async () => {
    const invokeShare = vi.fn<MarkdownShareInvoker>().mockRejectedValue(new Error("échec"));
    const { button, label, showError } = setup(invokeShare, true);
    button.click();

    await vi.waitFor(() => expect(showError).toHaveBeenCalledOnce());
    expect(showError).toHaveBeenCalledWith(
      "Partage impossible",
      "Le fichier Markdown n’a pas pu être préparé ou partagé.",
    );
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(label.textContent).toBe("Partager en Markdown");
  });
});
