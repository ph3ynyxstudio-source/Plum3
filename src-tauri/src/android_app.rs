use serde::Serialize;
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Manager, Runtime,
};

const PLUGIN_IDENTIFIER: &str = "os.ph3ynyx.plum3";

struct AndroidApp<R: Runtime>(PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("android-app")
        .setup(|app, api| {
            let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "AndroidAppPlugin")?;
            app.manage(AndroidApp(handle));
            Ok(())
        })
        .build()
}

#[derive(Serialize)]
struct EmptyRequest;

#[tauri::command]
pub fn close_android_app<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    app.state::<AndroidApp<R>>()
        .0
        .run_mobile_plugin("finish", EmptyRequest)
        .map_err(|error| error.to_string())
}
