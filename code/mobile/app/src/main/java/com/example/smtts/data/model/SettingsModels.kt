package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Change Password Request (POST /auth/change-password) ──

data class ChangePasswordRequest(
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String,
    @SerializedName("confirmPassword") val confirmPassword: String
)

// ── Change Password Response ──

data class ChangePasswordResponse(
    @SerializedName("message") val message: String?
)
