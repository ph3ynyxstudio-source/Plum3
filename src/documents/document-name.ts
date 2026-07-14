const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const INVALID_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/u;

export class DocumentNameError extends Error {}

export function displayDocumentName(name: string): string {
  return name.replace(/\.md$/iu, "");
}

export function validatedDocumentName(input: string, currentName: string): string {
  const value = input.trim();
  if (!value) throw new DocumentNameError(t("rename.empty"));
  if (value === "." || value === ".." || value.endsWith(".") || value.endsWith(" ")) {
    throw new DocumentNameError(t("rename.windowsInvalid"));
  }
  if (INVALID_CHARACTERS.test(value) || WINDOWS_RESERVED_NAMES.test(value)) {
    throw new DocumentNameError(t("rename.invalidCharacters"));
  }

  const currentExtension = currentName.toLowerCase().endsWith(".txt") ? ".txt" : ".md";
  const submittedExtension = value.match(/\.(md|txt)$/iu)?.[0]?.toLowerCase();
  const baseName = submittedExtension ? value.slice(0, -submittedExtension.length) : value;
  if (!baseName.trim()) throw new DocumentNameError(t("rename.missingBase"));
  if (submittedExtension && submittedExtension !== currentExtension) {
    throw new DocumentNameError(t("rename.keepExtension", { extension: currentExtension }));
  }
  return `${baseName}${currentExtension}`;
}
import { t } from "../i18n/i18n";
