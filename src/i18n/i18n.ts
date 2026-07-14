import { en, fr, type TranslationKey } from "./translations";

export type Locale = "fr" | "en";
type Parameters = Record<string, string | number>;
type LocaleListener = (locale: Locale) => void;

const STORAGE_KEY = "plum3.locale.v1";
const listeners = new Set<LocaleListener>();
let activeLocale: Locale = readStoredLocale();

function readStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

export function getLocale(): Locale {
  return activeLocale;
}

export function localeTag(): "fr-CA" | "en-CA" {
  return activeLocale === "en" ? "en-CA" : "fr-CA";
}

export function t(key: TranslationKey | string, parameters: Parameters = {}): string {
  const dictionary = activeLocale === "en" ? en : fr;
  const fallback = fr[key as TranslationKey];
  let value = dictionary[key as TranslationKey] ?? fallback ?? key;
  const count = typeof parameters.count === "number" ? parameters.count : null;
  if (value.includes("|")) {
    const forms = value.split("|");
    value = count === 1 ? forms[0] : forms[1] ?? forms[0];
  }
  return value.replace(/\{(\w+)\}/gu, (_, name: string) => {
    const parameter = parameters[name];
    if (name === "count" && typeof parameter === "number") return parameter.toLocaleString(localeTag());
    return String(parameter ?? `{${name}}`);
  });
}

export function setLocale(locale: Locale): void {
  activeLocale = locale === "en" ? "en" : "fr";
  try {
    localStorage.setItem(STORAGE_KEY, activeLocale);
  } catch {
    // The interface still changes for this session if local storage is unavailable.
  }
  translateDocument();
  listeners.forEach((listener) => listener(activeLocale));
  document.dispatchEvent(new CustomEvent("plum3:locale-change", { detail: { locale: activeLocale } }));
}

export function subscribeLocale(listener: LocaleListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function translateDocument(root: ParentNode = document): void {
  document.documentElement.lang = activeLocale;
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (key) element.textContent = t(key);
  });
  const attributes = ["aria-label", "title", "placeholder", "label"] as const;
  attributes.forEach((attribute) => {
    const dataName = `i18n${attribute.replace(/(^|-)(\w)/gu, (_, __, letter: string) => letter.toUpperCase())}`;
    root.querySelectorAll<HTMLElement>(`[data-i18n-${attribute}]`).forEach((element) => {
      const key = element.dataset[dataName as keyof DOMStringMap];
      if (key) element.setAttribute(attribute, t(key));
    });
  });
}
