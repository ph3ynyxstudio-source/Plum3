package os.ph3ynyx.plum3

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin

@TauriPlugin
class AndroidAppPlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun finish(invoke: Invoke) {
    invoke.resolve()
    activity.finish()
  }
}
