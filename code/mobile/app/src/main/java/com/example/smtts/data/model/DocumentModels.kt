package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Document Info (from GET /subjects/:id/documents) ──

data class DocumentInfo(
    @SerializedName("id") val id: String,
    @SerializedName("original_name") val originalName: String,
    @SerializedName("stored_path") val storedPath: String,
    @SerializedName("mime_type") val mimeType: String?,
    @SerializedName("size") val size: Long?,
    @SerializedName("file_type") val fileType: String?,
    @SerializedName("uploaded_by_id") val uploadedById: String?,
    @SerializedName("uploaded_by_name") val uploadedByName: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("is_public") val isPublic: Boolean = false
)

// ── Document List Response ──

data class DocumentListResponse(
    @SerializedName("data") val data: List<DocumentInfo>
)
