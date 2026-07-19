package os.ph3ynyx.plum3

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.nio.charset.StandardCharsets

@InvokeArg
class MarkdownShareArgs {
  lateinit var sourceName: String
  lateinit var content: String
  lateinit var chooserTitle: String
}

@TauriPlugin
class MarkdownSharePlugin(private val activity: Activity) : Plugin(activity) {
  @Command
  fun share(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(MarkdownShareArgs::class.java)
      val shareDirectory = File(activity.cacheDir, SHARE_DIRECTORY)
      if (!shareDirectory.exists() && !shareDirectory.mkdirs()) {
        throw IllegalStateException("Impossible de créer le dossier de partage Markdown.")
      }
      shareDirectory.listFiles()?.forEach { staleFile ->
        if (staleFile.isFile) staleFile.delete()
      }

      val file = File(shareDirectory, safeMarkdownName(args.sourceName))
      file.writeText(args.content, StandardCharsets.UTF_8)
      val uri = FileProvider.getUriForFile(
        activity,
        "${activity.packageName}.fileprovider",
        file,
      )
      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = MARKDOWN_MIME_TYPE
        putExtra(Intent.EXTRA_STREAM, uri)
        clipData = ClipData.newRawUri(file.name, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      activity.startActivity(Intent.createChooser(shareIntent, args.chooserTitle))

      invoke.resolve(JSObject().apply { put("name", file.name) })
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Le partage Markdown a échoué.")
    }
  }

  private fun safeMarkdownName(sourceName: String): String {
    val withoutPath = sourceName.substringAfterLast('/').substringAfterLast('\\')
    val withoutExtension = withoutPath.replace(Regex("(?i)\\.md$"), "")
    val cleaned = withoutExtension
      .replace(Regex("[\\\\/:*?\"<>|\\u0000-\\u001F]"), "_")
      .trim()
      .trim('.')
      .ifBlank { DEFAULT_DOCUMENT_NAME }
      .take(MAX_BASE_NAME_LENGTH)
      .trimEnd()
      .ifBlank { DEFAULT_DOCUMENT_NAME }
    return "$cleaned.md"
  }

  private companion object {
    const val SHARE_DIRECTORY = "markdown-shares"
    const val MARKDOWN_MIME_TYPE = "text/markdown"
    const val DEFAULT_DOCUMENT_NAME = "Sans titre"
    const val MAX_BASE_NAME_LENGTH = 116
  }
}
