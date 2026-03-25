package com.example.smtts.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.example.smtts.MainActivity
import com.example.smtts.R
import com.example.smtts.ui.enrollment.EnrollmentActivity
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.databinding.ActivityActivationBinding
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

class ActivationActivity : AppCompatActivity() {

    private lateinit var binding: ActivityActivationBinding
    private lateinit var viewModel: ActivationViewModel
    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        binding = ActivityActivationBinding.inflate(layoutInflater)
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(0, systemBars.top, 0, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this,
            ActivationViewModel.Factory(tokenManager)
        )[ActivationViewModel::class.java]

        setupUI()
        observeState()
    }

    private fun setupUI() {
        // Clear errors on text change
        binding.etSubjectCode.doAfterTextChanged {
            if (binding.tilSubjectCode.error != null) binding.tilSubjectCode.error = null
        }
        binding.etCccd.doAfterTextChanged {
            if (binding.tilCccd.error != null) binding.tilCccd.error = null
        }
        binding.etPassword.doAfterTextChanged {
            if (binding.tilPassword.error != null) binding.tilPassword.error = null
        }
        binding.etConfirmPassword.doAfterTextChanged {
            if (binding.tilConfirmPassword.error != null) binding.tilConfirmPassword.error = null
        }

        // Keyboard Done → submit
        binding.etConfirmPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                attemptActivation()
                true
            } else false
        }

        // Activate button
        binding.btnActivate.setOnClickListener { attemptActivation() }

        // Navigate to login
        binding.tvLoginLink.setOnClickListener { finish() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is ActivationUiState.Idle -> {
                            setFormEnabled(true)
                            binding.btnActivate.text = getString(R.string.activate_submit)
                        }

                        is ActivationUiState.Loading -> {
                            setFormEnabled(false)
                            binding.btnActivate.text = getString(R.string.activate_submitting)
                            hideKeyboard()
                        }

                        is ActivationUiState.Success -> {
                            showSnackbar(getString(R.string.activate_success))
                            navigateToMain()
                        }

                        is ActivationUiState.Error -> {
                            handleError(state)
                            setFormEnabled(true)
                            binding.btnActivate.text = getString(R.string.activate_submit)
                            viewModel.resetState()
                        }
                    }
                }
            }
        }
    }

    private fun attemptActivation() {
        val subjectCode = binding.etSubjectCode.text?.toString()?.trim()?.uppercase() ?: ""
        val cccd = binding.etCccd.text?.toString()?.trim() ?: ""
        val password = binding.etPassword.text?.toString() ?: ""
        val confirmPassword = binding.etConfirmPassword.text?.toString() ?: ""

        var hasError = false

        // Validate subject code
        if (subjectCode.isEmpty()) {
            binding.tilSubjectCode.error = getString(R.string.error_subject_code_required)
            hasError = true
        }

        // Validate CCCD
        if (cccd.isEmpty()) {
            binding.tilCccd.error = getString(R.string.error_cccd_required)
            hasError = true
        } else if (cccd.length != 12) {
            binding.tilCccd.error = getString(R.string.error_cccd_length)
            hasError = true
        } else if (!cccd.matches(Regex("^\\d{12}$"))) {
            binding.tilCccd.error = getString(R.string.error_cccd_format)
            hasError = true
        }

        // Validate password
        if (password.isEmpty()) {
            binding.tilPassword.error = getString(R.string.error_password_required)
            hasError = true
        } else if (password.length < 8) {
            binding.tilPassword.error = getString(R.string.error_password_min_8)
            hasError = true
        } else if (!password.matches(Regex("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$"))) {
            binding.tilPassword.error = getString(R.string.error_password_format)
            hasError = true
        }

        // Validate confirm password
        if (confirmPassword.isEmpty()) {
            binding.tilConfirmPassword.error = getString(R.string.error_confirm_password_required)
            hasError = true
        } else if (confirmPassword != password) {
            binding.tilConfirmPassword.error = getString(R.string.error_password_mismatch)
            hasError = true
        }

        if (hasError) return

        viewModel.activate(subjectCode, cccd, password, confirmPassword)
    }

    private fun handleError(error: ActivationUiState.Error) {
        val message = when (error.errorCode) {
            "SUBJECT_NOT_FOUND" -> getString(R.string.error_subject_not_found)
            "CCCD_MISMATCH" -> getString(R.string.error_cccd_mismatch)
            "SUBJECT_ALREADY_ACTIVATED" -> getString(R.string.error_already_activated)
            "CONFLICT" -> getString(R.string.error_cccd_conflict)
            "PASSWORD_CONFIRM_MISMATCH" -> getString(R.string.error_password_mismatch)
            "AUTH_429" -> getString(R.string.error_429)
            "NETWORK_ERROR" -> getString(R.string.error_network)
            else -> getString(R.string.error_system)
        }
        showSnackbar(message)
    }

    private fun setFormEnabled(enabled: Boolean) {
        binding.etSubjectCode.isEnabled = enabled
        binding.etCccd.isEnabled = enabled
        binding.etPassword.isEnabled = enabled
        binding.etConfirmPassword.isEnabled = enabled
        binding.btnActivate.isEnabled = enabled
        binding.tvLoginLink.isEnabled = enabled
    }

    private fun navigateToMain() {
        // After activation, navigate to enrollment (NFC + Face biometric registration)
        val intent = Intent(this, EnrollmentActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showSnackbar(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG)
            .setBackgroundTint(getColor(R.color.smtts_zinc_900))
            .setTextColor(getColor(R.color.white))
            .show()
    }

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        currentFocus?.let { imm.hideSoftInputFromWindow(it.windowToken, 0) }
    }
}
