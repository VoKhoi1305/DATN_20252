package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.EventListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface EventApi {

    @GET("events")
    suspend fun getEvents(
        @Query("subject_id") subjectId: String,
        @Query("type") type: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 31
    ): Response<ApiResponse<EventListResponse>>
}
