package com.example.smtts.ui.contact

import android.content.Intent
import android.net.Uri
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
import com.example.smtts.data.model.SubjectArea
import com.example.smtts.data.model.SubjectOfficer
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class ContactActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: ContactViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_contact)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, ContactViewModel.Factory(tokenManager)
        )[ContactViewModel::class.java]

        setupToolbar()
        observeState()
        viewModel.loadContact()
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is ContactUiState.Loading -> showLoading()
                    is ContactUiState.Success -> showContact(state.officer, state.area)
                    is ContactUiState.Error -> showError(state.message)
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showContact(officer: SubjectOfficer?, area: SubjectArea?) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Officer section
        if (officer != null) {
            findViewById<LinearLayout>(R.id.officerSection).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tvOfficerName).text = officer.fullName
            findViewById<TextView>(R.id.tvOfficerRole).text =
                getString(R.string.contact_role_field_officer)
        } else {
            findViewById<LinearLayout>(R.id.officerSection).visibility = View.GONE
            findViewById<LinearLayout>(R.id.noOfficerSection).visibility = View.VISIBLE
        }

        // Area/agency section
        if (area != null) {
            findViewById<LinearLayout>(R.id.agencySection).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tvAgencyName).text = area.name
        }

        // Hotline section (always visible)
        findViewById<MaterialButton>(R.id.btnCallHotline).setOnClickListener {
            val intent = Intent(Intent.ACTION_DIAL)
            intent.data = Uri.parse("tel:19001234")
            startActivity(intent)
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
            viewModel.loadContact()
        }
    }
}
