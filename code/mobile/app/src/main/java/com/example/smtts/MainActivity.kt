package com.example.smtts

import android.content.Intent
import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.smtts.data.local.TokenManager
import com.example.smtts.ui.login.LoginActivity

class MainActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        tokenManager = TokenManager(this)

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

        // Display logged-in user info placeholder
        val user = tokenManager.getUser()
        if (user != null) {
            val textView = findViewById<android.widget.TextView>(R.id.tvWelcome)
            textView?.text = "Xin chào, ${user.fullName}\nVai trò: ${user.role}\nKhu vực: ${user.dataScope?.areaName ?: "N/A"}"
        }
    }

    private fun navigateToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
