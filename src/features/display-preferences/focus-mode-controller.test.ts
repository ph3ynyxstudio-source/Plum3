import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusModeController } from "./focus-mode-controller";

class FakeClassList {
  private readonly values = new Set<string>();

  toggle(value: string, force?: boolean): boolean {
    const active = force ?? !this.values.has(value);
    if (active) this.values.add(value);
    else this.values.delete(value);
    return active;
  }

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeElement {
  readonly classList = new FakeClassList();
  readonly focus = vi.fn();
  hidden = false;
  textContent = "";
  private readonly listeners = new Map<string, Array<(event: { key?: string; preventDefault: () => void }) => void>>();
  private readonly attributes = new Map<string, string>();

  addEventListener(
    type: string,
    listener: (event: { key?: string; preventDefault: () => void }) => void,
  ): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  click(): void {
    this.listeners.get("click")?.forEach((listener) => listener({ preventDefault: vi.fn() }));
  }

  dispatch(type: string, event: { key?: string; preventDefault: () => void }): void {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

describe("FocusModeController", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("quitte le mode concentration avec Échap, utilisé aussi par le contrôleur Retour Android", async () => {
    const shell = new FakeElement();
    const toggle = new FakeElement();
    const label = new FakeElement();
    const editor = new FakeElement();
    const documentListeners = new Map<string, Array<(event: { key?: string; preventDefault: () => void }) => void>>();
    const elements = new Map<string, FakeElement>([
      [".app-shell", shell],
      ["[data-focus-mode-toggle]", toggle],
      ["[data-focus-mode-label]", label],
      ["[data-document-editor]", editor],
    ]);
    vi.stubGlobal("document", {
      querySelector: (selector: string) => elements.get(selector) ?? null,
      addEventListener: (
        type: string,
        listener: (event: { key?: string; preventDefault: () => void }) => void,
      ) => documentListeners.set(type, [...(documentListeners.get(type) ?? []), listener]),
      dispatchEvent: vi.fn(),
      documentElement: { lang: "fr" },
    });
    const controller = new FocusModeController();
    controller.initialize();

    toggle.click();
    expect(shell.classList.contains("is-focus-mode")).toBe(true);

    const preventDefault = vi.fn();
    documentListeners.get("keydown")?.forEach((listener) => listener({ key: "Escape", preventDefault }));

    await vi.waitFor(() => expect(shell.classList.contains("is-focus-mode")).toBe(false));
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(toggle.focus).toHaveBeenCalledOnce();
  });
});
