const RECOVERY_DRAFT_KEY = "plum3.recovery-draft.v1";

export interface RecoveryDraft {
  name: string;
  content: string;
  savedAt: string;
}

export class RecoveryDraftService {
  load(): RecoveryDraft | null {
    try {
      const serialized = localStorage.getItem(RECOVERY_DRAFT_KEY);
      if (!serialized) return null;
      const candidate = JSON.parse(serialized) as Partial<RecoveryDraft>;
      if (
        typeof candidate.name !== "string" ||
        typeof candidate.content !== "string" ||
        typeof candidate.savedAt !== "string"
      ) {
        localStorage.removeItem(RECOVERY_DRAFT_KEY);
        return null;
      }
      return candidate as RecoveryDraft;
    } catch {
      return null;
    }
  }

  save(document: { name: string; content: string }): void {
    const draft: RecoveryDraft = {
      name: document.name,
      content: document.content,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(RECOVERY_DRAFT_KEY, JSON.stringify(draft));
  }

  clear(): void {
    try {
      localStorage.removeItem(RECOVERY_DRAFT_KEY);
    } catch {
      // La suppression d’un ancien brouillon ne doit jamais bloquer le document actif.
    }
  }
}

export function recoveredDocumentName(name: string): string {
  return name.startsWith("Brouillon récupéré - ") ? name : `Brouillon récupéré - ${name}`;
}
