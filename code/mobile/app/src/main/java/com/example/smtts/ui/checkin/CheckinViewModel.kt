package com.example.smtts.ui.checkin

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.CheckinEventResult
import com.example.smtts.data.model.NfcFailureRequest
import com.example.smtts.nfc.CccdNfcReader
import com.example.smtts.util.DeviceInfoHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Check-in steps: NFC → Face → Submit
 */
enum class CheckinStep {
    NFC_SCAN,
    FACE_CAPTURE,
    SUBMITTING,
    DONE
}

sealed class CheckinUiState {
    data object Idle : CheckinUiState()
    data class InProgress(val step: CheckinStep) : CheckinUiState()
    data class NfcSuccess(val chipData: CccdNfcReader.CccdChipData) : CheckinUiState()
    data class SubmitSuccess(
        val message: String,
        val result: String,
        val event: CheckinEventResult? = null
    ) : CheckinUiState()
    data class Error(val message: String, val step: CheckinStep) : CheckinUiState()
}

class CheckinViewModel(
    private val tokenManager: TokenManager
) : ViewModel() {

    companion object {
        private const val TAG = "CheckinVM"
    }

    private val _uiState = MutableStateFlow<CheckinUiState>(CheckinUiState.Idle)
    val uiState: StateFlow<CheckinUiState> = _uiState.asStateFlow()

    private val _currentStep = MutableStateFlow(CheckinStep.NFC_SCAN)
    val currentStep: StateFlow<CheckinStep> = _currentStep.asStateFlow()

    private var chipData: CccdNfcReader.CccdChipData? = null

    private val checkinApi = ApiClient.checkinApi

    fun hasBacData(): Boolean = tokenManager.hasNfcBacData()

    fun onNfcChipRead(data: CccdNfcReader.CccdChipData) {
        chipData = data
        _uiState.value = CheckinUiState.NfcSuccess(data)
    }

    fun goToFaceStep() {
        _currentStep.value = CheckinStep.FACE_CAPTURE
    }

    /**
     * Submit check-in with face image + NFC data + device info.
     *
     * Pipeline:
     * 1. Collect device info for verification against enrolled device
     * 2. Send chipDataHash + faceImage + GPS + device info to server
     * 3. Server verifies NFC + face (with liveness) + device
     * 4. Returns face match score %, liveness result, event outcome
     */
    /**
     * Get last known GPS location. Returns null if permission denied or unavailable.
     * Uses LocationManager directly (no play-services dependency needed).
     */
    @SuppressLint("MissingPermission")
    private fun getLastLocation(context: Context): Location? {
        return try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val providers = listOf(
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            )
            providers.mapNotNull { provider ->
                if (lm.isProviderEnabled(provider)) lm.getLastKnownLocation(provider) else null
            }.maxByOrNull { it.time }
        } catch (e: Exception) {
            Log.w(TAG, "Could not get location: ${e.message}")
            null
        }
    }

    /**
     * Log a mobile-side NFC read failure to the backend immediately.
     * Called when the chip cannot be read or passive auth fails on device.
     */
    fun logNfcFailure(context: Context, reason: String, chipSerial: String? = null) {
        viewModelScope.launch {
            try {
                val now = isoNow()
                val location = getLastLocation(context)
                val deviceInfo = DeviceInfoHelper.collectDeviceInfo(context)
                val request = NfcFailureRequest(
                    reason = reason,
                    chipSerial = chipSerial,
                    deviceId = deviceInfo.deviceId,
                    gpsLat = location?.latitude,
                    gpsLng = location?.longitude,
                    clientTimestamp = now
                )
                val response = checkinApi.logNfcFailure(request)
                if (response.isSuccessful) {
                    Log.i(TAG, "NFC failure logged to backend: reason=$reason")
                } else {
                    Log.w(TAG, "NFC failure log failed: ${response.errorBody()?.string()}")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not log NFC failure to backend: ${e.message}")
            }
        }
    }

    fun submitCheckin(faceImageBytes: ByteArray, context: Context) {
        val nfc = chipData ?: run {
            _uiState.value = CheckinUiState.Error("Chua quet NFC. Vui long quet lai.", CheckinStep.FACE_CAPTURE)
            return
        }

        _currentStep.value = CheckinStep.SUBMITTING
        _uiState.value = CheckinUiState.InProgress(CheckinStep.SUBMITTING)

        viewModelScope.launch {
            try {
                val textType = "text/plain".toMediaTypeOrNull()
                val now = isoNow()

                // Collect device info + GPS location
                val deviceInfo = DeviceInfoHelper.collectDeviceInfo(context)
                val location = getLastLocation(context)

                val faceBody = faceImageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
                val facePart = MultipartBody.Part.createFormData("faceImage", "face.jpg", faceBody)

                val response = checkinApi.checkin(
                    chipDataHash = nfc.chipDataHash.toRequestBody(textType),
                    chipSerial = nfc.chipSerial.toRequestBody(textType),
                    passiveAuthVerified = nfc.passiveAuthVerified.toString().toRequestBody(textType),
                    passiveAuthData = nfc.passiveAuthData?.toRequestBody(textType),
                    gpsLat = location?.latitude?.toString()?.toRequestBody(textType),
                    gpsLng = location?.longitude?.toString()?.toRequestBody(textType),
                    clientTimestamp = now.toRequestBody(textType),
                    deviceId = deviceInfo.deviceId.toRequestBody(textType),
                    deviceModel = deviceInfo.deviceModel.toRequestBody(textType),
                    osVersion = deviceInfo.osVersion.toRequestBody(textType),
                    faceImage = facePart
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        val event = body.data.event
                        val result = event?.result ?: "SUCCESS"
                        _currentStep.value = CheckinStep.DONE
                        _uiState.value = CheckinUiState.SubmitSuccess(
                            body.data.message,
                            result,
                            event
                        )
                    } else {
                        _uiState.value = CheckinUiState.Error(
                            "Diem danh that bai.",
                            CheckinStep.FACE_CAPTURE
                        )
                    }
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Unknown error"
                    Log.e(TAG, "Checkin failed: $errorBody")
                    _uiState.value = CheckinUiState.Error(
                        parseErrorMessage(errorBody),
                        CheckinStep.FACE_CAPTURE
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Checkin submit error", e)
                _uiState.value = CheckinUiState.Error(
                    "Loi ket noi: ${e.message}",
                    CheckinStep.FACE_CAPTURE
                )
            }
        }
    }

    fun resetError() {
        _uiState.value = CheckinUiState.Idle
    }

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .format(Date())

    private fun parseErrorMessage(errorBody: String): String {
        return try {
            val json = com.google.gson.JsonParser.parseString(errorBody).asJsonObject
            val error = json.getAsJsonObject("error")
            error?.get("message")?.asString ?: "Loi khong xac dinh"
        } catch (_: Exception) {
            "Loi he thong. Vui long thu lai."
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            return CheckinViewModel(tokenManager) as T
        }
    }
}
