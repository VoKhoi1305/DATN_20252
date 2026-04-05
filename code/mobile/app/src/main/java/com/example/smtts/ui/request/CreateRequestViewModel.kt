package com.example.smtts.ui.request

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.CreateRequestPayload
import com.example.smtts.data.model.SubjectRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class CreateRequestUiState {
    data object Idle : CreateRequestUiState()
    data object Submitting : CreateRequestUiState()
    data class Success(val request: SubjectRequest) : CreateRequestUiState()
    data class Error(val message: String) : CreateRequestUiState()
}

class CreateRequestViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<CreateRequestUiState>(CreateRequestUiState.Idle)
    val uiState: StateFlow<CreateRequestUiState> = _uiState.asStateFlow()

    private val requestApi = ApiClient.requestApi

    fun submitRequest(type: String, reason: String, details: Map<String, String>) {
        _uiState.value = CreateRequestUiState.Submitting

        viewModelScope.launch {
            try {
                val payload = CreateRequestPayload(
                    type = type,
                    reason = reason,
                    details = details
                )
                val response = requestApi.createRequest(payload)

                if (response.isSuccessful && response.body()?.success == true) {
                    _uiState.value = CreateRequestUiState.Success(response.body()!!.data)
                } else {
                    val errorBody = response.errorBody()?.string()
                    val errorMsg = when (response.code()) {
                        400 -> "VALIDATION_ERROR"
                        429 -> "RATE_LIMITED"
                        else -> "SUBMIT_FAILED"
                    }
                    _uiState.value = CreateRequestUiState.Error(errorMsg)
                }
            } catch (e: IOException) {
                _uiState.value = CreateRequestUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = CreateRequestUiState.Error("SYSTEM_ERROR")
            }
        }
    }

    fun resetState() {
        _uiState.value = CreateRequestUiState.Idle
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(CreateRequestViewModel::class.java)) {
                return CreateRequestViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
