package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.DeviceListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface DeviceApi {

    @GET("subjects/{id}/devices")
    suspend fun getDevices(
        @Path("id") subjectId: String
    ): Response<ApiResponse<DeviceListResponse>>
}
