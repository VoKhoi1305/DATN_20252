package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── NFC Failure Log Request (POST /checkin/nfc-failure) ──

data class NfcFailureRequest(
    @SerializedName("reason") val reason: String,
    @SerializedName("chipSerial") val chipSerial: String? = null,
    @SerializedName("deviceId") val deviceId: String? = null,
    @SerializedName("gpsLat") val gpsLat: Double? = null,
    @SerializedName("gpsLng") val gpsLng: Double? = null,
    @SerializedName("clientTimestamp") val clientTimestamp: String
)

// ── Check-in Request (POST /checkin) ──

data class CheckinRequest(
    @SerializedName("chipDataHash") val chipDataHash: String,
    @SerializedName("chipSerial") val chipSerial: String,
    @SerializedName("passiveAuthVerified") val passiveAuthVerified: Boolean,
    @SerializedName("passiveAuthData") val passiveAuthData: String?,
    @SerializedName("gpsLat") val gpsLat: Double?,
    @SerializedName("gpsLng") val gpsLng: Double?,
    @SerializedName("clientTimestamp") val clientTimestamp: String
)

// ── Check-in Response ──

data class CheckinResponse(
    @SerializedName("event") val event: CheckinEventResult?,
    @SerializedName("message") val message: String
)

data class CheckinEventResult(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String? = null,
    @SerializedName("type") val type: String,
    @SerializedName("result") val result: String,
    @SerializedName("nfc_verified") val nfcVerified: Boolean?,
    @SerializedName("nfc_cccd_match") val nfcCccdMatch: Boolean?,
    @SerializedName("face_match_score") val faceMatchScore: Double?,
    @SerializedName("liveness_score") val livenessScore: Double?,
    @SerializedName("liveness_pass") val livenessPass: Boolean?,
    @SerializedName("device_matched") val deviceMatched: Boolean?,
    @SerializedName("in_geofence") val inGeofence: Boolean?,
    @SerializedName("created_at") val createdAt: String?
)
