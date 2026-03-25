package com.example.smtts.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.ActivateRequest
import com.example.smtts.data.model.ActivateResponse
import com.example.smtts.data.model.ApiErrorResponse
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class ActivationUiState {
    data object Idle : ActivationUiState()
    data object Loading : ActivationUiState()
    data class Success(val response: ActivateResponse) : ActivationUiState()
    data class Error(val errorCode: String, val httpCode: Int?) : ActivationUiState()
}

class ActivationViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<ActivationUiState>(ActivationUiState.Idle)
    val uiState: StateFlow<ActivationUiState> = _uiState.asStateFlow()

    private val authApi = ApiClient.authApi
    private val gson = Gson()

    fun activate(subjectCode: String, cccd: String, password: String, confirmPassword: String) {
        _uiState.value = ActivationUiState.Loading

        viewModelScope.launch {
            try {
                val response = authApi.activate(
                    ActivateRequest(subjectCode, cccd, password, confirmPassword)
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        val data = body.data
                        // Save tokens and user info
                        tokenManager.saveTokens(data.accessToken, data.refreshToken)
                        tokenManager.setUser(data.user)
                        _uiState.value = ActivationUiState.Success(data)
                    } else {
                        _uiState.value = ActivationUiState.Error("SYSTEM_ERROR", response.code())
                    }
                } else {
                    handleApiError(response.code(), response.errorBody()?.string())
                }
            } catch (e: IOException) {
                _uiState.value = ActivationUiState.Error("NETWORK_ERROR", null)
            } catch (e: Exception) {
                _uiState.value = ActivationUiState.Error("SYSTEM_ERROR", null)
            }
        }
    }

    private fun handleApiError(httpCode: Int, errorBody: String?) {
        val errorCode = try {
            if (errorBody != null) {
                val parsed = gson.fromJson(errorBody, ApiErrorResponse::class.java)
                parsed.error.code
            } else {
                "SYSTEM_ERROR"
            }
        } catch (_: Exception) {
            when (httpCode) {
                400 -> "VALIDATION_ERROR"
                404 -> "SUBJECT_NOT_FOUND"
                409 -> "CONFLICT"
                429 -> "AUTH_429"
                else -> "SYSTEM_ERROR"
            }
        }

        _uiState.value = ActivationUiState.Error(errorCode, httpCode)
    }

    fun resetState() {
        _uiState.value = ActivationUiState.Idle
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(ActivationViewModel::class.java)) {
                return ActivationViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
