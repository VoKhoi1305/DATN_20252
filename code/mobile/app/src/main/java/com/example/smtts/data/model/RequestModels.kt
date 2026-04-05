package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Subject Request ──

data class SubjectRequest(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String?,
    @SerializedName("type") val type: String,
    @SerializedName("status") val status: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("details") val details: Map<String, Any>?,
    @SerializedName("reviewNote") val reviewNote: String?,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("reviewedAt") val reviewedAt: String?
)

// ── Create Request Payload ──

data class CreateRequestPayload(
    @SerializedName("type") val type: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("details") val details: Map<String, String>
)

// ── Request List Response ──

data class RequestListResponse(
    @SerializedName("items") val items: List<SubjectRequest>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("totalPages") val totalPages: Int
)
