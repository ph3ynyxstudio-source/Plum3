package os.ph3ynyx.plum3

import android.app.Activity
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.util.UUID

@InvokeArg
class SaveExportArgs {
  lateinit var sourcePath: String
  lateinit var suggestedName: String
  lateinit var mimeType: String
}

@InvokeArg
class ShareExportArgs {
  lateinit var exportId: String
  lateinit var chooserTitle: String
}

private data class SavedExport(
  val id: String,
  val uri: Uri,
  val name: String,
  val mimeType: String,
)

@TauriPlugin
class DocumentExportPlugin(private val activity: Activity) : Plugin(activity) {
  @Volatile
  private var lastExport: SavedExport? = null

  @Command
  fun save(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(SaveExportArgs::class.java)
      validateMimeType(args.mimeType)
      val source = validatedSourceFile(args.sourcePath)
      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = args.mimeType
        putExtra(Intent.EXTRA_TITLE, safeExportName(args.suggestedName, args.mimeType))
      }
      if (!source.isFile) {
        throw IllegalArgumentException("Le fichier temporaire d’export est introuvable.")
      }
      startActivityForResult(invoke, intent, "saveResult")
    } catch (error: Exception) {
      deleteTemporaryFile(invoke)
      invoke.reject(error.message ?: "Impossible de préparer l’export Android.")
    }
  }

  @ActivityCallback
  fun saveResult(invoke: Invoke, result: ActivityResult) {
    val args = invoke.parseArgs(SaveExportArgs::class.java)
    val source = try {
      validatedSourceFile(args.sourcePath)
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Le fichier temporaire d’export est invalide.")
      return
    }

    if (result.resultCode == Activity.RESULT_CANCELED) {
      source.delete()
      invoke.resolve(JSObject().apply { put("cancelled", true) })
      return
    }
    if (result.resultCode != Activity.RESULT_OK) {
      source.delete()
      invoke.reject("Le sélecteur Android n’a pas pu enregistrer le fichier.")
      return
    }
    val uri = result.data?.data
    if (uri == null) {
      source.delete()
      invoke.reject("Aucun emplacement d’export n’a été retourné.")
      return
    }

    Thread {
      try {
        activity.contentResolver.openOutputStream(uri, "w")?.use { output ->
          source.inputStream().use { input -> input.copyTo(output) }
        } ?: throw IllegalStateException("L’emplacement choisi ne peut pas être écrit.")

        val name = displayName(uri) ?: safeExportName(args.suggestedName, args.mimeType)
        val saved = SavedExport(
          id = UUID.randomUUID().toString(),
          uri = uri,
          name = name,
          mimeType = args.mimeType,
        )
        lastExport = saved
        invoke.resolve(JSObject().apply {
          put("cancelled", false)
          put("exportId", saved.id)
          put("name", saved.name)
          put("mimeType", saved.mimeType)
        })
      } catch (error: Exception) {
        invoke.reject(error.message ?: "La copie exportée n’a pas pu être écrite.")
      } finally {
        source.delete()
      }
    }.start()
  }

  @Command
  fun share(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(ShareExportArgs::class.java)
      val saved = lastExport
        ?.takeIf { it.id == args.exportId }
        ?: throw IllegalArgumentException("Cet export n’est plus disponible pour le partage.")
      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = saved.mimeType
        putExtra(Intent.EXTRA_STREAM, saved.uri)
        clipData = ClipData.newRawUri(saved.name, saved.uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      activity.startActivity(Intent.createChooser(shareIntent, args.chooserTitle))
      invoke.resolve()
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Le partage de l’export a échoué.")
    }
  }

  private fun validatedSourceFile(sourcePath: String): File {
    val root = File(activity.cacheDir, EXPORT_DIRECTORY).canonicalFile
    val source = File(sourcePath).canonicalFile
    if (source.parentFile != root) {
      throw SecurityException("Le fichier d’export se trouve hors du cache autorisé.")
    }
    return source
  }

  private fun deleteTemporaryFile(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(SaveExportArgs::class.java)
      validatedSourceFile(args.sourcePath).delete()
    } catch (_: Exception) {
      // Le chemin invalide ne doit jamais provoquer une seconde erreur.
    }
  }

  private fun validateMimeType(mimeType: String) {
    if (mimeType != PDF_MIME_TYPE && mimeType != DOCX_MIME_TYPE) {
      throw IllegalArgumentException("Type d’export Android non pris en charge.")
    }
  }

  private fun safeExportName(name: String, mimeType: String): String {
    val extension = if (mimeType == PDF_MIME_TYPE) ".pdf" else ".docx"
    val withoutPath = name.substringAfterLast('/').substringAfterLast('\\')
    val withoutExtension = withoutPath.replace(Regex("(?i)\\.(pdf|docx)$"), "")
    val cleaned = withoutExtension
      .replace(Regex("[\\\\/:*?\"<>|\\u0000-\\u001F]"), "_")
      .trim()
      .trim('.')
      .ifBlank { DEFAULT_DOCUMENT_NAME }
      .take(MAX_BASE_NAME_LENGTH)
      .trimEnd()
      .ifBlank { DEFAULT_DOCUMENT_NAME }
    return "$cleaned$extension"
  }

  private fun displayName(uri: Uri): String? {
    return activity.contentResolver.query(
      uri,
      arrayOf(OpenableColumns.DISPLAY_NAME),
      null,
      null,
      null,
    )?.use { cursor ->
      if (!cursor.moveToFirst()) return@use null
      val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      if (index < 0) null else cursor.getString(index)
    }
  }

  private companion object {
    const val EXPORT_DIRECTORY = "document-exports"
    const val PDF_MIME_TYPE = "application/pdf"
    const val DOCX_MIME_TYPE =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    const val DEFAULT_DOCUMENT_NAME = "Document"
    const val MAX_BASE_NAME_LENGTH = 112
  }
}
