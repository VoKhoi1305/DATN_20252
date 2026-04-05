package com.example.smtts.data.api

import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.CheckinRequest
import com.example.smtts.data.model.CheckinResponse
import com.example.smtts.data.model.NfcFailureRequest
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface CheckinApi {

    /**
     * Submit a check-in with NFC data + face image + GPS.
     *
     * multipart/form-data:
     *   - chipDataHash, chipSerial, passiveAuthVerified, passiveAuthData,
     *     gpsLat, gpsLng, clientTimestamp: text fields
     *   - faceImage: file part (JPEG)
     */
    @Multipart
    @POST("checkin")
    suspend fun checkin(
        @Part("chipDataHash") chipDataHash: RequestBody,
        @Part("chipSerial") chipSerial: RequestBody,
        @Part("passiveAuthVerified") passiveAuthVerified: RequestBody,
        @Part("passiveAuthData") passiveAuthData: RequestBody?,
        @Part("gpsLat") gpsLat: RequestBody?,
        @Part("gpsLng") gpsLng: RequestBody?,
        @Part("clientTimestamp") clientTimestamp: RequestBody,
        @Part("deviceId") deviceId: RequestBody?,
        @Part("deviceModel") deviceModel: RequestBody?,
        @Part("osVersion") osVersion: RequestBody?,
        @Part faceImage: MultipartBody.Part
    ): Response<ApiResponse<CheckinResponse>>

    /**
     * Log a mobile-side NFC read failure before face capture.
     * Called immediately when NFC fails so the attempt is always recorded.
     */
    @POST("checkin/nfc-failure")
    suspend fun logNfcFailure(
        @Body request: NfcFailureRequest
    ): Response<ApiResponse<Any>>
}
