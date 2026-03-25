package com.example.smtts.data.local

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import com.example.smtts.data.model.UserInfo
import com.google.gson.Gson
import org.json.JSONObject

class TokenManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "smtts_auth_prefs"
        private const val KEY_ACCESS_TOKEN = "smtts_access_token"
        private const val KEY_REFRESH_TOKEN = "smtts_refresh_token"
        private const val KEY_TEMP_TOKEN = "smtts_temp_token"
        private const val KEY_USER = "smtts_user"
        private const val KEY_NFC_CCCD = "smtts_nfc_cccd"
        private const val KEY_NFC_DOB = "smtts_nfc_dob"
        private const val KEY_NFC_EXPIRY = "smtts_nfc_expiry"
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()

    // ── Access Token ──

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun setAccessToken(token: String) {
        prefs.edit().putString(KEY_ACCESS_TOKEN, token).apply()
    }

    // ── Refresh Token ──

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun setRefreshToken(token: String) {
        prefs.edit().putString(KEY_REFRESH_TOKEN, token).apply()
    }

    fun saveTokens(accessToken: String, refreshToken: String) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .apply()
    }

    // ── Temp Token (for OTP flow) ──

    fun getTempToken(): String? = prefs.getString(KEY_TEMP_TOKEN, null)

    fun setTempToken(token: String) {
        prefs.edit().putString(KEY_TEMP_TOKEN, token).apply()
    }

    fun clearTempToken() {
        prefs.edit().remove(KEY_TEMP_TOKEN).apply()
    }

    // ── User Info ──

    fun getUser(): UserInfo? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return try {
            gson.fromJson(json, UserInfo::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun setUser(user: UserInfo) {
        prefs.edit().putString(KEY_USER, gson.toJson(user)).apply()
    }

    // ── NFC BAC Data ──

    fun getNfcCccd(): String? = prefs.getString(KEY_NFC_CCCD, null)
    fun getNfcDob(): String? = prefs.getString(KEY_NFC_DOB, null)
    fun getNfcExpiry(): String? = prefs.getString(KEY_NFC_EXPIRY, null)

    fun saveNfcBacData(cccd: String, dob: String, expiry: String) {
        prefs.edit()
            .putString(KEY_NFC_CCCD, cccd)
            .putString(KEY_NFC_DOB, dob)
            .putString(KEY_NFC_EXPIRY, expiry)
            .apply()
    }

    fun hasNfcBacData(): Boolean {
        return getNfcCccd() != null && getNfcDob() != null && getNfcExpiry() != null
    }

    // ── Auth State ──

    fun isAuthenticated(): Boolean {
        val token = getAccessToken() ?: return false
        return !isTokenExpired(token)
    }

    fun clearAll() {
        prefs.edit().clear().apply()
    }

    // ── JWT Helpers ──

    private fun isTokenExpired(token: String): Boolean {
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return true
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_WRAP))
            val json = JSONObject(payload)
            val exp = json.optLong("exp", 0)
            val now = System.currentTimeMillis() / 1000
            exp <= now
        } catch (_: Exception) {
            true
        }
    }
}
