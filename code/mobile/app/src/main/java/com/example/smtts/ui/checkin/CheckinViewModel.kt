package com.example.smtts.ui.checkin

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.CheckinEventResult
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
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())

                // Collect device info
                val deviceInfo = DeviceInfoHelper.collectDeviceInfo(context)

                val faceBody = faceImageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
                val facePart = MultipartBody.Part.createFormData("faceImage", "face.jpg", faceBody)

                val response = checkinApi.checkin(
                    chipDataHash = nfc.chipDataHash.toRequestBody(textType),
                    chipSerial = nfc.chipSerial.toRequestBody(textType),
                    passiveAuthVerified = nfc.passiveAuthVerified.toString().toRequestBody(textType),
                    passiveAuthData = nfc.passiveAuthData?.toRequestBody(textType),
                    gpsLat = null, // GPS to be added later
                    gpsLng = null,
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
