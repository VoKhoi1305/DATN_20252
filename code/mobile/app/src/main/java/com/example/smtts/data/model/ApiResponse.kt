package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

/**
 * Generic API response wrapper matching backend format:
 * { "success": true, "data": T, "timestamp": "..." }
 */
data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T,
    @SerializedName("timestamp") val timestamp: String
)

/**
 * API error response format:
 * { "success": false, "error": { "code": "...", "message": "..." }, "timestamp": "..." }
 */
data class ApiErrorResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("error") val error: ApiErrorDetail,
    @SerializedName("timestamp") val timestamp: String
)

data class ApiErrorDetail(
    @SerializedName("code") val code: String,
    @SerializedName("message") val message: String
)
