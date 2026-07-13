mod file_commands;

use file_commands::{
    choose_document_save_path, choose_document_to_open, rename_document, save_document, AuthorizedPaths,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AuthorizedPaths::default())
        .invoke_handler(tauri::generate_handler![
            choose_document_to_open,
            choose_document_save_path,
            save_document,
            rename_document
        ])
        .run(tauri::generate_context!())
        .expect("erreur pendant l’exécution de Plum3 de Nyx");
}
