package com.example.smtts

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.example.smtts.nfc.CccdNfcReader
import com.example.smtts.nfc.NfcResultBottomSheet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Base activity that provides global NFC foreground dispatch.
 *
 * When an NFC tag (IsoDep / CCCD chip) is detected, it:
 * 1. Vibrates the device for haptic feedback
 * 2. Shows a bottom sheet popup
 * 3. Attempts to read the chip with BAC data (if available)
 * 4. Displays parsed CCCD info or error
 *
 * Subclasses override [getNfcBacData] to provide BAC key data,
 * and [onNfcChipRead] / [onNfcReadFailed] for custom behavior.
 */
abstract class BaseNfcActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "BaseNfcActivity"
    }

    private var nfcAdapter: NfcAdapter? = null
    private val cccdReader = CccdNfcReader()
    private var nfcBottomSheet: NfcResultBottomSheet? = null
    private val nfcScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /**
     * Whether NFC popup should be shown when a tag is detected.
     * Subclasses can set this to false to handle NFC tags themselves.
     */
    protected var showNfcPopup: Boolean = true

    override fun onStart() {
        super.onStart()
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
    }

    override fun onResume() {
        super.onResume()
        enableNfcForegroundDispatch()
    }

    override fun onPause() {
        super.onPause()
        disableNfcForegroundDispatch()
    }

    override fun onDestroy() {
        super.onDestroy()
        nfcScope.cancel()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }
            if (tag != null) {
                handleNfcTag(tag)
            }
        }
    }

    fun isNfcAvailable(): Boolean = nfcAdapter != null

    /**
     * Override to provide BAC key data for reading the CCCD chip.
     * Return null if BAC data is not available (only tag serial will be shown).
     */
    protected open fun getNfcBacData(): NfcBacData? = null

    /**
     * Called after chip data is successfully read.
     */
    protected open fun onNfcChipRead(chipData: CccdNfcReader.CccdChipData) {}

    /**
     * Called when NFC tag is detected but chip read fails.
     */
    protected open fun onNfcReadFailed(tagSerial: String, error: String) {}

    /**
     * Called when NFC tag is detected but no BAC data is configured.
     */
    protected open fun onNfcNotConfigured(tagSerial: String) {}

    // ── Vibration ──────────────────────────────────────────

    private fun vibrateOnDetect() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                manager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Two short pulses: detected!
                vibrator.vibrate(
                    VibrationEffect.createWaveform(
                        longArrayOf(0, 80, 60, 80), // delay, buzz, pause, buzz
                        -1 // no repeat
                    )
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(longArrayOf(0, 80, 60, 80), -1)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Vibration failed: ${e.message}")
        }
    }

    // ── NFC Foreground Dispatch ────────────────────────────

    private fun enableNfcForegroundDispatch() {
        val adapter = nfcAdapter ?: return
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_MUTABLE
        )
        val techFilter = IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        val techList = arrayOf(arrayOf(IsoDep::class.java.name))
        adapter.enableForegroundDispatch(this, pendingIntent, arrayOf(techFilter), techList)
    }

    private fun disableNfcForegroundDispatch() {
        nfcAdapter?.disableForegroundDispatch(this)
    }

    // ── NFC Tag Handling ──────────────────────────────────

    private fun handleNfcTag(tag: Tag) {
        if (!showNfcPopup) return

        val tagSerial = tag.id?.joinToString("") { "%02x".format(it) } ?: "unknown"
        Log.d(TAG, "NFC tag detected, serial: $tagSerial")

        // Haptic feedback
        vibrateOnDetect()

        // Show or reuse bottom sheet
        val existing = supportFragmentManager.findFragmentByTag(NfcResultBottomSheet.TAG)
        if (existing is NfcResultBottomSheet) {
            existing.showLoading()
            nfcBottomSheet = existing
        } else {
            val bottomSheet = NfcResultBottomSheet.newInstance()
            nfcBottomSheet = bottomSheet
            bottomSheet.show(supportFragmentManager, NfcResultBottomSheet.TAG)
        }

        // Attempt to read chip data
        val bacData = getNfcBacData()
        if (bacData != null) {
            readChipWithBac(tag, tagSerial, bacData)
        } else {
            // No BAC data configured — show tag serial + "not configured" message
            nfcBottomSheet?.showNotConfigured(tagSerial)
            onNfcNotConfigured(tagSerial)
        }
    }

    private fun readChipWithBac(tag: Tag, tagSerial: String, bacData: NfcBacData) {
        nfcScope.launch {
            try {
                val chipData = withContext(Dispatchers.IO) {
                    cccdReader.readChip(
                        tag = tag,
                        cccdNumber = bacData.cccdNumber,
                        dateOfBirth = bacData.dateOfBirth,
                        expiryDate = bacData.expiryDate
                    )
                }
                Log.d(TAG, "NFC chip read success: ${chipData.fullName}")

                // Success vibration: one long pulse
                vibrateSuccess()

                nfcBottomSheet?.showResult(chipData)
                onNfcChipRead(chipData)
            } catch (e: CccdNfcReader.NfcReadException) {
                Log.w(TAG, "NFC read error: ${e.message}")
                nfcBottomSheet?.showError(e.message ?: "Lỗi đọc chip CCCD")
                onNfcReadFailed(tagSerial, e.message ?: "Unknown error")
            } catch (e: Exception) {
                Log.e(TAG, "NFC read error", e)
                nfcBottomSheet?.showError(
                    "Lỗi đọc chip: ${e.message}\n\nKiểm tra lại thông tin CCCD (ngày sinh, ngày hết hạn) trong cài đặt NFC."
                )
                onNfcReadFailed(tagSerial, e.message ?: "Unknown error")
            }
        }
    }

    private fun vibrateSuccess() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                manager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(200)
            }
        } catch (_: Exception) {}
    }

    /**
     * BAC key data needed to read a CCCD chip.
     */
    data class NfcBacData(
        val cccdNumber: String,
        val dateOfBirth: String,  // YYMMDD format
        val expiryDate: String    // YYMMDD format
    )
}
