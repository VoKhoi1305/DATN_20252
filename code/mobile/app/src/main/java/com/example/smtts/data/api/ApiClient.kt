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

    fun init(tokenManager: TokenManager) {
        this.tokenManager = tokenManager
        _authApi = null // force re-creation
        _enrollmentApi = null
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
