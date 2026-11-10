package expo.modules.audiomode

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AudioModeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioMode")

    Function("getRingerMode") {
      val context = appContext.reactContext ?: return@Function AudioManager.RINGER_MODE_NORMAL
      val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return@Function AudioManager.RINGER_MODE_NORMAL
      return@Function audioManager.ringerMode
    }

    Function("isNormalSoundMode") {
      val context = appContext.reactContext ?: return@Function true
      val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return@Function true
      return@Function audioManager.ringerMode == AudioManager.RINGER_MODE_NORMAL
    }
  }
}
