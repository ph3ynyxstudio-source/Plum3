import { invoke } from "@tauri-apps/api/core";
import { isAndroid } from "../platform/platform";
import {
  RecoveryDraftService,
  type RecoveryDraft,
} from "./recovery-draft";

const RECOVERED_DRAFT_TITLE = "Brouillon récupéré";

export interface LibraryDocument {
  id: string;
  projectId: string | null;
  title: string;
  fileName: string;
  templateType: string | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export interface RecoveryDraftMigrationRequest {
  name: string;
  content: string;
  savedAt: string;
  templateType: string | null;
}

export interface RecoveryDraftMigrationResult {
  document: LibraryDocument;
  created: boolean;
}

export interface RecoveryDraftMigrationVerification {
  documentId: string;
  sourceSavedAt: string;
}

export type RecoveryDraftMigrationInvoker = (
  request: RecoveryDraftMigrationRequest,
) => Promise<RecoveryDraftMigrationResult>;

export type RecoveryDraftVerificationInvoker = (
  request: RecoveryDraftMigrationVerification,
) => Promise<LibraryDocument>;

const invokeMigration: RecoveryDraftMigrationInvoker = (request) =>
  invoke<RecoveryDraftMigrationResult>("migrate_recovery_draft", { request });

const invokeVerification: RecoveryDraftVerificationInvoker = (request) =>
  invoke<LibraryDocument>("verify_recovery_draft_migration", { request });

export class RecoveryDraftMigrationController {
  constructor(
    private readonly drafts: RecoveryDraftService,
    private readonly migrate: RecoveryDraftMigrationInvoker = invokeMigration,
    private readonly verify: RecoveryDraftVerificationInvoker = invokeVerification,
    private readonly android = isAndroid(),
  ) {}

  async initialize(): Promise<RecoveryDraftMigrationResult | null> {
    if (!this.android) return null;
    const draft = this.drafts.loadForMigration();
    if (!draft || draft.content.trim().length === 0) return null;

    try {
      const result = await this.migrate(this.toRequest(draft));
      const verified = await this.verify({
        documentId: result.document.id,
        sourceSavedAt: draft.savedAt,
      });
      if (verified.id !== result.document.id) return null;
      this.drafts.clearIfUnchanged(draft);
      return result;
    } catch {
      return null;
    }
  }

  private toRequest(draft: RecoveryDraft): RecoveryDraftMigrationRequest {
    return {
      name: draft.name.trim().length > 0 ? draft.name : RECOVERED_DRAFT_TITLE,
      content: draft.content,
      savedAt: draft.savedAt,
      templateType: null,
    };
  }
}
