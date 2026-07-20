#[cfg(target_os = "android")]
mod android_app;
mod document_export;
mod file_commands;
pub mod library;
#[cfg(target_os = "android")]
mod markdown_share;
mod recent_documents;

#[cfg(target_os = "android")]
use android_app::close_android_app;
use document_export::export_document;
use file_commands::{
    choose_document_save_path, choose_document_to_open, list_recent_documents,
    open_recent_document, remove_recent_document, rename_document, save_document, AuthorizedPaths,
};
#[cfg(target_os = "android")]
use library::{
    create_library_document, delete_library_document, list_library_documents,
    load_active_library_document, migrate_recovery_draft, open_library_document,
    read_library_document, rename_library_document, save_library_document,
    verify_recovery_draft_migration, LibraryRepository,
};
#[cfg(target_os = "android")]
use markdown_share::share_markdown_document;
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
    let builder = tauri::Builder::default();
    #[cfg(target_os = "android")]
    let builder = builder
        .plugin(android_app::init())
        .plugin(markdown_share::init());

    builder
        .plugin(tauri_plugin_opener::init())
        .manage(AuthorizedPaths::default())
        .setup(|app| {
            #[cfg(target_os = "android")]
            {
                let app_data_root = app.path().app_data_dir()?;
                app.manage(LibraryRepository::new(app_data_root));
            }
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let icon = tauri::image::Image::from_bytes(include_bytes!(
                        "../../assets/favicon-plume3.png"
                    ))?;
                    window.set_icon(icon)?;
                }
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
            #[cfg(target_os = "android")]
            share_markdown_document,
            #[cfg(target_os = "android")]
            migrate_recovery_draft,
            #[cfg(target_os = "android")]
            verify_recovery_draft_migration,
            #[cfg(target_os = "android")]
            load_active_library_document,
            #[cfg(target_os = "android")]
            create_library_document,
            #[cfg(target_os = "android")]
            save_library_document,
            #[cfg(target_os = "android")]
            list_library_documents,
            #[cfg(target_os = "android")]
            open_library_document,
            #[cfg(target_os = "android")]
            read_library_document,
            #[cfg(target_os = "android")]
            rename_library_document,
            #[cfg(target_os = "android")]
            delete_library_document,
            #[cfg(target_os = "android")]
            close_android_app,
            get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("erreur pendant l’exécution de Plum3");
}
