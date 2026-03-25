package com.example.smtts.nfc

import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Build
import android.util.Base64
import android.util.Log
import net.sf.scuba.smartcards.CardService
import net.sf.scuba.smartcards.CardServiceException
import org.jmrtd.BACKey
import org.jmrtd.BACKeySpec
import org.jmrtd.PassportService
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.icao.MRZInfo
import java.io.InputStream
import java.security.MessageDigest

/**
 * Vietnamese CCCD NFC Chip Reader using JMRTD.
 *
 * ═══════════════════════════════════════════════════════════
 * NFC Technology for Vietnamese CCCD (Căn cước công dân)
 * ═══════════════════════════════════════════════════════════
 *
 * The Vietnamese CCCD contains an NFC chip following ICAO 9303 standard
 * (same as e-Passports). The chip stores:
 *
 *   DG1  — MRZ data (Machine Readable Zone):
 *          Full name, CCCD number, Date of Birth, Gender, Expiry date
 *
 *   DG2  — Biometric face photo (JPEG2000 format):
 *          High-resolution face photo stored during card issuance.
 *          Used for cross-matching with live face capture.
 *
 *   DG3  — Fingerprint templates (restricted access, not used here)
 *
 *   SOD  — Document Security Object:
 *          Contains digital signature from Vietnam's CSCA
 *          (Country Signing Certificate Authority).
 *          Used for Passive Authentication.
 *
 * ═══════════════════════════════════════════════════════════
 * Authentication Flow:
 * ═══════════════════════════════════════════════════════════
 *
 * 1. BAC (Basic Access Control):
 *    - Derives session key from MRZ data:
 *      CCCD number (9 digits) + DOB (YYMMDD) + Expiry (YYMMDD)
 *    - Establishes encrypted communication channel with chip
 *    - Prevents unauthorized reading (need physical card info)
 *
 * 2. Read Data Groups:
 *    - DG1: Parse MRZ → extract personal info
 *    - DG2: Read face photo for cross-verification
 *    - SOD: Read digital signature for Passive Authentication
 *
 * 3. Passive Authentication:
 *    - Verify SOD digital signature against CSCA certificate
 *    - Compute hashes of DG1 + DG2 data
 *    - Compare with hashes stored in SOD
 *    - If match → chip data is genuine and untampered
 *
 * Library: JMRTD (Java Machine Readable Travel Documents)
 *   - Open-source ICAO 9303 implementation
 *   - Handles BAC, PACE, Secure Messaging
 *   - Reads all Data Groups from e-Passport/eID chips
 *   - scuba-sc-android: Smart card communication layer for Android NFC
 *
 * ═══════════════════════════════════════════════════════════
 */
class CccdNfcReader {

    companion object {
        private const val TAG = "CccdNfcReader"
    }

    /**
     * Data read from the CCCD NFC chip.
     */
    data class CccdChipData(
        val fullName: String,
        val cccdNumber: String,
        val dateOfBirth: String,
        val gender: String,
        val expiryDate: String,
        val nationality: String,
        /** SHA-256 hash of DG1+DG2 raw bytes */
        val chipDataHash: String,
        /** NFC chip UID/serial */
        val chipSerial: String,
        /** SOD (Document Security Object) for Passive Authentication, Base64-encoded */
        val passiveAuthData: String?,
        /** Face photo from DG2 as JPEG bytes */
        val facePhoto: ByteArray?
    )

