package com.example.smtts.ui.request

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class RequestListActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: RequestListViewModel
    private lateinit var pendingAdapter: RequestAdapter
    private lateinit var processedAdapter: RequestAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_request_list)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, RequestListViewModel.Factory(tokenManager)
        )[RequestListViewModel::class.java]

        setupToolbar()
        setupRecyclerViews()
        setupCreateButton()
        observeState()
        viewModel.loadRequests()
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadRequests()
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun setupRecyclerViews() {
        pendingAdapter = RequestAdapter()
        processedAdapter = RequestAdapter()

        findViewById<RecyclerView>(R.id.rvPending).apply {
            layoutManager = LinearLayoutManager(this@RequestListActivity)
            adapter = pendingAdapter
            isNestedScrollingEnabled = false
        }

        findViewById<RecyclerView>(R.id.rvProcessed).apply {
            layoutManager = LinearLayoutManager(this@RequestListActivity)
            adapter = processedAdapter
            isNestedScrollingEnabled = false
        }
    }

    private fun setupCreateButton() {
        findViewById<MaterialButton>(R.id.btnCreateRequest).setOnClickListener {
            startActivity(Intent(this, CreateRequestActivity::class.java))
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is RequestListUiState.Loading -> showLoading()
                        is RequestListUiState.Success -> showRequests(state)
                        is RequestListUiState.Error -> showError(state.message)
                    }
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showRequests(state: RequestListUiState.Success) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Pending section
        if (state.pending.isNotEmpty()) {
            findViewById<TextView>(R.id.tvPendingLabel).visibility = View.VISIBLE
            findViewById<RecyclerView>(R.id.rvPending).visibility = View.VISIBLE
            pendingAdapter.submitList(state.pending)
        } else {
            findViewById<TextView>(R.id.tvPendingLabel).visibility = View.GONE
            findViewById<RecyclerView>(R.id.rvPending).visibility = View.GONE
        }

        // Processed section
        if (state.processed.isNotEmpty()) {
            findViewById<TextView>(R.id.tvProcessedLabel).visibility = View.VISIBLE
            findViewById<RecyclerView>(R.id.rvProcessed).visibility = View.VISIBLE
            processedAdapter.submitList(state.processed)
        } else {
            findViewById<TextView>(R.id.tvProcessedLabel).visibility = View.GONE
            findViewById<RecyclerView>(R.id.rvProcessed).visibility = View.GONE
        }

        // Empty state
        if (state.pending.isEmpty() && state.processed.isEmpty()) {
            findViewById<TextView>(R.id.tvNoRequests).visibility = View.VISIBLE
        } else {
            findViewById<TextView>(R.id.tvNoRequests).visibility = View.GONE
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
            viewModel.loadRequests()
        }
    }
}
