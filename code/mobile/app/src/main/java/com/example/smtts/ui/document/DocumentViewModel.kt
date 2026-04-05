package com.example.smtts.ui.document

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.DocumentInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.IOException

sealed class DocumentUiState {
    data object Loading : DocumentUiState()
    data class Success(
        val legalDocs: List<DocumentInfo>,
        val photoDocs: List<DocumentInfo>
    ) : DocumentUiState()
    data class Error(val message: String) : DocumentUiState()
}

class DocumentViewModel(private val tokenManager: TokenManager) : ViewModel() {

    private val _uiState = MutableStateFlow<DocumentUiState>(DocumentUiState.Loading)
    val uiState: StateFlow<DocumentUiState> = _uiState.asStateFlow()

    private val documentApi = ApiClient.documentApi

    fun loadDocuments() {
        val user = tokenManager.getUser() ?: run {
            _uiState.value = DocumentUiState.Error("USER_NOT_FOUND")
            return
        }

        _uiState.value = DocumentUiState.Loading

        viewModelScope.launch {
            try {
                val response = documentApi.getDocuments(user.id)
                if (response.isSuccessful && response.body()?.success == true) {
                    val docs = response.body()!!.data.data
                    val legal = docs.filter { isLegalDoc(it) }
                    val photos = docs.filter { isPhotoDoc(it) }
                    _uiState.value = DocumentUiState.Success(
                        legalDocs = legal,
                        photoDocs = photos
                    )
                } else {
                    _uiState.value = DocumentUiState.Success(
                        legalDocs = emptyList(),
                        photoDocs = emptyList()
                    )
                }
            } catch (e: IOException) {
                _uiState.value = DocumentUiState.Error("NETWORK_ERROR")
            } catch (e: Exception) {
                _uiState.value = DocumentUiState.Success(
                    legalDocs = emptyList(),
                    photoDocs = emptyList()
                )
            }
        }
    }

    private fun isPhotoDoc(doc: DocumentInfo): Boolean {
        val mime = doc.mimeType ?: return false
        return mime.startsWith("image/")
    }

    private fun isLegalDoc(doc: DocumentInfo): Boolean {
        return !isPhotoDoc(doc)
    }

    class Factory(private val tokenManager: TokenManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(DocumentViewModel::class.java)) {
                return DocumentViewModel(tokenManager) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
