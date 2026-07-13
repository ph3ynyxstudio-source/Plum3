import { invoke } from "@tauri-apps/api/core";
import type { FileVersion } from "../documents/document-state";

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
      return new FileServiceError(value.code, value.message);
    }
  }

  if (typeof cause === "string") {
    try {
      const parsed = JSON.parse(cause) as { code?: unknown; message?: unknown };
      if (typeof parsed.code === "string" && typeof parsed.message === "string") {
        return new FileServiceError(parsed.code, parsed.message);
      }
    } catch {
      return new FileServiceError("unknown", cause);
    }
  }

  return new FileServiceError(
    "unknown",
    "Une erreur inattendue empêche l’opération sur le fichier.",
  );
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
    return call<LoadedDocument | null>("choose_document_to_open");
  }

  chooseSavePath(suggestedName: string): Promise<SaveTarget | null> {
    return call<SaveTarget | null>("choose_document_save_path", { suggestedName });
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
