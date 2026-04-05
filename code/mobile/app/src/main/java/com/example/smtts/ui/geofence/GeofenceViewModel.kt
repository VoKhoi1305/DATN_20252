package com.example.smtts.ui.geofence

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.GeofenceDetail
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException
import kotlin.math.*

sealed class GeofenceUiState {
    data object Loading : GeofenceUiState()
    data class Success(
        val geofence: GeofenceDetail,
        val curfewStart: String?,
        val curfewEnd: String?
    ) : GeofenceUiState()
    data class Error(val message: String) : GeofenceUiState()
}

class GeofenceViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<GeofenceUiState>(GeofenceUiState.Loading)
    val uiState: StateFlow<GeofenceUiState> = _uiState.asStateFlow()

    private val geofenceApi = ApiClient.geofenceApi

    fun loadGeofence(geofenceId: String, curfewStart: String?, curfewEnd: String?) {
        _uiState.value = GeofenceUiState.Loading

        viewModelScope.launch {
            try {
                val response = geofenceApi.getGeofence(geofenceId)
                if (response.isSuccessful && response.body()?.success == true) {
                    _uiState.value = GeofenceUiState.Success(
                        geofence = response.body()!!.data,
                        curfewStart = curfewStart,
                        curfewEnd = curfewEnd
                    )
                } else {
                    _uiState.value = GeofenceUiState.Error("LOAD_FAILED")
                }
            } catch (e: IOException) {
                _uiState.value = GeofenceUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = GeofenceUiState.Error("SYSTEM_ERROR")
            }
        }
    }

    companion object {
        fun distanceBetween(
            lat1: Double, lng1: Double,
            lat2: Double, lng2: Double
        ): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = sin(dLat / 2).pow(2) +
                    cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                    sin(dLng / 2).pow(2)
            return r * 2 * atan2(sqrt(a), sqrt(1 - a))
        }
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(GeofenceViewModel::class.java)) {
                return GeofenceViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
