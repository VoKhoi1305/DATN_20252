package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.NotificationListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query

interface NotificationApi {

    @GET("notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<NotificationListResponse>>

    @PATCH("notifications/{id}/read")
    suspend fun markRead(
        @Path("id") id: String
    ): Response<ApiResponse<Unit>>

    @PATCH("notifications/read-all")
    suspend fun markAllRead(): Response<ApiResponse<Unit>>
}
