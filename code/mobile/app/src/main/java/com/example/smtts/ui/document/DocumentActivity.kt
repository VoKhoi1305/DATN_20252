package com.example.smtts.ui.document

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
import com.example.smtts.BuildConfig
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.DocumentInfo
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch

class DocumentActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private lateinit var viewModel: DocumentViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_document)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this, DocumentViewModel.Factory(tokenManager)
        )[DocumentViewModel::class.java]

        setupToolbar()
        observeState()
        viewModel.loadDocuments()
    }

    private fun setupToolbar() {
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                when (state) {
                    is DocumentUiState.Loading -> showLoading()
                    is DocumentUiState.Success -> showDocuments(state.legalDocs, state.photoDocs)
                    is DocumentUiState.Error -> showError(state.message)
                }
            }
        }
    }

    private fun showLoading() {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.VISIBLE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
    }

    private fun showDocuments(legalDocs: List<DocumentInfo>, photoDocs: List<DocumentInfo>) {
        findViewById<ProgressBar>(R.id.progressBar).visibility = View.GONE
        findViewById<LinearLayout>(R.id.errorLayout).visibility = View.GONE
        findViewById<LinearLayout>(R.id.contentLayout).visibility = View.VISIBLE

        // Legal documents section
        if (legalDocs.isNotEmpty()) {
            findViewById<LinearLayout>(R.id.legalSection).visibility = View.VISIBLE
            val container = findViewById<LinearLayout>(R.id.legalContainer)
            container.removeAllViews()
            for (doc in legalDocs) {
                addDocumentRow(container, doc)
            }
        }

        // Photo documents section
        if (photoDocs.isNotEmpty()) {
            findViewById<LinearLayout>(R.id.photoSection).visibility = View.VISIBLE
            val container = findViewById<LinearLayout>(R.id.photoContainer)
            container.removeAllViews()
            for (doc in photoDocs) {
                addDocumentRow(container, doc)
            }
        }

        // Empty state
        if (legalDocs.isEmpty() && photoDocs.isEmpty()) {
            findViewById<LinearLayout>(R.id.emptySection).visibility = View.VISIBLE
        }
    }

    private fun addDocumentRow(container: LinearLayout, doc: DocumentInfo) {
        val view = layoutInflater.inflate(R.layout.item_document, container, false)
        view.findViewById<TextView>(R.id.tvDocName).text = doc.originalName
        view.findViewById<TextView>(R.id.tvDocDate).text =
            getString(R.string.doc_uploaded_format, doc.createdAt ?: "\u2014")
        view.findViewById<TextView>(R.id.tvDocSize).text = formatFileSize(doc.size)

        view.findViewById<MaterialButton>(R.id.btnViewDoc).setOnClickListener {
            openDocument(doc)
        }
        container.addView(view)
    }

    private fun openDocument(doc: DocumentInfo) {
        val baseUrl = BuildConfig.API_BASE_URL.removeSuffix("/")
        val url = "$baseUrl${doc.storedPath}"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        startActivity(intent)
    }

    private fun formatFileSize(bytes: Long?): String {
        if (bytes == null) return ""
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> "${"%.1f".format(bytes.toDouble() / (1024 * 1024))} MB"
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
            viewModel.loadDocuments()
        }
    }
}
