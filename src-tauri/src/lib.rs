mod document_export;
mod file_commands;
mod recent_documents;

use document_export::export_document;
use file_commands::{
    choose_document_save_path, choose_document_to_open, list_recent_documents,
    open_recent_document, remove_recent_document, rename_document, save_document, AuthorizedPaths,
};
use recent_documents::RecentDocuments;
use tauri::Manager;

#[derive(serde::Serialize)]
struct AppInfo {
    os: &'static str,
    arch: &'static str,
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AuthorizedPaths::default())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let icon = tauri::image::Image::from_bytes(include_bytes!(
                    "../../assets/favicon-plume3.png"
                ))?;
                window.set_icon(icon)?;
            }
            let storage_path = app.path().app_data_dir()?.join("recent-documents.txt");
            app.manage(RecentDocuments::load(storage_path));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            export_document,
            choose_document_to_open,
            list_recent_documents,
            remove_recent_document,
            open_recent_document,
            choose_document_save_path,
            save_document,
            rename_document,
            get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("erreur pendant l’exécution de Plum3");
}
