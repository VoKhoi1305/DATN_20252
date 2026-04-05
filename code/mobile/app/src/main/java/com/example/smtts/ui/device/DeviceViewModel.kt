package com.example.smtts.ui.device

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.DeviceInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class DeviceUiState {
    data object Loading : DeviceUiState()
    data class Success(
        val current: DeviceInfo?,
        val history: List<DeviceInfo>
    ) : DeviceUiState()
    data class Error(val message: String) : DeviceUiState()
}

class DeviceViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<DeviceUiState>(DeviceUiState.Loading)
    val uiState: StateFlow<DeviceUiState> = _uiState.asStateFlow()

    private val deviceApi = ApiClient.deviceApi

    fun loadDevices() {
        val user = tokenManager.getUser() ?: run {
            _uiState.value = DeviceUiState.Error("USER_NOT_FOUND")
            return
        }

        _uiState.value = DeviceUiState.Loading

        viewModelScope.launch {
            try {
                val response = deviceApi.getDevices(user.id)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!.data
                    _uiState.value = DeviceUiState.Success(
                        current = data.current,
                        history = data.history
                    )
                } else {
                    // Endpoint may return empty — show empty state
                    _uiState.value = DeviceUiState.Success(
                        current = null,
                        history = emptyList()
                    )
                }
            } catch (e: IOException) {
                _uiState.value = DeviceUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = DeviceUiState.Success(
                    current = null,
                    history = emptyList()
                )
            }
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DeviceViewModel::class.java)) {
                return DeviceViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
