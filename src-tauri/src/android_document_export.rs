use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime,
};

const PLUGIN_IDENTIFIER: &str = "os.ph3ynyx.plum3";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveExportRequest {
    pub source_path: String,
    pub suggested_name: String,
    pub mime_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveExportResult {
    pub cancelled: bool,
    pub export_id: Option<String>,
    pub name: Option<String>,
    pub mime_type: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareExportRequest {
    pub export_id: String,
    pub chooser_title: String,
}

#[derive(Debug, Deserialize)]
struct EmptyResult {}

pub struct AndroidDocumentExport<R: Runtime>(PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("document-export")
        .setup(|app, api| {
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "DocumentExportPlugin")?;
            app.manage(AndroidDocumentExport(handle));
            Ok(())
        })
        .build()
}

pub fn save_export<R: Runtime>(
    app: &AppHandle<R>,
    request: SaveExportRequest,
) -> Result<SaveExportResult, String> {
    app.state::<AndroidDocumentExport<R>>()
        .0
        .run_mobile_plugin("save", request)
        .map_err(|error| error.to_string())
}

pub fn share_export<R: Runtime>(
    app: &AppHandle<R>,
    request: ShareExportRequest,
) -> Result<(), String> {
    app.state::<AndroidDocumentExport<R>>()
        .0
        .run_mobile_plugin::<EmptyResult>("share", request)
        .map(|_| ())
        .map_err(|error| error.to_string())
}
