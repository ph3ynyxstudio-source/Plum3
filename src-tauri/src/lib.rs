mod document_export;
mod file_commands;
mod recent_documents;

use document_export::export_document;
use file_commands::{
    choose_document_save_path, choose_document_to_open, list_recent_documents,
    open_recent_document, rename_document, save_document, AuthorizedPaths,
};
use recent_documents::RecentDocuments;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AuthorizedPaths::default())
        .setup(|app| {
            let storage_path = app.path().app_data_dir()?.join("recent-documents.txt");
            app.manage(RecentDocuments::load(storage_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            export_document,
            choose_document_to_open,
            list_recent_documents,
            open_recent_document,
            choose_document_save_path,
            save_document,
            rename_document
        ])
        .run(tauri::generate_context!())
        .expect("erreur pendant l’exécution de Plum3 de Nyx");
}
