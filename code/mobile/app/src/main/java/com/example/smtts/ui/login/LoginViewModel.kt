package com.example.smtts.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.ApiErrorResponse
import com.example.smtts.data.model.LoginRequest
import com.example.smtts.data.model.LoginResponse
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

/**
 * UI state for the login screen, matching web LoginPage states:
 * idle, loading, success (with sub-cases), error
 */
sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()

    /** Full authentication success - navigate to main */
    data class Success(val response: LoginResponse) : LoginUiState()

    /** OTP verification required - navigate to OTP screen */
    data class RequireOtp(val tempToken: String) : LoginUiState()

    /** OTP setup required - navigate to OTP setup screen */
    data class RequireOtpSetup(val response: LoginResponse) : LoginUiState()

    /** Error with HTTP status code and display message */
    data class Error(val message: String, val httpCode: Int?) : LoginUiState()
}

class LoginViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val authApi = ApiClient.authApi
    private val gson = Gson()

    fun login(username: String, password: String) {
        _uiState.value = LoginUiState.Loading

        viewModelScope.launch {
            try {
                val response = authApi.login(LoginRequest(username, password))

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && body.success) {
                        handleLoginSuccess(body.data)
                    } else {
                        _uiState.value = LoginUiState.Error(
                            message = "Unexpected response",
                            httpCode = response.code()
                        )
                    }
                } else {
                    handleLoginError(response.code(), response.errorBody()?.string())
                }
            } catch (e: IOException) {
                // Network error (no internet, timeout, etc.)
                _uiState.value = LoginUiState.Error(
                    message = "NETWORK_ERROR",
                    httpCode = null
                )
            } catch (e: Exception) {
                _uiState.value = LoginUiState.Error(
                    message = "SYSTEM_ERROR",
                    httpCode = null
                )
            }
        }
    }

    private fun handleLoginSuccess(result: LoginResponse) {
        when {
            // Case 1: OTP verification required
            result.requireOtp -> {
                result.tempToken?.let { tokenManager.setTempToken(it) }
                _uiState.value = LoginUiState.RequireOtp(
                    tempToken = result.tempToken ?: ""
                )
            }

            // Case 2: OTP setup required (first-time officers)
            result.requireOtpSetup -> {
                result.accessToken?.let { tokenManager.setAccessToken(it) }
                result.refreshToken?.let { tokenManager.setRefreshToken(it) }
                _uiState.value = LoginUiState.RequireOtpSetup(result)
            }

            // Case 3: Fully authenticated
            else -> {
                result.accessToken?.let { tokenManager.setAccessToken(it) }
                result.refreshToken?.let { tokenManager.setRefreshToken(it) }
                result.user?.let { tokenManager.setUser(it) }

                // Cache subject profile data (ID + lifecycle) for SUBJECT role
                if (result.user?.role == "SUBJECT") {
                    fetchAndCacheSubjectProfile()
                }

                _uiState.value = LoginUiState.Success(result)
            }
        }
    }

    private fun handleLoginError(httpCode: Int, errorBody: String?) {
        _uiState.value = LoginUiState.Error(
            message = when (httpCode) {
                401 -> "AUTH_401"
                403 -> "AUTH_403"
                429 -> "AUTH_429"
                else -> "SYSTEM_ERROR"
            },
            httpCode = httpCode
        )
    }

    /**
     * Fetch subject profile and cache subject ID + lifecycle for enrollment checks.
     */
    private fun fetchAndCacheSubjectProfile() {
        viewModelScope.launch {
            try {
                val response = ApiClient.subjectApi.getMyProfile()
                if (response.isSuccessful && response.body()?.success == true) {
                    val profile = response.body()?.data
                    if (profile != null) {
                        tokenManager.setSubjectId(profile.id)
                        profile.lifecycle?.let { tokenManager.setSubjectLifecycle(it) }
                    }
                }
            } catch (_: Exception) {
                // Non-critical — will be fetched again on next profile load
            }
        }
    }

    fun resetState() {
        _uiState.value = LoginUiState.Idle
    }

    /**
     * Factory for creating LoginViewModel with TokenManager dependency.
     */
    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(LoginViewModel::class.java)) {
                return LoginViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
