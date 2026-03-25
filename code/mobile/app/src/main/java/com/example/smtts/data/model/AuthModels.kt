package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Request models ──

data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String
)

data class RefreshRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class VerifyOtpRequest(
    @SerializedName("otpCode") val otpCode: String
)

data class ConfirmOtpSetupRequest(
    @SerializedName("otpCode") val otpCode: String
)

data class ActivateRequest(
    @SerializedName("subjectCode") val subjectCode: String,
    @SerializedName("cccd") val cccd: String,
    @SerializedName("password") val password: String,
    @SerializedName("confirmPassword") val confirmPassword: String
)

data class ActivateResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("user") val user: UserInfo,
    @SerializedName("requireEnrollment") val requireEnrollment: Boolean = true
)

// ── Response models ──

data class LoginResponse(
    @SerializedName("requireOtp") val requireOtp: Boolean,
    @SerializedName("requireOtpSetup") val requireOtpSetup: Boolean,
    @SerializedName("tempToken") val tempToken: String?,
    @SerializedName("accessToken") val accessToken: String?,
    @SerializedName("refreshToken") val refreshToken: String?,
    @SerializedName("user") val user: UserInfo?
)

data class VerifyOtpResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("user") val user: UserInfo
)

data class SetupOtpResponse(
    @SerializedName("secret") val secret: String,
    @SerializedName("qrCodeDataUrl") val qrCodeDataUrl: String
)

data class ConfirmOtpSetupResponse(
    @SerializedName("backupCodes") val backupCodes: List<String>,
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("user") val user: UserInfo
)

data class RefreshResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String
)

// ── Shared models ──

data class UserInfo(
    @SerializedName("id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("role") val role: String,
    @SerializedName("dataScope") val dataScope: DataScope?,
    @SerializedName("otpEnabled") val otpEnabled: Boolean
)

data class DataScope(
    @SerializedName("level") val level: String,
    @SerializedName("areaId") val areaId: String,
    @SerializedName("areaName") val areaName: String
)
