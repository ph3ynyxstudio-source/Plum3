import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginListener } from "@tauri-apps/api/core";
import {
  AndroidBackController,
  type AndroidBackRegistrar,
  type AppCloseRequester,
} from "./android-back-controller";

class FakeClassList {
  constructor(private readonly values = new Set<string>()) {}

  contains(value: string): boolean {
    return this.values.has(value);
  }
}

class FakeElement {
  readonly click = vi.fn();
  readonly dispatchEvent = vi.fn();
  readonly children = new Map<string, FakeElement>();
  hidden = false;
  classList = new FakeClassList();
  dataset: Record<string, string> = {};

  querySelector<T>(selector: string): T | null {
    return (this.children.get(selector) ?? null) as T | null;
  }
}

function setup(elements: Map<string, FakeElement>, android = true) {
  let backHandler: (() => void) | undefined;
  const register = vi.fn(async (handler: () => void) => {
    backHandler = handler;
    return { unregister: vi.fn() } as unknown as PluginListener;
  }) as unknown as AndroidBackRegistrar;
  const closeApp = vi.fn<AppCloseRequester>().mockResolvedValue(undefined);
  const dispatchEvent = vi.fn();
  vi.stubGlobal("document", {
    querySelector: (selector: string) => elements.get(selector) ?? null,
    dispatchEvent,
  });
  vi.stubGlobal("KeyboardEvent", class {
    constructor(readonly type: string, readonly options: KeyboardEventInit) {}
  });
  new AndroidBackController(android, register, closeApp).initialize();
  return {
    closeApp,
    dispatchEvent,
    register,
    pressBack: async () => {
      await vi.waitFor(() => expect(register).toHaveBeenCalledOnce());
      backHandler?.();
    },
  };
}

describe("AndroidBackController", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ne s’enregistre pas sur Windows", () => {
    const context = setup(new Map(), false);
    expect(context.register).not.toHaveBeenCalled();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("ferme d’abord le dialogue applicatif visible", async () => {
    const dialog = new FakeElement();
    const cancel = new FakeElement();
    dialog.children.set("[data-dialog-actions] button", cancel);
    const context = setup(new Map([["[data-app-dialog]", dialog]]));

    await context.pressBack();

    expect(cancel.click).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("annule l’assistant de modèles avant les interfaces inférieures", async () => {
    const dialog = new FakeElement();
    const cancel = new FakeElement();
    dialog.children.set("[data-template-cancel]", cancel);
    const context = setup(new Map([["[data-template-dialog]", dialog]]));

    await context.pressBack();

    expect(cancel.click).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("revient de la page À propos avant de fermer les paramètres", async () => {
    const settings = new FakeElement();
    const about = new FakeElement();
    const aboutBack = new FakeElement();
    settings.children.set('[data-settings-view="about"]', about);
    settings.children.set("[data-about-back]", aboutBack);
    const context = setup(new Map([["[data-settings-dialog]", settings]]));

    await context.pressBack();

    expect(aboutBack.click).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("ferme les paramètres depuis leur vue principale", async () => {
    const settings = new FakeElement();
    const about = new FakeElement();
    const close = new FakeElement();
    about.hidden = true;
    settings.children.set('[data-settings-view="about"]', about);
    settings.children.set("[data-settings-close]", close);
    const context = setup(new Map([["[data-settings-dialog]", settings]]));

    await context.pressBack();

    expect(close.click).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("annule le renommage actif avant de fermer un panneau", async () => {
    const input = new FakeElement();
    const context = setup(new Map([["[data-document-title-input]", input]]));

    await context.pressBack();

    expect(input.dispatchEvent).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it.each([
    ["is-mobile-writing-open", ".mobile-writing-close"],
    ["is-mobile-left-open", ".collapse-left"],
    ["is-focus-mode", "[data-focus-mode-toggle]"],
  ])("ferme %s avec son contrôle existant", async (state, selector) => {
    const shell = new FakeElement();
    shell.classList = new FakeClassList(new Set([state]));
    const close = new FakeElement();
    const context = setup(new Map([
      [".app-shell", shell],
      [selector, close],
    ]));

    await context.pressBack();

    expect(close.click).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("donne priorité au mode concentration sur le panneau mobile", async () => {
    const shell = new FakeElement();
    shell.classList = new FakeClassList(new Set(["is-focus-mode", "is-mobile-left-open"]));
    const focus = new FakeElement();
    const panel = new FakeElement();
    const context = setup(new Map([
      [".app-shell", shell],
      ["[data-focus-mode-toggle]", focus],
      [".collapse-left", panel],
    ]));

    await context.pressBack();

    expect(focus.click).toHaveBeenCalledOnce();
    expect(panel.click).not.toHaveBeenCalled();
  });

  it("demande une sauvegarde puis la bibliothèque depuis l’éditeur", async () => {
    const shell = new FakeElement();
    shell.dataset.mobileView = "editor";
    const context = setup(new Map([[".app-shell", shell]]));

    await context.pressBack();

    expect(context.dispatchEvent).toHaveBeenCalledOnce();
    expect(context.closeApp).not.toHaveBeenCalled();
  });

  it("demande la fermeture normale quand aucune interface n’est ouverte", async () => {
    const context = setup(new Map());

    await context.pressBack();

    expect(context.closeApp).toHaveBeenCalledOnce();
  });
});
