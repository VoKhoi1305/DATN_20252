package com.example.smtts.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.CheckinEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

data class DayStatus(
    val day: Int,
    val status: String // SUCCESS, WARNING, MISSED, PENDING, NONE
)

sealed class HistoryUiState {
    data object Loading : HistoryUiState()
    data class Success(
        val year: Int,
        val month: Int,
        val calendarDays: List<DayStatus>,
        val events: List<CheckinEvent>,
        val countSuccess: Int,
        val countWarning: Int,
        val countMissed: Int
    ) : HistoryUiState()
    data class Error(val message: String) : HistoryUiState()
}

class HistoryViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<HistoryUiState>(HistoryUiState.Loading)
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    private val eventApi = ApiClient.eventApi

    private var currentYear = Calendar.getInstance().get(Calendar.YEAR)
    private var currentMonth = Calendar.getInstance().get(Calendar.MONTH) + 1

    fun getCurrentYear() = currentYear
    fun getCurrentMonth() = currentMonth

    fun loadMonth(year: Int, month: Int) {
        currentYear = year
        currentMonth = month

        val user = tokenManager.getUser() ?: run {
            _uiState.value = HistoryUiState.Error("USER_NOT_FOUND")
            return
        }

        _uiState.value = HistoryUiState.Loading

        val from = "%04d-%02d-01".format(year, month)
        val cal = Calendar.getInstance().apply {
            set(Calendar.YEAR, year)
            set(Calendar.MONTH, month - 1)
            set(Calendar.DAY_OF_MONTH, getActualMaximum(Calendar.DAY_OF_MONTH))
        }
        val lastDay = cal.get(Calendar.DAY_OF_MONTH)
        val to = "%04d-%02d-%02d".format(year, month, lastDay)

        viewModelScope.launch {
            try {
                val response = eventApi.getEvents(
                    subjectId = user.id,
                    type = "CHECK_IN",
                    from = from,
                    to = to,
                    limit = 31
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    val events = response.body()?.data?.data ?: emptyList()
                    val calendarDays = buildCalendarDays(year, month, lastDay, events)

                    val countSuccess = calendarDays.count { it.status == "SUCCESS" }
                    val countWarning = calendarDays.count { it.status == "WARNING" }
                    val countMissed = calendarDays.count { it.status == "MISSED" }

                    _uiState.value = HistoryUiState.Success(
                        year = year,
                        month = month,
                        calendarDays = calendarDays,
                        events = events.sortedByDescending { it.createdAt },
                        countSuccess = countSuccess,
                        countWarning = countWarning,
                        countMissed = countMissed
                    )
                } else {
                    _uiState.value = HistoryUiState.Error("LOAD_FAILED")
                }
            } catch (e: IOException) {
                _uiState.value = HistoryUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = HistoryUiState.Error("SYSTEM_ERROR")
            }
        }
    }

    fun previousMonth() {
        var m = currentMonth - 1
        var y = currentYear
        if (m < 1) { m = 12; y-- }
        loadMonth(y, m)
    }

    fun nextMonth() {
        var m = currentMonth + 1
        var y = currentYear
        if (m > 12) { m = 1; y++ }
        loadMonth(y, m)
    }

    private fun buildCalendarDays(
        year: Int, month: Int, lastDay: Int,
        events: List<CheckinEvent>
    ): List<DayStatus> {
        val today = Calendar.getInstance()
        val todayYear = today.get(Calendar.YEAR)
        val todayMonth = today.get(Calendar.MONTH) + 1
        val todayDay = today.get(Calendar.DAY_OF_MONTH)

        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

        // Map events by day
        val eventsByDay = mutableMapOf<Int, String>()
        for (event in events) {
            try {
                val eventDate = dateFormat.parse(event.createdAt.substring(0, 10))
                val cal = Calendar.getInstance().apply { time = eventDate!! }
                val day = cal.get(Calendar.DAY_OF_MONTH)
                val existing = eventsByDay[day]
                // Prioritize SUCCESS over WARNING
                if (existing == null || (event.result == "SUCCESS" && existing != "SUCCESS")) {
                    eventsByDay[day] = event.result
                }
            } catch (_: Exception) { }
        }

        val days = mutableListOf<DayStatus>()
        for (d in 1..lastDay) {
            val status = when {
                eventsByDay.containsKey(d) -> {
                    when (eventsByDay[d]) {
                        "SUCCESS" -> "SUCCESS"
                        "WARNING" -> "WARNING"
                        "FAILED" -> "MISSED"
                        else -> "SUCCESS"
                    }
                }
                year == todayYear && month == todayMonth && d == todayDay -> "PENDING"
                year < todayYear || (year == todayYear && month < todayMonth) ||
                        (year == todayYear && month == todayMonth && d < todayDay) -> "MISSED"
                else -> "NONE" // Future days
            }
            days.add(DayStatus(d, status))
        }
        return days
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(HistoryViewModel::class.java)) {
                return HistoryViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
