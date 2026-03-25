package com.example.smtts

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.RefreshRequest
import com.example.smtts.nfc.CccdNfcReader
import com.example.smtts.ui.enrollment.EnrollmentActivity
import com.example.smtts.ui.login.LoginActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : BaseNfcActivity() {

    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        // Guard: if not authenticated, redirect to login
        if (!tokenManager.isAuthenticated()) {
            navigateToLogin()
            return
        }

        setContentView(R.layout.activity_main)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        setupUserInfo()
        setupNfcStatus()
        setupQuickActions()
        setupLogout()
    }

    // ── NFC BAC Data Provider ─────────────────────────────

    override fun getNfcBacData(): NfcBacData? {
        if (!tokenManager.hasNfcBacData()) return null
        val cccd = tokenManager.getNfcCccd() ?: return null
        val dob = tokenManager.getNfcDob() ?: return null
        val expiry = tokenManager.getNfcExpiry() ?: return null
        return NfcBacData(cccd, dob, expiry)
    }

    override fun onNfcChipRead(chipData: CccdNfcReader.CccdChipData) {
        // Chip read successfully — popup already shows data
    }

    override fun onNfcNotConfigured(tagSerial: String) {
        // User hasn't configured BAC data yet — show config dialog
    }

    // ── User Info ──────────────────────────────────────────

    private fun setupUserInfo() {
        val user = tokenManager.getUser() ?: return
        findViewById<TextView>(R.id.tvUserName).text = user.fullName
        findViewById<TextView>(R.id.tvUserRole).text = user.role
        findViewById<TextView>(R.id.tvUserArea).text =
            user.dataScope?.areaName ?: "N/A"
    }

    // ── NFC Status + Config ───────────────────────────────

    private fun setupNfcStatus() {
        val banner = findViewById<LinearLayout>(R.id.nfcStatusBanner)
        val tvStatus = findViewById<TextView>(R.id.tvNfcStatus)
        val tvHint = findViewById<TextView>(R.id.tvNfcHint)
        val ivIcon = findViewById<ImageView>(R.id.ivNfcStatus)
        val dot = findViewById<View>(R.id.nfcDot)

        if (isNfcAvailable()) {
            banner.setBackgroundResource(R.drawable.bg_nfc_status)
            ivIcon.setColorFilter(getColor(android.R.color.holo_green_dark))
            dot.setBackgroundResource(R.drawable.bg_nfc_dot_green)

            if (tokenManager.hasNfcBacData()) {
                tvStatus.text = getString(R.string.dashboard_nfc_ready)
                tvHint.text = getString(R.string.nfc_config_set)
            } else {
                tvStatus.text = getString(R.string.dashboard_nfc_ready)
                tvHint.text = getString(R.string.nfc_config_not_set)
            }
            tvStatus.setTextColor(getColor(android.R.color.holo_green_dark))
            tvHint.setTextColor(getColor(android.R.color.holo_green_dark))

            // Tap NFC banner to open config dialog
            banner.setOnClickListener { showNfcConfigDialog() }
        } else {
            banner.setBackgroundResource(R.drawable.bg_nfc_status_off)
            tvStatus.text = getString(R.string.dashboard_nfc_not_available)
            tvHint.text = ""
            tvStatus.setTextColor(getColor(R.color.smtts_zinc_500))
            ivIcon.setColorFilter(getColor(R.color.smtts_zinc_400))
            dot.visibility = View.GONE
        }
    }

    /**
     * Shows a dialog where users enter their CCCD number, date of birth,
     * and expiry date — required for BAC authentication with the NFC chip.
     */
    private fun showNfcConfigDialog() {
        val dialogView = LayoutInflater.from(this)
            .inflate(R.layout.dialog_nfc_config, null)

        val etCccd = dialogView.findViewById<TextInputEditText>(R.id.etCccd)
        val etDob = dialogView.findViewById<TextInputEditText>(R.id.etDob)
        val etExpiry = dialogView.findViewById<TextInputEditText>(R.id.etExpiry)
        val tilCccd = dialogView.findViewById<TextInputLayout>(R.id.tilCccd)
        val tilDob = dialogView.findViewById<TextInputLayout>(R.id.tilDob)
        val tilExpiry = dialogView.findViewById<TextInputLayout>(R.id.tilExpiry)

        // Pre-fill with saved data
        tokenManager.getNfcCccd()?.let { etCccd.setText(it) }
        tokenManager.getNfcDob()?.let { dob ->
            // Convert YYMMDD back to DD/MM/YYYY for display
            etDob.setText(yymmddToDisplay(dob))
        }
        tokenManager.getNfcExpiry()?.let { expiry ->
            etExpiry.setText(yymmddToDisplay(expiry))
        }

        val dialog = MaterialAlertDialogBuilder(this)
            .setView(dialogView)
            .setPositiveButton(getString(R.string.nfc_config_save), null)
            .setNegativeButton(getString(R.string.nfc_config_cancel), null)
            .create()

        dialog.show()

        // Override positive button to add validation
        dialog.getButton(android.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val cccd = etCccd.text.toString().trim()
            val dobStr = etDob.text.toString().trim()
            val expiryStr = etExpiry.text.toString().trim()

            // Reset errors
            tilCccd.error = null
            tilDob.error = null
            tilExpiry.error = null

            var valid = true

            // Validate CCCD: 12 digits
            if (cccd.length != 12 || !cccd.all { it.isDigit() }) {
                tilCccd.error = getString(R.string.nfc_config_error_cccd)
                valid = false
            }

            // Validate DOB: dd/mm/yyyy → YYMMDD
            val dob = displayToYymmdd(dobStr)
            if (dob == null) {
                tilDob.error = getString(R.string.nfc_config_error_dob)
                valid = false
            }

            // Validate Expiry: dd/mm/yyyy → YYMMDD
            val expiry = displayToYymmdd(expiryStr)
            if (expiry == null) {
                tilExpiry.error = getString(R.string.nfc_config_error_expiry)
                valid = false
            }

            if (valid && dob != null && expiry != null) {
                tokenManager.saveNfcBacData(cccd, dob, expiry)
                showSnackbar(getString(R.string.nfc_config_saved))
                setupNfcStatus() // Refresh banner text
                dialog.dismiss()
            }
        }
    }

    /**
     * Convert "dd/mm/yyyy" → "YYMMDD" for BAC.
     * Returns null if format is invalid.
     */
    private fun displayToYymmdd(input: String): String? {
        // Accept dd/mm/yyyy or ddmmyyyy
        val parts = input.replace("-", "/").replace(".", "/").split("/")
        if (parts.size != 3) return null

        val dd = parts[0].toIntOrNull() ?: return null
        val mm = parts[1].toIntOrNull() ?: return null
        val yyyy = parts[2].toIntOrNull() ?: return null

        if (dd !in 1..31 || mm !in 1..12 || yyyy !in 1900..2099) return null

        val yy = yyyy % 100
        return "%02d%02d%02d".format(yy, mm, dd)
    }

    /**
     * Convert "YYMMDD" → "DD/MM/YYYY" for display.
     */
    private fun yymmddToDisplay(yymmdd: String): String {
        if (yymmdd.length != 6) return yymmdd
        val yy = yymmdd.substring(0, 2).toIntOrNull() ?: return yymmdd
        val mm = yymmdd.substring(2, 4)
        val dd = yymmdd.substring(4, 6)
        val yyyy = if (yy > 50) "19$yy" else "20$yy"
        return "$dd/$mm/$yyyy"
    }

    // ── Quick Actions ──────────────────────────────────────

    private fun setupQuickActions() {
        findViewById<MaterialCardView>(R.id.cardCheckin).setOnClickListener {
            showSnackbar(getString(R.string.dashboard_feature_coming_soon))
        }

        findViewById<MaterialCardView>(R.id.cardEnrollment).setOnClickListener {
            startActivity(Intent(this, EnrollmentActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardHistory).setOnClickListener {
            showSnackbar(getString(R.string.dashboard_feature_coming_soon))
        }

        findViewById<MaterialCardView>(R.id.cardProfile).setOnClickListener {
            showSnackbar(getString(R.string.dashboard_feature_coming_soon))
        }
    }

    // ── Logout ─────────────────────────────────────────────

    private fun setupLogout() {
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

    private fun performLogout() {
        val refreshToken = tokenManager.getRefreshToken()

        if (refreshToken != null) {
            lifecycleScope.launch {
                try {
                    withContext(Dispatchers.IO) {
                        ApiClient.authApi.logout(RefreshRequest(refreshToken))
                    }
                } catch (_: Exception) {
                    // Ignore API errors — clear local state regardless
                }
                tokenManager.clearAll()
                navigateToLogin()
            }
        } else {
            tokenManager.clearAll()
            navigateToLogin()
        }
    }

    // ── Navigation ─────────────────────────────────────────

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
