package com.example.smtts

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.RefreshRequest
import com.example.smtts.ui.checkin.CheckinActivity
import com.example.smtts.ui.enrollment.EnrollmentActivity
import com.example.smtts.ui.geofence.GeofenceActivity
import com.example.smtts.ui.history.HistoryActivity
import com.example.smtts.ui.login.LoginActivity
import com.example.smtts.ui.notification.NotificationActivity
import com.example.smtts.ui.profile.ProfileActivity
import com.example.smtts.ui.request.RequestListActivity
import com.example.smtts.ui.device.DeviceActivity
import com.example.smtts.ui.document.DocumentActivity
import com.example.smtts.ui.contact.ContactActivity
import com.example.smtts.ui.settings.SettingsActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

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

        // Guard: if enrollment not complete, redirect to enrollment
        val user = tokenManager.getUser()
        if (user?.role == "SUBJECT" && !tokenManager.isEnrollmentComplete()) {
            // Check if lifecycle is cached; if not, fetch from API first
            if (tokenManager.getSubjectLifecycle() == null) {
                fetchProfileAndCheckEnrollment()
                return
            }
            navigateToEnrollment()
            return
        }

        setContentView(R.layout.activity_main)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        setupUserInfo()
        setupQuickActions()
        setupLogout()
    }

    // ── Enrollment Check ──────────────────────────────────

    private fun fetchProfileAndCheckEnrollment() {
        lifecycleScope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    ApiClient.subjectApi.getMyProfile()
                }
                if (response.isSuccessful && response.body()?.success == true) {
                    val profile = response.body()?.data
                    if (profile != null) {
                        tokenManager.setSubjectId(profile.id)
                        profile.lifecycle?.let { tokenManager.setSubjectLifecycle(it) }
                    }
                }
            } catch (_: Exception) { }

            // After fetching, check enrollment
            if (!tokenManager.isEnrollmentComplete()) {
                navigateToEnrollment()
            } else {
                // Restart this activity now that we have the data
                recreate()
            }
        }
    }

    private fun navigateToEnrollment() {
        Toast.makeText(
            this,
            getString(R.string.enrollment_required),
            Toast.LENGTH_LONG
        ).show()
        val intent = Intent(this, EnrollmentActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    // ── User Info ──────────────────────────────────────────

    private fun setupUserInfo() {
        val user = tokenManager.getUser() ?: return
        findViewById<TextView>(R.id.tvUserName).text = user.fullName
        findViewById<TextView>(R.id.tvUserRole).text = user.role
        findViewById<TextView>(R.id.tvUserArea).text =
            user.dataScope?.areaName ?: "N/A"
    }

    // ── Quick Actions ──────────────────────────────────────

    private fun setupQuickActions() {
        findViewById<MaterialCardView>(R.id.cardCheckin).setOnClickListener {
            startActivity(Intent(this, CheckinActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardEnrollment).setOnClickListener {
            startActivity(Intent(this, EnrollmentActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardHistory).setOnClickListener {
            startActivity(Intent(this, HistoryActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardProfile).setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardNotification).setOnClickListener {
            startActivity(Intent(this, NotificationActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardRequest).setOnClickListener {
            startActivity(Intent(this, RequestListActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardGeofence).setOnClickListener {
            startActivity(Intent(this, GeofenceActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardDevice).setOnClickListener {
            startActivity(Intent(this, DeviceActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardDocument).setOnClickListener {
            startActivity(Intent(this, DocumentActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardContact).setOnClickListener {
            startActivity(Intent(this, ContactActivity::class.java))
        }

        findViewById<MaterialCardView>(R.id.cardSettings).setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
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
