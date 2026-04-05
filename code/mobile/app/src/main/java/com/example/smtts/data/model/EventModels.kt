package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Check-in Event (from GET /events) ──

data class CheckinEvent(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String?,
    @SerializedName("type") val type: String,
    @SerializedName("result") val result: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("client_timestamp") val clientTimestamp: String?,
    @SerializedName("gps_lat") val gpsLat: Double?,
    @SerializedName("gps_lng") val gpsLng: Double?,
    @SerializedName("in_geofence") val inGeofence: Boolean?,
    @SerializedName("face_match_score") val faceMatchScore: Double?,
    @SerializedName("nfc_verified") val nfcVerified: Boolean?
)

// ── Event List Response ──
// Backend returns: { data: [...], total, page, limit }

data class EventListResponse(
    @SerializedName("data") val data: List<CheckinEvent>,
    @SerializedName("total") val total: Int,
    @SerializedName("page") val page: Int,
    @SerializedName("limit") val limit: Int
)
