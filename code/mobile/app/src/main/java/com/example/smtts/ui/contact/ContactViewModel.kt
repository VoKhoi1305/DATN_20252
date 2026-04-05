package com.example.smtts.ui.contact

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.SubjectArea
import com.example.smtts.data.model.SubjectOfficer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class ContactUiState {
    data object Loading : ContactUiState()
    data class Success(
        val officer: SubjectOfficer?,
        val area: SubjectArea?
    ) : ContactUiState()
    data class Error(val message: String) : ContactUiState()
}

class ContactViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<ContactUiState>(ContactUiState.Loading)
    val uiState: StateFlow<ContactUiState> = _uiState.asStateFlow()

    private val subjectApi = ApiClient.subjectApi

    fun loadContact() {
        val user = tokenManager.getUser() ?: run {
            _uiState.value = ContactUiState.Error("USER_NOT_FOUND")
            return
        }

        _uiState.value = ContactUiState.Loading

        viewModelScope.launch {
            try {
                val response = subjectApi.getSubjectDetail(user.id)
                if (response.isSuccessful && response.body()?.success == true) {
                    val profile = response.body()!!.data
                    _uiState.value = ContactUiState.Success(
                        officer = profile.officer,
                        area = profile.area
                    )
                } else {
                    _uiState.value = ContactUiState.Error("LOAD_FAILED")
                }
            } catch (e: IOException) {
                _uiState.value = ContactUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = ContactUiState.Error("SYSTEM_ERROR")
            }
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(ContactViewModel::class.java)) {
                return ContactViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
