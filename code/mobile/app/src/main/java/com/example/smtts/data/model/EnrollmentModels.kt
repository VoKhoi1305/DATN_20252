package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Request models ──

data class EnrollNfcRequest(
    @SerializedName("chipData") val chipData: String,
    @SerializedName("chipSerial") val chipSerial: String? = null,
    @SerializedName("passiveAuthData") val passiveAuthData: String? = null,
    @SerializedName("chipFullName") val chipFullName: String? = null,
    @SerializedName("chipCccdNumber") val chipCccdNumber: String? = null
)

// ── Response models ──

data class EnrollmentStatusResponse(
    @SerializedName("subjectId") val subjectId: String,
    @SerializedName("lifecycle") val lifecycle: String,
    @SerializedName("nfcEnrolled") val nfcEnrolled: Boolean,
    @SerializedName("faceEnrolled") val faceEnrolled: Boolean,
    @SerializedName("enrollmentComplete") val enrollmentComplete: Boolean
)

data class EnrollNfcResponse(
    @SerializedName("nfcRecordId") val nfcRecordId: String,
    @SerializedName("enrolledAt") val enrolledAt: String,
    @SerializedName("message") val message: String
)

data class EnrollFaceResponse(
    @SerializedName("faceTemplateId") val faceTemplateId: String,
    @SerializedName("enrolledAt") val enrolledAt: String,
    @SerializedName("qualityScore") val qualityScore: Double,
    @SerializedName("livenessScore") val livenessScore: Double,
    @SerializedName("message") val message: String
)

data class CompleteEnrollmentResponse(
    @SerializedName("lifecycle") val lifecycle: String,
    @SerializedName("message") val message: String
)
