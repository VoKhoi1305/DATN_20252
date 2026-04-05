package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Notification ──

data class AppNotification(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("title") val title: String,
    @SerializedName("message") val message: String,
    @SerializedName("isRead") val isRead: Boolean,
    @SerializedName("createdAt") val createdAt: String
)

// ── Notification List Response ──

data class NotificationListResponse(
    @SerializedName("items") val items: List<AppNotification>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int,
    @SerializedName("totalPages") val totalPages: Int,
    @SerializedName("unreadCount") val unreadCount: Int?
)
