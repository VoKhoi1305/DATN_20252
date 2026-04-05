package com.example.smtts.ui.notification

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.AppNotification
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class NotificationUiState {
    data object Loading : NotificationUiState()
    data class Success(
        val notifications: List<AppNotification>,
        val unreadCount: Int,
        val hasMore: Boolean
    ) : NotificationUiState()
    data class Error(val message: String) : NotificationUiState()
}

class NotificationViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<NotificationUiState>(NotificationUiState.Loading)
    val uiState: StateFlow<NotificationUiState> = _uiState.asStateFlow()

    private val notificationApi = ApiClient.notificationApi
    private var currentPage = 1
    private var allNotifications = mutableListOf<AppNotification>()

    fun loadNotifications(refresh: Boolean = false) {
        if (refresh) {
            currentPage = 1
            allNotifications.clear()
        }

        _uiState.value = if (allNotifications.isEmpty()) {
            NotificationUiState.Loading
        } else {
            _uiState.value
        }

        viewModelScope.launch {
            try {
                val response = notificationApi.getNotifications(
                    page = currentPage, limit = 20
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    if (data != null) {
                        if (refresh) allNotifications.clear()
                        allNotifications.addAll(data.items)

                        _uiState.value = NotificationUiState.Success(
                            notifications = allNotifications.toList(),
                            unreadCount = data.unreadCount ?: 0,
                            hasMore = allNotifications.size < data.total
                        )
                    } else {
                        _uiState.value = NotificationUiState.Success(
                            notifications = emptyList(),
                            unreadCount = 0,
                            hasMore = false
                        )
                    }
                } else {
                    // Backend may not have this endpoint yet — show empty state
                    _uiState.value = NotificationUiState.Success(
                        notifications = emptyList(),
                        unreadCount = 0,
                        hasMore = false
                    )
                }
            } catch (e: IOException) {
                _uiState.value = NotificationUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                // Backend endpoint may not exist — show empty state instead of error
                _uiState.value = NotificationUiState.Success(
                    notifications = emptyList(),
                    unreadCount = 0,
                    hasMore = false
                )
            }
        }
    }

    fun loadMore() {
        currentPage++
        loadNotifications()
    }

    fun markAsRead(notificationId: String) {
        viewModelScope.launch {
            try {
                notificationApi.markRead(notificationId)
                val index = allNotifications.indexOfFirst { it.id == notificationId }
                if (index >= 0) {
                    val updated = allNotifications[index].copy(isRead = true)
                    allNotifications[index] = updated
                    val currentState = _uiState.value
                    if (currentState is NotificationUiState.Success) {
                        _uiState.value = currentState.copy(
                            notifications = allNotifications.toList(),
                            unreadCount = (currentState.unreadCount - 1).coerceAtLeast(0)
                        )
                    }
                }
            } catch (_: Exception) { }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            try {
                notificationApi.markAllRead()
                allNotifications.replaceAll { it.copy(isRead = true) }
                val currentState = _uiState.value
                if (currentState is NotificationUiState.Success) {
                    _uiState.value = currentState.copy(
                        notifications = allNotifications.toList(),
                        unreadCount = 0
                    )
                }
            } catch (_: Exception) { }
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(NotificationViewModel::class.java)) {
                return NotificationViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
