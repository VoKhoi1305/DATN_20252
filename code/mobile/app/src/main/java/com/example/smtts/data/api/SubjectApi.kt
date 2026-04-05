package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.SubjectProfile
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface SubjectApi {

    @GET("subjects/{id}")
    suspend fun getSubjectDetail(
        @Path("id") id: String
    ): Response<ApiResponse<SubjectProfile>>
}
