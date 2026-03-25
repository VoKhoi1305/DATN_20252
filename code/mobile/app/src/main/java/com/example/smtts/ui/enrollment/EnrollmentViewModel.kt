package com.example.smtts.ui.enrollment

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.EnrollNfcRequest
import com.example.smtts.nfc.CccdNfcReader
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Enrollment steps: NFC → Face → Submit (officer approval)
 */
enum class EnrollmentStep {
    NFC_SCAN,
    FACE_CAPTURE,
    SUBMIT,
    DONE
}

sealed class EnrollmentUiState {
    data object Idle : EnrollmentUiState()
    data class InProgress(val step: EnrollmentStep) : EnrollmentUiState()
    data class NfcReadSuccess(val chipData: CccdNfcReader.CccdChipData) : EnrollmentUiState()
    data class NfcSubmitSuccess(val message: String) : EnrollmentUiState()
    data class FaceSuccess(val message: String, val qualityScore: Double, val livenessScore: Double) : EnrollmentUiState()
    data class Complete(val message: String) : EnrollmentUiState()
    data class Error(val message: String, val step: EnrollmentStep) : EnrollmentUiState()
}

class EnrollmentViewModel(
    private val tokenManager: TokenManager
) : ViewModel() {

    companion object {
        private const val TAG = "EnrollmentVM"
    }

    private val _uiState = MutableStateFlow<EnrollmentUiState>(EnrollmentUiState.Idle)
    val uiState: StateFlow<EnrollmentUiState> = _uiState.asStateFlow()

    private val _currentStep = MutableStateFlow(EnrollmentStep.NFC_SCAN)
    val currentStep: StateFlow<EnrollmentStep> = _currentStep.asStateFlow()

    private val _nfcDone = MutableStateFlow(false)
    val nfcDone: StateFlow<Boolean> = _nfcDone.asStateFlow()

    private val _faceDone = MutableStateFlow(false)
    val faceDone: StateFlow<Boolean> = _faceDone.asStateFlow()

    /** Stores the last successfully read NFC chip data for display */
    private val _nfcChipData = MutableStateFlow<CccdNfcReader.CccdChipData?>(null)
    val nfcChipData: StateFlow<CccdNfcReader.CccdChipData?> = _nfcChipData.asStateFlow()

    /** Face quality score (0-1) from server */
    private val _faceQualityScore = MutableStateFlow(0.0)
    val faceQualityScore: StateFlow<Double> = _faceQualityScore.asStateFlow()

    /** Face liveness score (0-1) from server */
    private val _faceLivenessScore = MutableStateFlow(0.0)
    val faceLivenessScore: StateFlow<Double> = _faceLivenessScore.asStateFlow()

    private val enrollmentApi = ApiClient.enrollmentApi

    init {
        checkEnrollmentStatus()
    }

    private fun checkEnrollmentStatus() {
        viewModelScope.launch {
            try {
                val response = enrollmentApi.getStatus()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        val status = body.data
                        _nfcDone.value = status.nfcEnrolled
                        _faceDone.value = status.faceEnrolled
                        _currentStep.value = when {
                            status.enrollmentComplete -> EnrollmentStep.DONE
                            !status.nfcEnrolled -> EnrollmentStep.NFC_SCAN
                            !status.faceEnrolled -> EnrollmentStep.FACE_CAPTURE
                            else -> EnrollmentStep.SUBMIT
                        }
                        if (status.enrollmentComplete) {
                            _uiState.value = EnrollmentUiState.Complete("Da hoan tat dang ky")
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not check enrollment status: ${e.message}")
            }
        }
    }

    /**
     * Called when NFC chip data has been read locally (before server submit).
     * Stores the chip data and transitions UI to show result + submit button.
     */
    fun onNfcChipRead(chipData: CccdNfcReader.CccdChipData) {
        _nfcChipData.value = chipData
        _uiState.value = EnrollmentUiState.NfcReadSuccess(chipData)
    }

    /**
     * Submit NFC chip data to server.
     */
    fun submitNfcData() {
        val chipData = _nfcChipData.value ?: return
        _uiState.value = EnrollmentUiState.InProgress(EnrollmentStep.NFC_SCAN)
        viewModelScope.launch {
            try {
                val request = EnrollNfcRequest(
                    chipData = chipData.chipDataHash,
                    chipSerial = chipData.chipSerial,
                    passiveAuthData = chipData.passiveAuthData,
                    chipFullName = chipData.fullName,
                    chipCccdNumber = chipData.cccdNumber
                )
                val response = enrollmentApi.enrollNfc(request)

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        _nfcDone.value = true
                        _uiState.value = EnrollmentUiState.NfcSubmitSuccess(body.data.message)
                    } else {
                        _uiState.value = EnrollmentUiState.Error(
                            "Loi dang ky NFC",
                            EnrollmentStep.NFC_SCAN
                        )
                    }
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Unknown error"
                    Log.e(TAG, "NFC enroll failed: $errorBody")
                    _uiState.value = EnrollmentUiState.Error(
                        parseErrorMessage(errorBody),
                        EnrollmentStep.NFC_SCAN
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "NFC submit error", e)
                _uiState.value = EnrollmentUiState.Error(
                    "Loi ket noi: ${e.message}",
                    EnrollmentStep.NFC_SCAN
                )
            }
        }
    }

    /**
     * Advance to the next step.
     */
    fun goToStep(step: EnrollmentStep) {
        _currentStep.value = step
    }

    /**
     * Submit face image to server.
     * The server runs InsightFace/ArcFace for detection, quality check, liveness, and embedding.
     * Does NOT auto-complete enrollment — user must explicitly submit in Step 3.
     */
    fun submitFaceImage(imageBytes: ByteArray) {
        _uiState.value = EnrollmentUiState.InProgress(EnrollmentStep.FACE_CAPTURE)
        viewModelScope.launch {
            try {
                val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("file", "face.jpg", requestBody)

                val response = enrollmentApi.enrollFace(part)

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        val data = body.data
                        _faceDone.value = true
                        _faceQualityScore.value = data.qualityScore
                        _faceLivenessScore.value = data.livenessScore
                        _uiState.value = EnrollmentUiState.FaceSuccess(
                            data.message,
                            data.qualityScore,
                            data.livenessScore
                        )
                        // Do NOT auto-complete — user submits in Step 3
                    } else {
                        _uiState.value = EnrollmentUiState.Error(
                            "Loi dang ky khuon mat",
                            EnrollmentStep.FACE_CAPTURE
                        )
                    }
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Unknown error"
                    Log.e(TAG, "Face enroll failed: $errorBody")
                    _uiState.value = EnrollmentUiState.Error(
                        parseErrorMessage(errorBody),
                        EnrollmentStep.FACE_CAPTURE
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Face submit error", e)
                _uiState.value = EnrollmentUiState.Error(
                    "Loi ket noi: ${e.message}",
                    EnrollmentStep.FACE_CAPTURE
                )
            }
        }
    }

    /**
     * Submit enrollment for officer approval (Step 3).
     * Transitions lifecycle to pending approval state.
     */
    fun completeEnrollment() {
        viewModelScope.launch {
            try {
                _uiState.value = EnrollmentUiState.InProgress(EnrollmentStep.SUBMIT)
                val response = enrollmentApi.completeEnrollment()
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        _currentStep.value = EnrollmentStep.DONE
                        _uiState.value = EnrollmentUiState.Complete(body.data.message)
                    } else {
                        _uiState.value = EnrollmentUiState.Error(
                            "Loi gui dang ky",
                            EnrollmentStep.SUBMIT
                        )
                    }
                } else {
                    val errorBody = response.errorBody()?.string() ?: "Unknown error"
                    _uiState.value = EnrollmentUiState.Error(
                        parseErrorMessage(errorBody),
                        EnrollmentStep.SUBMIT
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Complete enrollment error", e)
                _uiState.value = EnrollmentUiState.Error(
                    "Loi ket noi: ${e.message}",
                    EnrollmentStep.SUBMIT
                )
            }
        }
    }

    fun resetError() {
        _uiState.value = EnrollmentUiState.Idle
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
            return EnrollmentViewModel(tokenManager) as T
        }
    }
}
