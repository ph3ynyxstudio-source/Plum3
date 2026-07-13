export type ThemeName = "aube" | "nuit";

const STORAGE_KEY = "plum3-theme";

export function getInitialTheme(): ThemeName {
  const savedTheme = localStorage.getItem(STORAGE_KEY);
  if (savedTheme === "aube" || savedTheme === "nuit") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "nuit" : "aube";
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
    const isActive = button.dataset.themeOption === theme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.dispatchEvent(new CustomEvent("plum3:theme-change", { detail: { theme } }));
}
