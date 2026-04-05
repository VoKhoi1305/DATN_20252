package com.example.smtts.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.SubjectProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class ProfileUiState {
    data object Loading : ProfileUiState()
    data class Success(val profile: SubjectProfile) : ProfileUiState()
    data class Error(val message: String) : ProfileUiState()
}

class ProfileViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    private val subjectApi = ApiClient.subjectApi

    fun loadProfile() {
        _uiState.value = ProfileUiState.Loading

        viewModelScope.launch {
            try {
                val profileResponse = subjectApi.getMyProfile()

                if (profileResponse.isSuccessful && profileResponse.body()?.success == true) {
                    val profile = profileResponse.body()?.data
                    if (profile != null) {
                        _uiState.value = ProfileUiState.Success(profile)
                    } else {
                        _uiState.value = ProfileUiState.Error("LOAD_FAILED")
                    }
                } else {
                    _uiState.value = ProfileUiState.Error("LOAD_FAILED")
                }
            } catch (e: IOException) {
                _uiState.value = ProfileUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = ProfileUiState.Error("SYSTEM_ERROR")
            }
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(ProfileViewModel::class.java)) {
                return ProfileViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
