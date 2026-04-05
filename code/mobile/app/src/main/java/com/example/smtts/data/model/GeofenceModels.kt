package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Geofence Detail (from GET /geofences/:id) ──

data class GeofenceDetail(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String?,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String?,
    @SerializedName("center_lat") val centerLat: Double?,
    @SerializedName("center_lng") val centerLng: Double?,
    @SerializedName("radius") val radius: Int?,
    @SerializedName("area_id") val areaId: String?,
    @SerializedName("is_active") val isActive: Boolean?
)

// ── Point Check Response (from POST /geofences/:id/check-point) ──

data class PointCheckResponse(
    @SerializedName("inGeofence") val inGeofence: Boolean,
    @SerializedName("distance") val distance: Int?
)

// ── Point Check Request Body ──

data class PointCheckRequest(
    @SerializedName("lat") val lat: Double,
    @SerializedName("lng") val lng: Double
)
