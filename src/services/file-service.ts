import { invoke } from "@tauri-apps/api/core";
import type { FileVersion } from "../documents/document-state";
import { getLocale, t } from "../i18n/i18n";

export interface LoadedDocument {
  path: string;
  name: string;
  content: string;
  version: FileVersion;
}

export interface SaveTarget {
  path: string;
  name: string;
  exists: boolean;
}

export interface SaveResult {
  path: string;
  name: string;
  version: FileVersion;
}

export interface RecentDocument {
  path: string;
  name: string;
  modifiedMillis: number;
}

export class FileServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FileServiceError";
  }
}

function normalizeError(cause: unknown): FileServiceError {
  if (cause && typeof cause === "object") {
    const value = cause as { code?: unknown; message?: unknown };
    if (typeof value.code === "string" && typeof value.message === "string") {
      return new FileServiceError(value.code, localizedFileError(value.code));
    }
  }

  if (typeof cause === "string") {
    try {
      const parsed = JSON.parse(cause) as { code?: unknown; message?: unknown };
      if (typeof parsed.code === "string" && typeof parsed.message === "string") {
        return new FileServiceError(parsed.code, localizedFileError(parsed.code));
      }
    } catch {
      return new FileServiceError("unknown", t("error.unexpected"));
    }
  }

  return new FileServiceError(
    "unknown",
    t("error.unexpected"),
  );
}

function localizedFileError(code: string): string {
  const keys: Record<string, string> = {
    unsupported_type: "error.unsupportedType",
    path_error: "error.path",
    metadata_error: "error.read",
    read_error: "error.read",
    encoding_error: "error.encoding",
    not_authorized: "error.notAuthorized",
    already_exists: "error.alreadyExists",
    external_change: "error.externalChange",
    rename_error: "error.rename",
    write_error: "error.write",
  };
  return t(keys[code] ?? "error.unexpected");
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (cause) {
    throw normalizeError(cause);
  }
}

export class FileService {
  chooseDocumentToOpen(): Promise<LoadedDocument | null> {
    return call<LoadedDocument | null>("choose_document_to_open", { locale: getLocale() });
  }

  listRecentDocuments(): Promise<RecentDocument[]> {
    return call<RecentDocument[]>("list_recent_documents");
  }

  removeRecentDocument(path: string): Promise<boolean> {
    return call<boolean>("remove_recent_document", { path });
  }

  openRecentDocument(path: string): Promise<LoadedDocument> {
    return call<LoadedDocument>("open_recent_document", { path });
  }

  chooseSavePath(suggestedName: string): Promise<SaveTarget | null> {
    return call<SaveTarget | null>("choose_document_save_path", { suggestedName, locale: getLocale() });
  }

  save(request: {
    path: string;
    content: string;
    expectedVersion: FileVersion | null;
    allowOverwrite: boolean;
  }): Promise<SaveResult> {
    return call<SaveResult>("save_document", { request });
  }

  rename(path: string, newName: string): Promise<SaveResult> {
    return call<SaveResult>("rename_document", { path, newName });
  }
}
