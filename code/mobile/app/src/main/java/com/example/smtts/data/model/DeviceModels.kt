package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Device Info (from GET /subjects/:id/devices) ──

data class DeviceInfo(
    @SerializedName("id") val id: String,
    @SerializedName("device_id") val deviceId: String?,
    @SerializedName("device_model") val deviceModel: String?,
    @SerializedName("os_version") val osVersion: String?,
    @SerializedName("status") val status: String,
    @SerializedName("enrolled_at") val enrolledAt: String?,
    @SerializedName("replaced_at") val replacedAt: String?,
    @SerializedName("created_at") val createdAt: String?
)

// ── Device List Response ──

data class DeviceListResponse(
    @SerializedName("current") val current: DeviceInfo?,
    @SerializedName("history") val history: List<DeviceInfo>
)
