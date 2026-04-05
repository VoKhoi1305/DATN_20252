package com.example.smtts.ui.geofence

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
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.GeofenceDetail
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class GeofenceActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: GeofenceViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_geofence)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, GeofenceViewModel.Factory(tokenManager)
        )[GeofenceViewModel::class.java]

        setupToolbar()
        observeState()

        val geofenceId = intent.getStringExtra("geofenceId")
        val curfewStart = intent.getStringExtra("curfewStart")
        val curfewEnd = intent.getStringExtra("curfewEnd")

        if (geofenceId != null) {
            viewModel.loadGeofence(geofenceId, curfewStart, curfewEnd)
        } else {
            // Try loading from subject scenario
            loadFromScenario()
        }
    }

    private fun loadFromScenario() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.subjectApi.getMyProfile()
                if (response.isSuccessful && response.body()?.success == true) {
                    val profile = response.body()?.data
                    val scenario = profile?.scenario
                    if (scenario != null) {
                        // Scenario has geofence info — load via geofence API
                        showError("NO_GEOFENCE")
                    } else {
                        showError("NO_GEOFENCE")
                    }
                } else {
                    showError("LOAD_FAILED")
                }
            } catch (e: Exception) {
                showError("NETWORK_ERROR")
            }
        }
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is GeofenceUiState.Loading -> showLoading()
                        is GeofenceUiState.Success -> showGeofence(
                            state.geofence, state.curfewStart, state.curfewEnd
                        )
                        is GeofenceUiState.Error -> showError(state.message)
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

    private fun showGeofence(geofence: GeofenceDetail, curfewStart: String?, curfewEnd: String?) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Area name
        findViewById<TextView>(R.id.tvAreaName).text = geofence.name

        // Type description — backend doesn't return type field; infer from radius presence
        val typeDesc = if (geofence.radius != null) {
            getString(R.string.geofence_type_circle, formatDistance(geofence.radius.toDouble()))
        } else {
            getString(R.string.geofence_type_polygon)
        }
        findViewById<TextView>(R.id.tvGeofenceType).text = typeDesc

        // Address
        if (geofence.address != null) {
            findViewById<TextView>(R.id.tvCenterAddress).text = geofence.address
            findViewById<TextView>(R.id.tvCenterAddress).visibility = View.VISIBLE
        }

        // Map placeholder info
        if (geofence.centerLat != null && geofence.centerLng != null) {
            findViewById<TextView>(R.id.tvMapPlaceholder).text =
                getString(R.string.geofence_map_placeholder)
        }

        // Info note
        findViewById<TextView>(R.id.tvGeofenceInfo).text =
            getString(R.string.geofence_info_note)

        // Curfew section
        if (curfewStart != null && curfewEnd != null) {
            findViewById<LinearLayout>(R.id.curfewSection).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tvCurfewTime).text =
                getString(R.string.geofence_curfew_format, curfewStart, curfewEnd)
            findViewById<TextView>(R.id.tvCurfewNote).text =
                getString(R.string.geofence_curfew_note)
        }
    }

    private fun showError(message: String) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.VISIBLE

        val errorMsg = when (message) {
            "NETWORK_ERROR" -> getString(R.string.error_network)
            "NO_GEOFENCE" -> getString(R.string.geofence_not_assigned)
            "USER_NOT_FOUND" -> getString(R.string.session_expired)
            else -> getString(R.string.error_system)
        }
        findViewById<TextView>(R.id.tvErrorMessage).text = errorMsg
        findViewById<MaterialButton>(R.id.btnRetry).setOnClickListener {
            val geofenceId = intent.getStringExtra("geofenceId")
            if (geofenceId != null) {
                viewModel.loadGeofence(
                    geofenceId,
                    intent.getStringExtra("curfewStart"),
                    intent.getStringExtra("curfewEnd")
                )
            } else {
                loadFromScenario()
            }
        }
    }

    private fun formatDistance(meters: Double): String {
        return if (meters >= 1000) {
            getString(R.string.geofence_distance_km, meters / 1000)
        } else {
            getString(R.string.geofence_distance_m, meters.toInt())
        }
    }
}
