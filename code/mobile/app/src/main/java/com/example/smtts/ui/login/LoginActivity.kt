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
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.databinding.ActivityLoginBinding
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var viewModel: LoginViewModel
    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Handle system bars insets for edge-to-edge
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            // Only apply bottom padding (top is handled by accent bar area)
            v.setPadding(0, systemBars.top, 0, systemBars.bottom)
            insets
        }

        // Initialize TokenManager and ApiClient
        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        // Check if already authenticated → redirect to main
        if (tokenManager.isAuthenticated()) {
            navigateToMain()
            return
        }

        // Initialize ViewModel
        viewModel = ViewModelProvider(
            this,
            LoginViewModel.Factory(tokenManager)
        )[LoginViewModel::class.java]

        setupUI()
        observeState()
    }

    private fun setupUI() {
        // Clear validation errors on text change (matching web onBlur behavior)
        binding.etUsername.doAfterTextChanged {
            if (binding.tilUsername.error != null) {
                binding.tilUsername.error = null
            }
        }

        binding.etPassword.doAfterTextChanged {
            if (binding.tilPassword.error != null) {
                binding.tilPassword.error = null
            }
        }

        // Handle keyboard "Done" action on password field → submit
        binding.etPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                attemptLogin()
                true
            } else {
                false
            }
        }

        // Login button click
        binding.btnLogin.setOnClickListener {
            attemptLogin()
        }

        // Navigate to activation screen
        binding.tvActivateLink.setOnClickListener {
            startActivity(Intent(this, ActivationActivity::class.java))
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is LoginUiState.Idle -> {
                            setFormEnabled(true)
                            binding.btnLogin.text = getString(R.string.login_submit)
                        }

                        is LoginUiState.Loading -> {
                            setFormEnabled(false)
                            binding.btnLogin.text = getString(R.string.login_submitting)
                            hideKeyboard()
                        }

                        is LoginUiState.Success -> {
                            navigateToMain()
                        }

                        is LoginUiState.RequireOtp -> {
                            // TODO: Navigate to OTP verification screen
                            showSnackbar(getString(R.string.otp_required_message))
                            setFormEnabled(true)
                            binding.btnLogin.text = getString(R.string.login_submit)
                            viewModel.resetState()
                        }

                        is LoginUiState.RequireOtpSetup -> {
                            // TODO: Navigate to OTP setup screen
                            showSnackbar(getString(R.string.otp_setup_required_message))
                            setFormEnabled(true)
                            binding.btnLogin.text = getString(R.string.login_submit)
                            viewModel.resetState()
                        }

                        is LoginUiState.Error -> {
                            handleError(state)
                            setFormEnabled(true)
                            binding.btnLogin.text = getString(R.string.login_submit)
                            viewModel.resetState()
                        }
                    }
                }
            }
        }
    }

    /**
     * Validate form fields client-side, then call API.
     * Matches web validation: required + minLength for both fields.
     */
    private fun attemptLogin() {
        val username = binding.etUsername.text?.toString()?.trim() ?: ""
        val password = binding.etPassword.text?.toString() ?: ""

        var hasError = false

        // Validate username
        if (username.isEmpty()) {
            binding.tilUsername.error = getString(R.string.error_username_required)
            hasError = true
        } else if (username.length < 3) {
            binding.tilUsername.error = getString(R.string.error_username_min_length)
            hasError = true
        }

        // Validate password
        if (password.isEmpty()) {
            binding.tilPassword.error = getString(R.string.error_password_required)
            hasError = true
        } else if (password.length < 6) {
            binding.tilPassword.error = getString(R.string.error_password_min_length)
            hasError = true
        }

        if (hasError) return

        viewModel.login(username, password)
    }

    /**
     * Handle API error responses matching web behavior:
     * - 401: wrong credentials → clear password, focus password
     * - 403: account locked
     * - 429: rate limited
     * - Network/system errors
     */
    private fun handleError(error: LoginUiState.Error) {
        val message = when (error.message) {
            "AUTH_401" -> {
                // Clear password and focus it (matching web behavior)
                binding.etPassword.text?.clear()
                binding.etPassword.requestFocus()
                getString(R.string.error_401)
            }
            "AUTH_403" -> getString(R.string.error_403)
            "AUTH_429" -> getString(R.string.error_429)
            "NETWORK_ERROR" -> getString(R.string.error_network)
            else -> getString(R.string.error_system)
        }

        showSnackbar(message)
    }

    private fun setFormEnabled(enabled: Boolean) {
        binding.etUsername.isEnabled = enabled
        binding.etPassword.isEnabled = enabled
        binding.btnLogin.isEnabled = enabled
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
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
        currentFocus?.let {
            imm.hideSoftInputFromWindow(it.windowToken, 0)
        }
    }
}
