use super::{
    CreateLibraryDocument, LibraryDocument, LibraryDocumentContent, LibraryRepository,
    RecoveryDraftMigrationRequest, RecoveryDraftMigrationResult,
    RecoveryDraftMigrationVerification,
};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLibraryDocumentRequest {
    title: String,
    content: String,
    template_type: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveLibraryDocumentRequest {
    document_id: String,
    content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenLibraryDocumentRequest {
    document_id: String,
}

#[tauri::command]
pub fn migrate_recovery_draft(
    request: RecoveryDraftMigrationRequest,
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<RecoveryDraftMigrationResult, String> {
    repository
        .migrate_recovery_draft(request)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn verify_recovery_draft_migration(
    request: RecoveryDraftMigrationVerification,
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<LibraryDocument, String> {
    repository
        .verify_recovery_draft_migration(&request.document_id, &request.source_saved_at)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn load_active_library_document(
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<Option<LibraryDocumentContent>, String> {
    repository
        .read_active_document()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_library_document(
    request: CreateLibraryDocumentRequest,
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<LibraryDocument, String> {
    repository
        .create_document(CreateLibraryDocument {
            title: request.title,
            content: request.content,
            template_type: request.template_type,
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_library_document(
    request: SaveLibraryDocumentRequest,
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<LibraryDocument, String> {
    repository
        .save_document(&request.document_id, &request.content)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_library_documents(
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<Vec<LibraryDocument>, String> {
    repository
        .list_documents()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_library_document(
    request: OpenLibraryDocumentRequest,
    repository: tauri::State<'_, LibraryRepository>,
) -> Result<LibraryDocumentContent, String> {
    repository
        .open_document(&request.document_id)
        .map_err(|error| error.to_string())
}
