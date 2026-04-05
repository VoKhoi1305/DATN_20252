package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.CreateRequestPayload
import com.example.smtts.data.model.RequestListResponse
import com.example.smtts.data.model.SubjectRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RequestApi {

    @GET("requests")
    suspend fun getRequests(
        @Query("subject_id") subjectId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<RequestListResponse>>

    @POST("requests")
    suspend fun createRequest(
        @Body body: CreateRequestPayload
    ): Response<ApiResponse<SubjectRequest>>

    @GET("requests/{id}")
    suspend fun getRequestDetail(
        @Path("id") id: String
    ): Response<ApiResponse<SubjectRequest>>
}