    /**
     * Read CCCD chip data via NFC.
     *
     * @param tag Android NFC Tag from onNewIntent()
     * @param cccdNumber 12-digit CCCD number (for BAC key derivation)
     * @param dateOfBirth DOB in YYMMDD format
     * @param expiryDate Expiry in YYMMDD format
     * @return Parsed chip data or throws exception
     */
    fun readChip(
        tag: Tag,
        cccdNumber: String,
        dateOfBirth: String,
        expiryDate: String
    ): CccdChipData {
        val isoDep = IsoDep.get(tag)
            ?: throw NfcReadException("Thiết bị không hỗ trợ đọc NFC cho thẻ này")

        isoDep.timeout = 10000 // 10 seconds

        val chipSerial = tag.id?.let { bytesToHex(it) } ?: "unknown"
        Log.d(TAG, "NFC chip serial: $chipSerial")

        try {
            isoDep.connect()

            val cardService = CardService.getInstance(isoDep)
            cardService.open()

            val passportService = PassportService(
                cardService,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
                PassportService.DEFAULT_MAX_BLOCKSIZE,
                false, // checkMAC
                false  // doChipAuth
            )
            passportService.open()

            // Step 1: BAC Authentication
            // Derive session key from MRZ data (CCCD number, DOB, expiry)
            // Vietnamese CCCD: first 9 chars of the CCCD number serve as document number
            val docNumber = cccdNumber.take(9)
            val bacKey: BACKeySpec = BACKey(docNumber, dateOfBirth, expiryDate)
            passportService.doBAC(bacKey)
            Log.d(TAG, "BAC authentication successful")

            // Step 2: Read DG1 (MRZ / personal data)
            val dg1InputStream: InputStream =
                passportService.getInputStream(PassportService.EF_DG1)
            val dg1File = DG1File(dg1InputStream)
            val mrzInfo: MRZInfo = dg1File.mrzInfo

            val fullName = buildString {
                val secondary = mrzInfo.secondaryIdentifier.replace("<", " ").trim()
                val primary = mrzInfo.primaryIdentifier.replace("<", " ").trim()
                if (secondary.isNotEmpty()) append(secondary)
                if (primary.isNotEmpty()) {
                    if (isNotEmpty()) append(" ")
                    append(primary)
                }
            }

            Log.d(TAG, "DG1 read: name=$fullName, docNo=${mrzInfo.documentNumber}")

            // Step 3: Read DG2 (face photo) — non-fatal if fails
            var facePhoto: ByteArray? = null
            try {
                val dg2InputStream: InputStream =
                    passportService.getInputStream(PassportService.EF_DG2)
                val dg2File = DG2File(dg2InputStream)
                val faceInfos = dg2File.faceInfos
                if (faceInfos.isNotEmpty()) {
                    val faceImageInfos = faceInfos[0].faceImageInfos
                    if (faceImageInfos.isNotEmpty()) {
                        facePhoto = faceImageInfos[0].imageInputStream.readBytes()
                        Log.d(TAG, "DG2 face photo read: ${facePhoto.size} bytes")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not read DG2 (face photo): ${e.message}")
            }

            // Step 4: Read SOD (Document Security Object) for Passive Authentication
            var passiveAuthDataStr: String? = null
            try {
                val sodInputStream: InputStream =
                    passportService.getInputStream(PassportService.EF_SOD)
                val sodFile = SODFile(sodInputStream)
                val sodBytes = sodFile.encoded
                passiveAuthDataStr = Base64.encodeToString(sodBytes, Base64.NO_WRAP)
                Log.d(TAG, "SOD read: ${sodBytes.size} bytes")
            } catch (e: Exception) {
                Log.w(TAG, "Could not read SOD: ${e.message}")
            }

            // Step 5: Compute chip data hash (DG1 content + face photo for integrity)
            val dg1Bytes = dg1File.encoded
            val chipDataDigest = MessageDigest.getInstance("SHA-256")
            chipDataDigest.update(dg1Bytes)
            if (facePhoto != null) {
                chipDataDigest.update(facePhoto)
            }
            val chipDataHash = bytesToHex(chipDataDigest.digest())

            try { passportService.close() } catch (_: Exception) {}

            return CccdChipData(
                fullName = fullName.trim(),
                cccdNumber = mrzInfo.documentNumber.trim(),
                dateOfBirth = mrzInfo.dateOfBirth,
                gender = mrzInfo.gender.toString(),
                expiryDate = mrzInfo.dateOfExpiry,
                nationality = mrzInfo.nationality,
                chipDataHash = chipDataHash,
                chipSerial = chipSerial,
                passiveAuthData = passiveAuthDataStr,
                facePhoto = facePhoto
            )
        } catch (e: CardServiceException) {
            Log.e(TAG, "Card service error", e)
            throw NfcReadException(
                "Lỗi đọc chip CCCD. Giữ thẻ ổn định trên điện thoại và thử lại. " +
                        "Lỗi: ${e.message}"
            )
        } catch (e: NfcReadException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "NFC read error", e)
            throw NfcReadException("Không thể đọc chip CCCD: ${e.message}")
        } finally {
            try { isoDep.close() } catch (_: Exception) {}
        }
    }

    private fun bytesToHex(bytes: ByteArray): String {
        return bytes.joinToString("") { "%02x".format(it) }
    }

    class NfcReadException(message: String) : Exception(message)
}
