package com.example.smtts.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.ChangePasswordRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class ChangePasswordUiState {
    data object Idle : ChangePasswordUiState()
    data object Loading : ChangePasswordUiState()
    data object Success : ChangePasswordUiState()
    data class Error(val message: String) : ChangePasswordUiState()
}

class SettingsViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _changePasswordState = MutableStateFlow<ChangePasswordUiState>(ChangePasswordUiState.Idle)
    val changePasswordState: StateFlow<ChangePasswordUiState> = _changePasswordState.asStateFlow()

    fun changePassword(currentPassword: String, newPassword: String, confirmPassword: String) {
        _changePasswordState.value = ChangePasswordUiState.Loading

        viewModelScope.launch {
            try {
                val response = ApiClient.authApi.changePassword(
                    ChangePasswordRequest(currentPassword, newPassword, confirmPassword)
                )
                if (response.isSuccessful) {
                    _changePasswordState.value = ChangePasswordUiState.Success
                } else {
                    val errorMsg = when (response.code()) {
                        400 -> "VALIDATION_ERROR"
                        401 -> "WRONG_PASSWORD"
                        else -> "CHANGE_FAILED"
                    }
                    _changePasswordState.value = ChangePasswordUiState.Error(errorMsg)
                }
            } catch (e: IOException) {
                _changePasswordState.value = ChangePasswordUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _changePasswordState.value = ChangePasswordUiState.Error("SYSTEM_ERROR")
            }
        }
    }

    fun resetChangePasswordState() {
        _changePasswordState.value = ChangePasswordUiState.Idle
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(SettingsViewModel::class.java)) {
                return SettingsViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
