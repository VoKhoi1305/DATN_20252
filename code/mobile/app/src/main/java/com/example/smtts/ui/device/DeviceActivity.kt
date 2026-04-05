package com.example.smtts.ui.device

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
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.DeviceInfo
import com.example.smtts.ui.request.CreateRequestActivity
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class DeviceActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: DeviceViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_device)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, DeviceViewModel.Factory(tokenManager)
        )[DeviceViewModel::class.java]

        setupToolbar()
        observeState()
        viewModel.loadDevices()
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is DeviceUiState.Loading -> showLoading()
                    is DeviceUiState.Success -> showDevices(state.current, state.history)
                    is DeviceUiState.Error -> showError(state.message)
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showDevices(current: DeviceInfo?, history: List<DeviceInfo>) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Current device
        if (current != null) {
            findViewById<LinearLayout>(R.id.currentDeviceSection).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tvCurrentStatus).text =
                if (current.status == "ACTIVE") getString(R.string.device_status_active)
                else current.status
            findViewById<TextView>(R.id.tvCurrentModel).text =
                current.deviceModel ?: getString(R.string.device_unknown)
            findViewById<TextView>(R.id.tvCurrentOs).text = current.osVersion ?: "\u2014"
            findViewById<TextView>(R.id.tvCurrentEnrolled).text =
                getString(R.string.device_enrolled_format, current.enrolledAt ?: "\u2014")
        } else {
            findViewById<LinearLayout>(R.id.currentDeviceSection).visibility = View.GONE
            findViewById<LinearLayout>(R.id.noDeviceSection).visibility = View.VISIBLE
        }

        // Change device button
        findViewById<MaterialButton>(R.id.btnChangeDevice).setOnClickListener {
            val intent = Intent(this, CreateRequestActivity::class.java)
            intent.putExtra("preselect_type", "CHANGE_DEVICE")
            startActivity(intent)
        }

        // Device history
        if (history.isNotEmpty()) {
            findViewById<LinearLayout>(R.id.historySection).visibility = View.VISIBLE
            val container = findViewById<LinearLayout>(R.id.historyContainer)
            container.removeAllViews()
            for (device in history) {
                val view = layoutInflater.inflate(R.layout.item_device_history, container, false)
                view.findViewById<TextView>(R.id.tvHistoryModel).text =
                    device.deviceModel ?: getString(R.string.device_unknown)
                view.findViewById<TextView>(R.id.tvHistoryStatus).text = when (device.status) {
                    "REPLACED" -> getString(R.string.device_status_replaced)
                    "INACTIVE" -> getString(R.string.device_status_inactive)
                    else -> device.status
                }
                val period = buildString {
                    append(device.enrolledAt ?: "?")
                    if (device.replacedAt != null) {
                        append(" - ")
                        append(device.replacedAt)
                    }
                }
                view.findViewById<TextView>(R.id.tvHistoryPeriod).text = period
                container.addView(view)
            }
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
            viewModel.loadDevices()
        }
    }
}
