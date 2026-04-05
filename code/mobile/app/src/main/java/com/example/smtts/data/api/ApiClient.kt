package com.example.smtts.data.api

import com.example.smtts.BuildConfig
import com.example.smtts.data.local.TokenManager
import com.example.smtts.data.model.ApiResponse
import com.example.smtts.data.model.RefreshRequest
import com.example.smtts.data.model.RefreshResponse
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private var tokenManager: TokenManager? = null
    private var _authApi: AuthApi? = null
    private var _enrollmentApi: EnrollmentApi? = null
    private var _subjectApi: SubjectApi? = null
    private var _eventApi: EventApi? = null
    private var _geofenceApi: GeofenceApi? = null
    private var _notificationApi: NotificationApi? = null
    private var _requestApi: RequestApi? = null
    private var _deviceApi: DeviceApi? = null
    private var _documentApi: DocumentApi? = null
    private var _checkinApi: CheckinApi? = null

    fun init(tokenManager: TokenManager) {
        this.tokenManager = tokenManager
        _authApi = null // force re-creation
        _enrollmentApi = null
        _subjectApi = null
        _eventApi = null
        _geofenceApi = null
        _notificationApi = null
        _requestApi = null
        _deviceApi = null
        _documentApi = null
        _checkinApi = null
    }

    val authApi: AuthApi
        get() {
            if (_authApi == null) {
                _authApi = createRetrofit().create(AuthApi::class.java)
            }
            return _authApi!!
        }

    val enrollmentApi: EnrollmentApi
        get() {
            if (_enrollmentApi == null) {
                _enrollmentApi = createRetrofit().create(EnrollmentApi::class.java)
            }
            return _enrollmentApi!!
        }

    val subjectApi: SubjectApi
        get() {
            if (_subjectApi == null) {
                _subjectApi = createRetrofit().create(SubjectApi::class.java)
            }
            return _subjectApi!!
        }

    val eventApi: EventApi
        get() {
            if (_eventApi == null) {
                _eventApi = createRetrofit().create(EventApi::class.java)
            }
            return _eventApi!!
        }

    val geofenceApi: GeofenceApi
        get() {
            if (_geofenceApi == null) {
                _geofenceApi = createRetrofit().create(GeofenceApi::class.java)
            }
            return _geofenceApi!!
        }

    val notificationApi: NotificationApi
        get() {
            if (_notificationApi == null) {
                _notificationApi = createRetrofit().create(NotificationApi::class.java)
            }
            return _notificationApi!!
        }

    val requestApi: RequestApi
        get() {
            if (_requestApi == null) {
                _requestApi = createRetrofit().create(RequestApi::class.java)
            }
            return _requestApi!!
        }

    val deviceApi: DeviceApi
        get() {
            if (_deviceApi == null) {
                _deviceApi = createRetrofit().create(DeviceApi::class.java)
            }
            return _deviceApi!!
        }

    val documentApi: DocumentApi
        get() {
            if (_documentApi == null) {
                _documentApi = createRetrofit().create(DocumentApi::class.java)
            }
            return _documentApi!!
        }

    val checkinApi: CheckinApi
        get() {
            if (_checkinApi == null) {
                _checkinApi = createRetrofit().create(CheckinApi::class.java)
            }
            return _checkinApi!!
        }

    private fun createRetrofit(): Retrofit {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val authInterceptor = Interceptor { chain ->
            val original = chain.request()
            // Don't add auth header for login/refresh endpoints
            val url = original.url.encodedPath
            if (url.contains("auth/login") || url.contains("auth/refresh")) {
                return@Interceptor chain.proceed(original)
            }

            val token = tokenManager?.getAccessToken()
            if (token != null) {
                val request = original.newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
                chain.proceed(request)
            } else {
                chain.proceed(original)
            }
        }

        val tokenAuthenticator = Authenticator { _: Route?, response: Response ->
            // Don't retry for login/refresh endpoints
            val url = response.request.url.encodedPath
            if (url.contains("auth/login") || url.contains("auth/refresh")) {
                return@Authenticator null
            }

            val refreshToken = tokenManager?.getRefreshToken() ?: return@Authenticator null

            // Try to refresh the token
            val newTokens = runBlocking {
                try {
                    val refreshApi = createBaseRetrofit().create(AuthApi::class.java)
                    val refreshResponse = refreshApi.refreshToken(RefreshRequest(refreshToken))
                    if (refreshResponse.isSuccessful) {
                        refreshResponse.body()?.data
                    } else {
                        null
                    }
                } catch (_: Exception) {
                    null
                }
            }

            if (newTokens != null) {
                tokenManager?.saveTokens(newTokens.accessToken, newTokens.refreshToken)
                response.request.newBuilder()
                    .header("Authorization", "Bearer ${newTokens.accessToken}")
                    .build()
            } else {
                // Refresh failed, clear auth
                tokenManager?.clearAll()
                null
            }
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .authenticator(tokenAuthenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    /** Bare retrofit instance without auth interceptors (for refresh calls) */
    private fun createBaseRetrofit(): Retrofit {
        val client = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
