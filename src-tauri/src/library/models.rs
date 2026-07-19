use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDocument {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub file_name: String,
    pub template_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryDraftMigration {
    pub source_saved_at: String,
    pub document_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryDraftMigrationRequest {
    pub name: String,
    pub content: String,
    pub saved_at: String,
    pub template_type: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryDraftMigrationResult {
    pub document: LibraryDocument,
    pub created: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryDraftMigrationVerification {
    pub document_id: String,
    pub source_saved_at: String,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryMigrations {
    pub recovery_draft_v1: Option<RecoveryDraftMigration>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryIndex {
    pub schema_version: u32,
    pub active_document_id: Option<String>,
    pub migrations: LibraryMigrations,
    pub documents: Vec<LibraryDocument>,
}

impl Default for LibraryIndex {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            active_document_id: None,
            migrations: LibraryMigrations::default(),
            documents: Vec::new(),
        }
    }
}
