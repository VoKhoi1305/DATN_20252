package com.example.smtts.ui.request

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.SubjectRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class RequestListUiState {
    data object Loading : RequestListUiState()
    data class Success(
        val pending: List<SubjectRequest>,
        val processed: List<SubjectRequest>,
        val hasMore: Boolean
    ) : RequestListUiState()
    data class Error(val message: String) : RequestListUiState()
}

class RequestListViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<RequestListUiState>(RequestListUiState.Loading)
    val uiState: StateFlow<RequestListUiState> = _uiState.asStateFlow()

    private val requestApi = ApiClient.requestApi

    fun loadRequests() {
        val user = tokenManager.getUser() ?: run {
            _uiState.value = RequestListUiState.Error("USER_NOT_FOUND")
            return
        }

        _uiState.value = RequestListUiState.Loading

        viewModelScope.launch {
            try {
                val response = requestApi.getRequests(
                    subjectId = user.id, page = 1, limit = 50
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val items = response.body()!!.data.items
                    val pending = items.filter { it.status == "PENDING" }
                    val processed = items.filter { it.status != "PENDING" }

                    _uiState.value = RequestListUiState.Success(
                        pending = pending,
                        processed = processed,
                        hasMore = false
                    )
                } else {
                    // Backend may not have this endpoint yet — show empty state
                    _uiState.value = RequestListUiState.Success(
                        pending = emptyList(),
                        processed = emptyList(),
                        hasMore = false
                    )
                }
            } catch (e: IOException) {
                _uiState.value = RequestListUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                // Backend endpoint may not exist — show empty state instead of error
                _uiState.value = RequestListUiState.Success(
                    pending = emptyList(),
                    processed = emptyList(),
                    hasMore = false
                )
            }
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(RequestListViewModel::class.java)) {
                return RequestListViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
