package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.GeofenceDetail
import com.example.smtts.data.model.PointCheckRequest
import com.example.smtts.data.model.PointCheckResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface GeofenceApi {

    @GET("geofences/{id}")
    suspend fun getGeofence(
        @Path("id") id: String
    ): Response<ApiResponse<GeofenceDetail>>

    @POST("geofences/{id}/check-point")
    suspend fun checkPointInGeofence(
        @Path("id") id: String,
        @Body body: PointCheckRequest
    ): Response<ApiResponse<PointCheckResponse>>
}
