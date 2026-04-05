package com.example.smtts.ui.profile

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
import com.example.smtts.data.model.SubjectProfile
import com.example.smtts.ui.geofence.GeofenceActivity
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class ProfileActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: ProfileViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_profile)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, ProfileViewModel.Factory(tokenManager)
        )[ProfileViewModel::class.java]

        setupToolbar()
        observeState()
        viewModel.loadProfile()
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is ProfileUiState.Loading -> showLoading()
                    is ProfileUiState.Success -> showProfile(state.profile)
                    is ProfileUiState.Error -> showError(state.message)
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showProfile(profile: SubjectProfile) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Personal info
        findViewById<TextView>(R.id.tvFullName).text = profile.fullName
        findViewById<TextView>(R.id.tvProfileCode).text =
            getString(R.string.profile_code_format, profile.code)
        findViewById<TextView>(R.id.tvCccd).text = profile.cccd
        findViewById<TextView>(R.id.tvDateOfBirth).text = profile.dateOfBirth ?: "\u2014"
        findViewById<TextView>(R.id.tvGender).text = when (profile.gender) {
            "MALE" -> getString(R.string.nfc_result_gender_male)
            "FEMALE" -> getString(R.string.nfc_result_gender_female)
            else -> "\u2014"
        }
        findViewById<TextView>(R.id.tvAddress).text = profile.address ?: "\u2014"
        findViewById<TextView>(R.id.tvPhone).text = formatPhone(profile.phone)

        // Management status
        findViewById<TextView>(R.id.tvStatus).text = getStatusDisplay(profile.status)
        findViewById<TextView>(R.id.tvEnrollmentDate).text = profile.enrollmentDate ?: "\u2014"

        // Scenario info (embedded in profile)
        val scenario = profile.scenario
        if (scenario != null) {
            findViewById<LinearLayout>(R.id.scenarioSection).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tvScenarioName).text = scenario.name
            val frequency = getFrequencyDisplay(scenario.checkinFrequency)
            findViewById<TextView>(R.id.tvScenarioDetail).text = frequency
        }

        // Compliance rate
        val compliance = profile.complianceRate
        if (compliance != null) {
            findViewById<LinearLayout>(R.id.complianceSection).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tvComplianceRate).text =
                getString(R.string.profile_compliance_format, compliance)
            findViewById<TextView>(R.id.tvComplianceLabel).text = getComplianceLabel(compliance)
            findViewById<ProgressBar>(R.id.complianceBar).progress = compliance.toInt()
        }

        // Area
        val area = profile.area
        if (area != null) {
            findViewById<TextView>(R.id.tvAreaName).text = area.name
        }

        // Family info (single object with father/mother/spouse)
        val family = profile.family
        if (family != null && hasAnyFamilyData(family)) {
            findViewById<LinearLayout>(R.id.familySection).visibility = View.VISIBLE
            val familyContainer = findViewById<LinearLayout>(R.id.familyContainer)
            familyContainer.removeAllViews()

            family.fatherName?.let { name ->
                addFamilyRow(familyContainer, name, getString(R.string.profile_family_father))
            }
            family.motherName?.let { name ->
                addFamilyRow(familyContainer, name, getString(R.string.profile_family_mother))
            }
            family.spouseName?.let { name ->
                addFamilyRow(familyContainer, name, getString(R.string.profile_family_spouse))
            }
            if ((family.dependents ?: 0) > 0) {
                addFamilyRow(
                    familyContainer,
                    "${family.dependents} ${getString(R.string.profile_family_dependents)}",
                    getString(R.string.profile_family_dependents_label)
                )
            }
        }

        // Legal info (single object with decision details)
        val legal = profile.legal
        if (legal != null && legal.decisionNumber != null) {
            findViewById<LinearLayout>(R.id.legalSection).visibility = View.VISIBLE
            val legalContainer = findViewById<LinearLayout>(R.id.legalContainer)
            legalContainer.removeAllViews()

            val docView = layoutInflater.inflate(R.layout.item_legal_doc, legalContainer, false)
            docView.findViewById<TextView>(R.id.tvDocType).text =
                legal.managementType ?: getString(R.string.profile_legal_decision)
            docView.findViewById<TextView>(R.id.tvDocNumber).text =
                legal.decisionNumber?.let { getString(R.string.profile_doc_number_format, it) } ?: ""
            docView.findViewById<TextView>(R.id.tvDocDate).text = legal.decisionDate ?: ""
            docView.findViewById<TextView>(R.id.tvDocDuration).text =
                if (legal.startDate != null && legal.endDate != null) {
                    "${legal.startDate} \u2192 ${legal.endDate}"
                } else ""
            legalContainer.addView(docView)
        }
    }

    private fun hasAnyFamilyData(family: com.example.smtts.data.model.SubjectFamily): Boolean {
        return family.fatherName != null || family.motherName != null ||
                family.spouseName != null || (family.dependents ?: 0) > 0
    }

    private fun addFamilyRow(container: LinearLayout, name: String, relationship: String) {
        val memberView = layoutInflater.inflate(R.layout.item_family_member, container, false)
        memberView.findViewById<TextView>(R.id.tvMemberName).text = "$name ($relationship)"
        memberView.findViewById<TextView>(R.id.tvMemberPhone).text = "\u2014"
        container.addView(memberView)
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
            viewModel.loadProfile()
        }
    }

    private fun getStatusDisplay(status: String): String = when (status) {
        "ACTIVE" -> getString(R.string.profile_status_active)
        "ENROLLED" -> getString(R.string.profile_status_enrolled)
        "SUSPENDED" -> getString(R.string.profile_status_suspended)
        "REINTEGRATE" -> getString(R.string.profile_status_reintegrating)
        "ENDED" -> getString(R.string.profile_status_completed)
        "INIT" -> getString(R.string.profile_status_init)
        else -> status
    }

    private fun getFrequencyDisplay(frequency: String?): String {
        if (frequency.isNullOrBlank()) return "\u2014"
        return when (frequency.uppercase()) {
            "DAILY" -> getString(R.string.profile_freq_daily)
            "WEEKLY" -> getString(R.string.profile_freq_weekly)
            "BIWEEKLY" -> getString(R.string.profile_freq_biweekly)
            "MONTHLY" -> getString(R.string.profile_freq_monthly)
            else -> frequency
        }
    }

    private fun getComplianceLabel(rate: Double): String = when {
        rate >= 90 -> getString(R.string.profile_compliance_very_good)
        rate >= 70 -> getString(R.string.profile_compliance_good)
        rate >= 50 -> getString(R.string.profile_compliance_improve)
        else -> getString(R.string.profile_compliance_poor)
    }

    private fun formatPhone(phone: String?): String? {
        if (phone == null) return null
        val digits = phone.replace(Regex("[^0-9]"), "")
        return if (digits.length == 10) {
            "${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}"
        } else phone
    }
}
