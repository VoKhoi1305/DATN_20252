package com.example.smtts.ui.settings

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.smtts.BuildConfig
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.RefreshRequest
import com.example.smtts.ui.login.LoginActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SettingsActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: SettingsViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_settings)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, SettingsViewModel.Factory(tokenManager)
        )[SettingsViewModel::class.java]

        setupToolbar()
        setupActions()
        observeState()

        // Display app version
        findViewById<TextView>(R.id.tvAppVersion).text =
            getString(R.string.settings_version_format, BuildConfig.VERSION_NAME)
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun setupActions() {
        // Change password
        findViewById<LinearLayout>(R.id.rowChangePassword).setOnClickListener {
            showChangePasswordDialog()
        }

        // Logout
        findViewById<MaterialButton>(R.id.btnLogout).setOnClickListener {
            MaterialAlertDialogBuilder(this)
                .setTitle(getString(R.string.dashboard_logout))
                .setMessage(getString(R.string.dashboard_logout_confirm))
                .setNegativeButton(getString(R.string.dashboard_logout_no), null)
                .setPositiveButton(getString(R.string.dashboard_logout_yes)) { _, _ ->
                    performLogout()
                }
                .show()
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.changePasswordState.collect { state ->
                when (state) {
                    is ChangePasswordUiState.Success -> {
                        showSnackbar(getString(R.string.settings_password_changed))
                        viewModel.resetChangePasswordState()
                    }
                    is ChangePasswordUiState.Error -> {
                        val msg = when (state.message) {
                            "WRONG_PASSWORD" -> getString(R.string.settings_wrong_password)
                            "VALIDATION_ERROR" -> getString(R.string.settings_password_validation)
                            "NETWORK_ERROR" -> getString(R.string.error_network)
                            else -> getString(R.string.error_system)
                        }
                        showSnackbar(msg)
                        viewModel.resetChangePasswordState()
                    }
                    else -> { }
                }
            }
        }
    }

    private fun showChangePasswordDialog() {
        val dialogView = LayoutInflater.from(this)
            .inflate(R.layout.dialog_change_password, null)

        val etCurrentPassword = dialogView.findViewById<TextInputEditText>(R.id.etCurrentPassword)
        val etNewPassword = dialogView.findViewById<TextInputEditText>(R.id.etNewPassword)
        val etConfirmPassword = dialogView.findViewById<TextInputEditText>(R.id.etConfirmPassword)
        val tilCurrentPassword = dialogView.findViewById<TextInputLayout>(R.id.tilCurrentPassword)
        val tilNewPassword = dialogView.findViewById<TextInputLayout>(R.id.tilNewPassword)
        val tilConfirmPassword = dialogView.findViewById<TextInputLayout>(R.id.tilConfirmPassword)

        val dialog = MaterialAlertDialogBuilder(this)
            .setTitle(getString(R.string.settings_change_password))
            .setView(dialogView)
            .setPositiveButton(getString(R.string.settings_confirm), null)
            .setNegativeButton(getString(R.string.nfc_config_cancel), null)
            .create()

        dialog.show()

        dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val current = etCurrentPassword.text.toString().trim()
            val newPwd = etNewPassword.text.toString().trim()
            val confirm = etConfirmPassword.text.toString().trim()

            tilCurrentPassword.error = null
            tilNewPassword.error = null
            tilConfirmPassword.error = null

            var valid = true

            if (current.isEmpty()) {
                tilCurrentPassword.error = getString(R.string.error_password_required)
                valid = false
            }
            if (newPwd.length < 8) {
                tilNewPassword.error = getString(R.string.error_password_min_8)
                valid = false
            }
            if (confirm != newPwd) {
                tilConfirmPassword.error = getString(R.string.error_password_mismatch)
                valid = false
            }

            if (valid) {
                viewModel.changePassword(current, newPwd, confirm)
                dialog.dismiss()
            }
        }
    }

    private fun performLogout() {
        val refreshToken = tokenManager.getRefreshToken()

        if (refreshToken != null) {
            lifecycleScope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        ApiClient.authApi.logout(RefreshRequest(refreshToken))
                    }
                } catch (_: Exception) { }
                tokenManager.clearAll()
                navigateToLogin()
            }
        } else {
            tokenManager.clearAll()
            navigateToLogin()
        }
    }

    private fun navigateToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showSnackbar(message: String) {
        Snackbar.make(findViewById(R.id.main), message, Snackbar.LENGTH_SHORT)
            .setBackgroundTint(getColor(R.color.smtts_zinc_900))
            .setTextColor(getColor(R.color.white))
            .show()
    }
}
