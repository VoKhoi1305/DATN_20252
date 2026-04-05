package com.example.smtts.util

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings

/**
 * Utility to collect device information for enrollment and check-in.
 *
 * During enrollment: device info is sent to server and stored (1 device per subject).
 * During check-in: device info is sent and compared against enrolled device.
 *
 * Uses Android ID as the unique device identifier.
 * Android ID is unique per device + per app signing key, persists across reinstalls.
 */
object DeviceInfoHelper {

    /**
     * Get unique device ID (Android Settings.Secure.ANDROID_ID).
     * 64-bit hex string, unique per device+signature combination.
     */
    @SuppressLint("HardwareIds")
    fun getDeviceId(context: Context): String {
        return Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"
    }

    /**
     * Get device model name (e.g., "Samsung Galaxy S24", "Pixel 8 Pro").
     */
    fun getDeviceModel(): String {
        val manufacturer = Build.MANUFACTURER ?: ""
        val model = Build.MODEL ?: ""
        return if (model.startsWith(manufacturer, ignoreCase = true)) {
            model
        } else {
            "$manufacturer $model"
        }.trim()
    }

    /**
     * Get Android OS version string (e.g., "Android 14 (API 34)").
     */
    fun getOsVersion(): String {
        return "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
    }

    /**
     * Collect all device info as a map.
     */
    fun collectDeviceInfo(context: Context): DeviceInfo {
        return DeviceInfo(
            deviceId = getDeviceId(context),
            deviceModel = getDeviceModel(),
            osVersion = getOsVersion()
        )
    }

    data class DeviceInfo(
        val deviceId: String,
        val deviceModel: String,
        val osVersion: String
    )
}
