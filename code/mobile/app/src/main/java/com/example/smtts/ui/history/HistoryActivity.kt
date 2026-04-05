package com.example.smtts.ui.history

import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import java.util.Calendar

class HistoryActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: HistoryViewModel
    private lateinit var adapter: HistoryAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_history)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, HistoryViewModel.Factory(tokenManager)
        )[HistoryViewModel::class.java]

        setupToolbar()
        setupRecyclerView()
        setupNavigation()
        observeState()

        val now = Calendar.getInstance()
        viewModel.loadMonth(now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1)
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun setupRecyclerView() {
        adapter = HistoryAdapter()
        val rv = findViewById<RecyclerView>(R.id.rvHistory)
        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter
    }

    private fun setupNavigation() {
        findViewById<View>(R.id.btnPrevMonth).setOnClickListener { viewModel.previousMonth() }
        findViewById<View>(R.id.btnNextMonth).setOnClickListener { viewModel.nextMonth() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is HistoryUiState.Loading -> showLoading()
                    is HistoryUiState.Success -> showHistory(state)
                    is HistoryUiState.Error -> showError(state.message)
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showHistory(state: HistoryUiState.Success) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Month title
        val monthNames = arrayOf(
            "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
            "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
        )
        findViewById<TextView>(R.id.tvMonthYear).text =
            "${monthNames[state.month - 1]}, ${state.year}"

        // Build calendar grid
        buildCalendarGrid(state)

        // Statistics
        findViewById<TextView>(R.id.tvCountSuccess).text =
            getString(R.string.history_count_success, state.countSuccess)
        findViewById<TextView>(R.id.tvCountWarning).text =
            getString(R.string.history_count_warning, state.countWarning)
        findViewById<TextView>(R.id.tvCountMissed).text =
            getString(R.string.history_count_missed, state.countMissed)

        // Event list
        adapter.submitList(state.events)

        // Show/hide empty state
        if (state.events.isEmpty()) {
            findViewById<TextView>(R.id.tvNoEvents).visibility = View.VISIBLE
            findViewById<RecyclerView>(R.id.rvHistory).visibility = View.GONE
        } else {
            findViewById<TextView>(R.id.tvNoEvents).visibility = View.GONE
            findViewById<RecyclerView>(R.id.rvHistory).visibility = View.VISIBLE
        }
    }

    private fun buildCalendarGrid(state: HistoryUiState.Success) {
        val grid = findViewById<GridLayout>(R.id.calendarGrid)
        grid.removeAllViews()
        grid.columnCount = 7

        // Day of week headers
        val headers = arrayOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")
        for (header in headers) {
            val tv = TextView(this).apply {
                text = header
                gravity = Gravity.CENTER
                setTextColor(getColor(R.color.smtts_zinc_500))
                textSize = 11f
                setPadding(0, 8, 0, 8)
            }
            val params = GridLayout.LayoutParams().apply {
                width = 0
                height = GridLayout.LayoutParams.WRAP_CONTENT
                columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
            }
            grid.addView(tv, params)
        }

        // Calculate first day offset (Monday = 0)
        val cal = Calendar.getInstance().apply {
            set(Calendar.YEAR, state.year)
            set(Calendar.MONTH, state.month - 1)
            set(Calendar.DAY_OF_MONTH, 1)
        }
        var firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) - Calendar.MONDAY
        if (firstDayOfWeek < 0) firstDayOfWeek = 6

        // Empty cells for offset
        for (i in 0 until firstDayOfWeek) {
            val empty = View(this)
            val params = GridLayout.LayoutParams().apply {
                width = 0
                height = 44
                columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
            }
            grid.addView(empty, params)
        }

        // Day cells
        for (dayStatus in state.calendarDays) {
            val tv = TextView(this).apply {
                text = dayStatus.day.toString()
                gravity = Gravity.CENTER
                textSize = 13f
                setPadding(0, 10, 0, 10)

                when (dayStatus.status) {
                    "SUCCESS" -> {
                        setTextColor(Color.WHITE)
                        setBackgroundResource(R.drawable.bg_icon_circle_green)
                    }
                    "WARNING" -> {
                        setTextColor(Color.WHITE)
                        setBackgroundResource(R.drawable.bg_icon_circle_amber)
                    }
                    "MISSED" -> {
                        setTextColor(Color.WHITE)
                        setBackgroundResource(R.drawable.bg_icon_circle_red)
                    }
                    "PENDING" -> {
                        setTextColor(getColor(R.color.smtts_zinc_700))
                        setBackgroundResource(R.drawable.bg_step_active)
                    }
                    else -> {
                        setTextColor(getColor(R.color.smtts_zinc_400))
                    }
                }
            }
            val params = GridLayout.LayoutParams().apply {
                width = 0
                height = GridLayout.LayoutParams.WRAP_CONTENT
                columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1f)
            }
            grid.addView(tv, params)
        }
    }

    private fun showError(message: String) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.VISIBLE

        val errorMsg = when (message) {
            "NETWORK_ERROR" -> getString(R.string.error_network)
            "USER_NOT_FOUND" -> getString(R.string.session_expired)
            else -> getString(R.string.error_system)
        }
        findViewById<TextView>(R.id.tvErrorMessage).text = errorMsg
        findViewById<MaterialButton>(R.id.btnRetry).setOnClickListener {
            viewModel.loadMonth(viewModel.getCurrentYear(), viewModel.getCurrentMonth())
        }
    }
}
