package com.example.smtts.ui.request

import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.LinearLayout
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
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.launch

class CreateRequestActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: CreateRequestViewModel

    private val requestTypes = listOf("TRAVEL", "POSTPONE", "CHANGE_DEVICE", "CHANGE_ADDRESS")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_create_request)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, CreateRequestViewModel.Factory(tokenManager)
        )[CreateRequestViewModel::class.java]

        setupToolbar()
        setupTypeDropdown()
        setupSubmitButton()
        observeState()
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun setupTypeDropdown() {
        val typeNames = arrayOf(
            getString(R.string.request_type_travel),
            getString(R.string.request_type_postpone),
            getString(R.string.request_type_change_device),
            getString(R.string.request_type_change_address)
        )
        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, typeNames)
        val dropdown = findViewById<AutoCompleteTextView>(R.id.dropdownType)
        dropdown.setAdapter(adapter)

        dropdown.setOnItemClickListener { _, _, position, _ ->
            showFieldsForType(requestTypes[position])
        }
    }

    private fun showFieldsForType(type: String) {
        // Hide all optional fields first
        findViewById<LinearLayout>(R.id.travelFields).visibility = View.GONE
        findViewById<LinearLayout>(R.id.postponeFields).visibility = View.GONE
        findViewById<LinearLayout>(R.id.changeAddressFields).visibility = View.GONE

        when (type) {
            "TRAVEL" -> findViewById<LinearLayout>(R.id.travelFields).visibility = View.VISIBLE
            "POSTPONE" -> findViewById<LinearLayout>(R.id.postponeFields).visibility = View.VISIBLE
            "CHANGE_ADDRESS" -> findViewById<LinearLayout>(R.id.changeAddressFields).visibility = View.VISIBLE
        }
    }

    private fun setupSubmitButton() {
        findViewById<MaterialButton>(R.id.btnSubmit).setOnClickListener {
            submitRequest()
        }
    }

    private fun submitRequest() {
        // Get selected type
        val dropdown = findViewById<AutoCompleteTextView>(R.id.dropdownType)
        val selectedTypeName = dropdown.text.toString()
        val typeNames = arrayOf(
            getString(R.string.request_type_travel),
            getString(R.string.request_type_postpone),
            getString(R.string.request_type_change_device),
            getString(R.string.request_type_change_address)
        )
        val typeIndex = typeNames.indexOf(selectedTypeName)

        // Validate type
        val tilType = findViewById<TextInputLayout>(R.id.tilType)
        if (typeIndex < 0) {
            tilType.error = getString(R.string.request_error_type_required)
            return
        }
        tilType.error = null
        val type = requestTypes[typeIndex]

        // Validate reason
        val etReason = findViewById<TextInputEditText>(R.id.etReason)
        val tilReason = findViewById<TextInputLayout>(R.id.tilReason)
        val reason = etReason.text.toString().trim()
        if (reason.isBlank()) {
            tilReason.error = getString(R.string.request_error_reason_required)
            return
        }
        tilReason.error = null

        // Build details map based on type
        val details = mutableMapOf<String, String>()
        var valid = true

        when (type) {
            "TRAVEL" -> {
                val destination = findViewById<TextInputEditText>(R.id.etDestination).text.toString().trim()
                val dateFrom = findViewById<TextInputEditText>(R.id.etDateFrom).text.toString().trim()
                val dateTo = findViewById<TextInputEditText>(R.id.etDateTo).text.toString().trim()

                if (destination.isBlank()) {
                    findViewById<TextInputLayout>(R.id.tilDestination).error =
                        getString(R.string.request_error_destination_required)
                    valid = false
                }
                if (dateFrom.isBlank()) {
                    findViewById<TextInputLayout>(R.id.tilDateFrom).error =
                        getString(R.string.request_error_date_required)
                    valid = false
                }
                if (dateTo.isBlank()) {
                    findViewById<TextInputLayout>(R.id.tilDateTo).error =
                        getString(R.string.request_error_date_required)
                    valid = false
                }
                if (valid) {
                    details["destination"] = destination
                    details["date_from"] = dateFrom
                    details["date_to"] = dateTo
                }
            }
            "POSTPONE" -> {
                val date = findViewById<TextInputEditText>(R.id.etPostponeDate).text.toString().trim()
                if (date.isBlank()) {
                    findViewById<TextInputLayout>(R.id.tilPostponeDate).error =
                        getString(R.string.request_error_date_required)
                    valid = false
                }
                if (valid) {
                    details["date"] = date
                }
            }
            "CHANGE_ADDRESS" -> {
                val newAddress = findViewById<TextInputEditText>(R.id.etNewAddress).text.toString().trim()
                if (newAddress.isBlank()) {
                    findViewById<TextInputLayout>(R.id.tilNewAddress).error =
                        getString(R.string.request_error_address_required)
                    valid = false
                }
                if (valid) {
                    details["new_address"] = newAddress
                }
            }
        }

        if (valid) {
            viewModel.submitRequest(type, reason, details)
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    val btnSubmit = findViewById<MaterialButton>(R.id.btnSubmit)
                    when (state) {
                        is CreateRequestUiState.Idle -> {
                            btnSubmit.isEnabled = true
                            btnSubmit.text = getString(R.string.request_submit_btn)
                        }
                        is CreateRequestUiState.Submitting -> {
                            btnSubmit.isEnabled = false
                            btnSubmit.text = getString(R.string.request_submitting)
                        }
                        is CreateRequestUiState.Success -> {
                            Snackbar.make(
                                findViewById(R.id.main),
                                getString(R.string.request_submit_success),
                                Snackbar.LENGTH_SHORT
                            ).setBackgroundTint(getColor(R.color.smtts_green_700))
                                .setTextColor(getColor(R.color.white))
                                .show()
                            viewModel.resetState()
                            finish()
                        }
                        is CreateRequestUiState.Error -> {
                            btnSubmit.isEnabled = true
                            btnSubmit.text = getString(R.string.request_submit_btn)
                            val errorMsg = when (state.message) {
                                "NETWORK_ERROR" -> getString(R.string.error_network)
                                "VALIDATION_ERROR" -> getString(R.string.request_error_validation)
                                "RATE_LIMITED" -> getString(R.string.error_429)
                                else -> getString(R.string.error_system)
                            }
                            Snackbar.make(
                                findViewById(R.id.main), errorMsg, Snackbar.LENGTH_LONG
                            ).setBackgroundTint(getColor(R.color.smtts_red_700))
                                .setTextColor(getColor(R.color.white))
                                .show()
                            viewModel.resetState()
                        }
                    }
                }
            }
        }
    }
}
