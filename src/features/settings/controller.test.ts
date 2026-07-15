import { beforeEach, describe, expect, it, vi } from "vitest";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getTauriVersion, getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { setLocale, type Locale } from "../../i18n/i18n";
import type { AppDialog } from "../../ui/app-dialog";
import { buildFeedbackEmailUrl, SettingsController } from "./controller";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: vi.fn(), getTauriVersion: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockedOpenUrl = vi.mocked(openUrl);
const mockedGetVersion = vi.mocked(getVersion);
const mockedGetTauriVersion = vi.mocked(getTauriVersion);
const mockedInvoke = vi.mocked(invoke);

function parseFeedbackUrl(url: string): { recipient: string; subject: string; body: string } {
  const [address, query = ""] = url.slice("mailto:".length).split("?");
  const parameters = new URLSearchParams(query);
  return {
    recipient: address,
    subject: parameters.get("subject") ?? "",
    body: parameters.get("body") ?? "",
  };
}

interface FakeElement extends HTMLElement {
  click: () => void;
}

function fakeElement(dataset: DOMStringMap = {}): FakeElement {
  const listeners = new Map<string, EventListener>();
  return {
    hidden: false,
    textContent: "",
    dataset,
    classList: { toggle: vi.fn() },
    setAttribute: vi.fn(),
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === "function") listeners.set(type, listener);
    }),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    closest: vi.fn(() => null),
    focus: vi.fn(),
    click: () => listeners.get("click")?.(new Event("click")),
  } as unknown as FakeElement;
}

function installFakeDocument(): FakeElement {
  const feedbackButton = fakeElement();
  const localeButtons = [fakeElement({ localeOption: "fr" }), fakeElement({ localeOption: "en" })];
  const elements = new Map<string, FakeElement>([
    ["[data-settings-dialog]", fakeElement()],
    ['[data-settings-view="settings"]', fakeElement()],
    ['[data-settings-view="about"]', fakeElement()],
    ["[data-about-version]", fakeElement()],
    ["[data-about-system]", fakeElement()],
    ["[data-about-tauri]", fakeElement()],
    ["[data-about-copy-status]", fakeElement()],
    ["[data-about-year]", fakeElement()],
    ["[data-feedback-email]", feedbackButton],
  ]);
  const fakeDocument = {
    activeElement: null,
    documentElement: { lang: "fr" },
    querySelector: (selector: string) => elements.get(selector) ?? null,
    querySelectorAll: (selector: string) => selector === "[data-locale-option]" ? localeButtons : [],
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as Document;
  vi.stubGlobal("document", fakeDocument);
  return feedbackButton;
}

function createController(): { feedbackButton: FakeElement; showError: ReturnType<typeof vi.fn> } {
  const feedbackButton = installFakeDocument();
  const showError = vi.fn().mockResolvedValue(undefined);
  const dialog = { show: vi.fn(), showError } as unknown as AppDialog;
  const controller = new SettingsController(dialog);
  controller.initialize();
  return { feedbackButton, showError };
}

describe("courriel de retour utilisateur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeDocument();
    mockedGetVersion.mockResolvedValue("0.1.0");
    mockedGetTauriVersion.mockResolvedValue("2.0.0");
    mockedInvoke.mockResolvedValue({ os: "Windows", arch: "x86_64" });
    mockedOpenUrl.mockResolvedValue(undefined);
  });

  it.each([
    ["fr", "Retour Plum3 — version 0.1.0", "Type de retour :", "Autre", "Version de Windows :"],
    ["en", "Plum3 feedback — version 0.1.0", "Feedback type:", "Other", "Windows version:"],
  ] as const)("construit un mailto complet et localisé en %s", (locale, subject, typeLabel, otherLabel, windowsLabel) => {
    setLocale(locale as Locale);
    const result = parseFeedbackUrl(buildFeedbackEmailUrl("0.1.0"));

    expect(result.recipient).toBe("phey.rainville@hotmail.com");
    expect(result.subject).toBe(subject);
    expect(result.body).toContain(`${typeLabel}\r\n`);
    expect(result.body).toContain(otherLabel);
    expect(result.body).toContain("0.1.0");
    expect(result.body.endsWith(`${windowsLabel}\r\n`)).toBe(true);
    expect(result.body.toLowerCase()).not.toContain("attachment");
  });

  it("n’ouvre le client courriel qu’après un clic explicite", async () => {
    setLocale("fr");
    const { feedbackButton } = createController();
    expect(mockedOpenUrl).not.toHaveBeenCalled();

    feedbackButton.click();

    await vi.waitFor(() => expect(mockedOpenUrl).toHaveBeenCalledTimes(1));
    expect(mockedOpenUrl.mock.calls[0]?.[0]).toContain("mailto:phey.rainville@hotmail.com?");
  });

  it("affiche une erreur localisée si le client courriel ne peut pas être ouvert", async () => {
    setLocale("en");
    mockedOpenUrl.mockRejectedValueOnce(new Error("No email client"));
    const { feedbackButton, showError } = createController();

    feedbackButton.click();

    await vi.waitFor(() => expect(showError).toHaveBeenCalledWith(
      "Email not opened",
      "The email client could not be opened. Make sure an email application is configured.",
    ));
  });
});
