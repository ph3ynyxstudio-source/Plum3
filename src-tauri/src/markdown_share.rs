use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime,
};

const PLUGIN_IDENTIFIER: &str = "os.ph3ynyx.plum3";

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownShareRequest {
    source_name: String,
    content: String,
    chooser_title: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct MarkdownShareResult {
    name: String,
}

struct AndroidMarkdownShare<R: Runtime>(PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("markdown-share")
        .setup(|app, api| {
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "MarkdownSharePlugin")?;
            app.manage(AndroidMarkdownShare(handle));
            Ok(())
        })
        .build()
}

#[tauri::command]
pub fn share_markdown_document<R: Runtime>(
    app: AppHandle<R>,
    request: MarkdownShareRequest,
) -> Result<MarkdownShareResult, String> {
    app.state::<AndroidMarkdownShare<R>>()
        .0
        .run_mobile_plugin("share", request)
        .map_err(|error| error.to_string())
}
