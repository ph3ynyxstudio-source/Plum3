import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginListener } from "@tauri-apps/api/core";
import { FocusModeController, type AndroidBackRegistrar } from "./focus-mode-controller";

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
  private readonly listeners = new Map<string, Array<() => void>>();
  private readonly attributes = new Map<string, string>();
  textContent = "";

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  click(): void {
    this.listeners.get("click")?.forEach((listener) => listener());
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

describe("FocusModeController sur Android", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("quitte le mode concentration avec le bouton Retour natif", async () => {
    const shell = new FakeElement();
    const toggle = new FakeElement();
    const label = new FakeElement();
    const editor = new FakeElement();
    const elements = new Map<string, FakeElement>([
      [".app-shell", shell],
      ["[data-focus-mode-toggle]", toggle],
      ["[data-focus-mode-label]", label],
      ["[data-document-editor]", editor],
    ]);
    vi.stubGlobal("document", {
      querySelector: (selector: string) => elements.get(selector) ?? null,
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      documentElement: { lang: "fr" },
    });
    const unregister = vi.fn().mockResolvedValue(undefined);
    let backHandler: (() => void) | undefined;
    const register = vi.fn(async (handler: () => void) => {
      backHandler = handler;
      return { unregister } as unknown as PluginListener;
    }) as unknown as AndroidBackRegistrar;
    const controller = new FocusModeController(true, register);
    controller.initialize();

    toggle.click();
    await vi.waitFor(() => expect(register).toHaveBeenCalledOnce());
    expect(shell.classList.contains("is-focus-mode")).toBe(true);

    backHandler?.();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalledOnce());
    expect(shell.classList.contains("is-focus-mode")).toBe(false);
  });
});
