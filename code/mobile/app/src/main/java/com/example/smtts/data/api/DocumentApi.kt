package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.DocumentListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface DocumentApi {

    @GET("subjects/{id}/documents")
    suspend fun getDocuments(
        @Path("id") subjectId: String
    ): Response<ApiResponse<DocumentListResponse>>

    /** Get documents visible to the current subject (public docs + face photo) */
    @GET("subjects/me/documents")
    suspend fun getMyDocuments(): Response<ApiResponse<DocumentListResponse>>
}
