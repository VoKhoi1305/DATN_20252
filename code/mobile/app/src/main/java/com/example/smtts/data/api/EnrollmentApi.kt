package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.CompleteEnrollmentResponse
import com.example.smtts.data.model.EnrollDeviceRequest
import com.example.smtts.data.model.EnrollDeviceResponse
import com.example.smtts.data.model.EnrollFaceResponse
import com.example.smtts.data.model.EnrollNfcRequest
import com.example.smtts.data.model.EnrollNfcResponse
import com.example.smtts.data.model.EnrollmentStatusResponse
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface EnrollmentApi {

    @GET("enrollment/status")
    suspend fun getStatus(): Response<ApiResponse<EnrollmentStatusResponse>>

    @POST("enrollment/nfc")
    suspend fun enrollNfc(@Body request: EnrollNfcRequest): Response<ApiResponse<EnrollNfcResponse>>

    @Multipart
    @POST("enrollment/face")
    suspend fun enrollFace(@Part file: MultipartBody.Part): Response<ApiResponse<EnrollFaceResponse>>

    @POST("enrollment/device")
    suspend fun enrollDevice(@Body request: EnrollDeviceRequest): Response<ApiResponse<EnrollDeviceResponse>>

    @POST("enrollment/complete")
    suspend fun completeEnrollment(): Response<ApiResponse<CompleteEnrollmentResponse>>
}
