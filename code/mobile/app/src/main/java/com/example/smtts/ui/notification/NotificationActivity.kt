package com.example.smtts.ui.notification

import android.os.Bundle
import android.view.View
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

class NotificationActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: NotificationViewModel
    private lateinit var adapter: NotificationAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_notification)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, NotificationViewModel.Factory(tokenManager)
        )[NotificationViewModel::class.java]

        setupToolbar()
        setupRecyclerView()
        observeState()
        viewModel.loadNotifications(refresh = true)
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<View>(R.id.btnMarkAllRead).setOnClickListener {
            viewModel.markAllRead()
        }
    }

    private fun setupRecyclerView() {
        adapter = NotificationAdapter { notification ->
            if (!notification.isRead) {
                viewModel.markAsRead(notification.id)
            }
        }
        val rv = findViewById<RecyclerView>(R.id.rvNotifications)
        rv.layoutManager = LinearLayoutManager(this)
        rv.adapter = adapter

        rv.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                val layoutManager = recyclerView.layoutManager as LinearLayoutManager
                val totalItems = layoutManager.itemCount
                val lastVisible = layoutManager.findLastVisibleItemPosition()
                val state = viewModel.uiState.value
                if (state is NotificationUiState.Success && state.hasMore && lastVisible >= totalItems - 3) {
                    viewModel.loadMore()
                }
            }
        })
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is NotificationUiState.Loading -> showLoading()
                    is NotificationUiState.Success -> showNotifications(state)
                    is NotificationUiState.Error -> showError(state.message)
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showNotifications(state: NotificationUiState.Success) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Unread badge
        val tvUnread = findViewById<TextView>(R.id.tvUnreadCount)
        if (state.unreadCount > 0) {
            tvUnread.text = getString(R.string.notif_unread_count, state.unreadCount)
            tvUnread.visibility = View.VISIBLE
            findViewById<View>(R.id.btnMarkAllRead).visibility = View.VISIBLE
        } else {
            tvUnread.visibility = View.GONE
            findViewById<View>(R.id.btnMarkAllRead).visibility = View.GONE
        }

        adapter.submitList(state.notifications)

        // Empty state
        if (state.notifications.isEmpty()) {
            findViewById<TextView>(R.id.tvNoNotifications).visibility = View.VISIBLE
            findViewById<RecyclerView>(R.id.rvNotifications).visibility = View.GONE
        } else {
            findViewById<TextView>(R.id.tvNoNotifications).visibility = View.GONE
            findViewById<RecyclerView>(R.id.rvNotifications).visibility = View.VISIBLE
        }
    }

    private fun showError(message: String) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.VISIBLE

        val errorMsg = when (message) {
            "NETWORK_ERROR" -> getString(R.string.error_network)
            else -> getString(R.string.error_system)
        }
        findViewById<TextView>(R.id.tvErrorMessage).text = errorMsg
        findViewById<MaterialButton>(R.id.btnRetry).setOnClickListener {
            viewModel.loadNotifications(refresh = true)
        }
    }
}
