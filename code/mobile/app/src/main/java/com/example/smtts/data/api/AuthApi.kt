package com.example.smtts.data.api

import com.example.smtts.data.model.ActivateRequest
import com.example.smtts.data.model.ActivateResponse
import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.ChangePasswordRequest
import com.example.smtts.data.model.ChangePasswordResponse
import com.example.smtts.data.model.LoginRequest
import com.example.smtts.data.model.LoginResponse
import com.example.smtts.data.model.RefreshRequest
import com.example.smtts.data.model.RefreshResponse
import com.example.smtts.data.model.VerifyOtpRequest
import com.example.smtts.data.model.VerifyOtpResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApi {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginResponse>>

    @POST("auth/activate")
    suspend fun activate(@Body request: ActivateRequest): Response<ApiResponse<ActivateResponse>>

    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest,
        @Header("Authorization") tempToken: String
    ): Response<ApiResponse<VerifyOtpResponse>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshRequest): Response<ApiResponse<RefreshResponse>>

    @POST("auth/logout")
    suspend fun logout(@Body request: RefreshRequest): Response<ApiResponse<Unit>>

    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<ApiResponse<ChangePasswordResponse>>
}
