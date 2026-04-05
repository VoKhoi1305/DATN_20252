package com.example.smtts.data.model

import com.google.gson.annotations.SerializedName

// ── Subject Profile (from GET /subjects/:id) ──

data class SubjectProfile(
    @SerializedName("id") val id: String,
    @SerializedName("ma_ho_so") val code: String,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("cccd") val cccd: String,
    @SerializedName("date_of_birth") val dateOfBirth: String?,
    @SerializedName("gender") val gender: String?,
    @SerializedName("ethnicity") val ethnicity: String?,
    @SerializedName("address") val address: String?,
    @SerializedName("permanent_address") val permanentAddress: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("photo_url") val photoUrl: String?,
    @SerializedName("status") val status: String,
    @SerializedName("lifecycle") val lifecycle: String?,
    @SerializedName("compliance_rate") val complianceRate: Double?,
    @SerializedName("enrollment_date") val enrollmentDate: String?,
    @SerializedName("notes") val notes: String?,
    @SerializedName("area") val area: SubjectArea?,
    @SerializedName("officer") val officer: SubjectOfficer?,
    @SerializedName("scenario") val scenario: SubjectScenario?,
    @SerializedName("family") val family: SubjectFamily?,
    @SerializedName("legal") val legal: SubjectLegal?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
)

data class SubjectArea(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("level") val level: Int?
)

data class SubjectOfficer(
    @SerializedName("id") val id: String,
    @SerializedName("full_name") val fullName: String
)

data class SubjectScenario(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("checkin_frequency") val checkinFrequency: String?,
    @SerializedName("assigned_at") val assignedAt: String?
)

data class SubjectFamily(
    @SerializedName("father_name") val fatherName: String?,
    @SerializedName("mother_name") val motherName: String?,
    @SerializedName("spouse_name") val spouseName: String?,
    @SerializedName("dependents") val dependents: Int?,
    @SerializedName("notes") val notes: String?
)

data class SubjectLegal(
    @SerializedName("decision_number") val decisionNumber: String?,
    @SerializedName("decision_date") val decisionDate: String?,
    @SerializedName("management_type") val managementType: String?,
    @SerializedName("start_date") val startDate: String?,
    @SerializedName("end_date") val endDate: String?,
    @SerializedName("issuing_authority") val issuingAuthority: String?,
    @SerializedName("notes") val notes: String?
)
