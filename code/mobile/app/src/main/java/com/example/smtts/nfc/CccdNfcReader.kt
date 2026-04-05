package com.example.smtts.nfc

import android.nfc.Tag
import android.nfc.TagLostException
import android.nfc.tech.IsoDep
import android.util.Base64
import android.util.Log
import net.sf.scuba.smartcards.CardServiceException
import net.sf.scuba.smartcards.IsoDepCardService
import org.jmrtd.BACKey
import org.jmrtd.PassportService
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.DG2File
import org.jmrtd.lds.icao.MRZInfo
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.security.MessageDigest

/**
 * Vietnamese CCCD NFC Chip Reader — JMRTD / ICAO 9303 implementation.
 *
 * Reading flow:
 *   1. BAC Authentication (3DES mutual auth using MRZ data)
 *   2. Read EF_DG1 → buffer raw bytes + parse MRZ personal data
 *   3. Read EF_SOD → Document Security Object (digital signature)
 *   4. Passive Auth → compare hash(dg1Raw) vs SOD.dataGroupHashes[1]
 *
 * Key fixes from test app (E:\phu\testCCCDapp):
 *   - Uses IsoDepCardService(isoDep) directly (not CardService.getInstance)
 *   - Calls sendSelectApplet(false) before doBAC()
 *   - BAC-only auth (no PACE — unstable on Vietnamese CCCD)
 */
class CccdNfcReader {

    companion object {
        private const val TAG = "CccdNfcReader"
    }

    // ── Data model ────────────────────────────────────────────────────────────

    data class CccdChipData(
        val fullName: String,
        val cccdNumber: String,
        val dateOfBirth: String,
        val gender: String,
        val expiryDate: String,
        val nationality: String,
        /** SHA-256 of raw DG1 bytes — integrity fingerprint for the server */
        val chipDataHash: String,
        /** NFC chip UID (hex) */
        val chipSerial: String,
        /** Base64-encoded SOD — forwarded to server for full chain-of-trust PA */
        val passiveAuthData: String?,
        /** True when client-side DG1 hash matched the SOD-sealed value */
        val passiveAuthVerified: Boolean,
        /**
         * Base64-encoded face photo from CCCD chip DG2.
         * May be JPEG or JPEG2000 format — server handles decoding.
         * Null if DG2 reading failed (timeout, unsupported).
         */
        val dg2FaceImage: String? = null
    )

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Read and verify CCCD chip data from the tapped NFC tag.
     *
     * @param tag         Android NFC Tag from onNewIntent()
     * @param cccdNumber  12-digit CCCD number (first 9 chars = document number)
     * @param dateOfBirth DOB in YYMMDD format
     * @param expiryDate  Expiry date in YYMMDD format
     *
     * @throws NfcReadException   on connection / key errors — UI-safe Vietnamese message
     * @throws SecurityException  when Passive Authentication fails (fake/cloned card)
     */
    fun readChip(
        tag: Tag,
        cccdNumber: String,
        dateOfBirth: String,
        expiryDate: String
    ): CccdChipData {
        val isoDep = IsoDep.get(tag)
            ?: throw NfcReadException("Thiet bi khong ho tro doc NFC cho the nay.")

        isoDep.timeout = 12_000 // 12 s — allow for slow chips
        val chipSerial = tag.id?.let { bytesToHex(it) } ?: "unknown"

        Log.d(TAG, "NFC chip detected — serial: $chipSerial")
        Log.d(TAG, "BAC KEY: cccd='$cccdNumber', docNum9='${cccdNumber.take(9)}', dob='$dateOfBirth', exp='$expiryDate'")

        var ps: PassportService? = null
        try {
            isoDep.connect()

            // ── Step 1: Create PassportService using IsoDepCardService ────────
            // CRITICAL FIX: Use IsoDepCardService(isoDep) directly.
            // CardService.getInstance(isoDep) uses ServiceLoader which fails on Android.
            val cardService = IsoDepCardService(isoDep)
            ps = PassportService(
                cardService,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH, // 256
                PassportService.DEFAULT_MAX_BLOCKSIZE,       // 224
                false,   // CCCD has no master file
                false
            )
            ps.open()

            // ── Step 2: SELECT MRTD Application ──────────────────────────────
            // CRITICAL FIX: Must call sendSelectApplet BEFORE doBAC.
            // Without this, chip returns SW=6D00 (INS not supported).
            ps.sendSelectApplet(false)

            // ── Step 3: BAC Authentication ────────────────────────────────────
         //   val docNumber = cccdNumber.take(9).padEnd(9, '<')
            val docNumber = cccdNumber.takeLast(9).padEnd(9, '<')
            val bacKey = BACKey(docNumber, dateOfBirth, expiryDate)

            Log.d(TAG, "Attempting BAC with docNumber='$docNumber'...")
            try {
                ps.doBAC(bacKey)
                Log.d(TAG, "BAC OK")
            } catch (bacEx: Exception) {
                val sw = if (bacEx is CardServiceException)
                    Integer.toHexString(bacEx.sw).uppercase() else "?"
                Log.e(TAG, "BAC failed (SW=$sw)", bacEx)
                throw NfcReadException(
                    "Thong tin khong khop. Vui long kiem tra lai so CCCD, ngay sinh " +
                    "va ngay het han the roi thu lai."
                )
            }

            // ── Step 4: Read EF_DG1 (MRZ / personal data) ────────────────────
            Log.d(TAG, "Reading EF_DG1...")
            val dg1RawBytes: ByteArray =
                ps.getInputStream(PassportService.EF_DG1).readBytes()
            val dg1File = DG1File(ByteArrayInputStream(dg1RawBytes))
            val mrzInfo: MRZInfo = dg1File.mrzInfo

            Log.d(TAG, "DG1 parsed: docNum='${mrzInfo.documentNumber}', name='${mrzInfo.primaryIdentifier} ${mrzInfo.secondaryIdentifier}'")

            // ── Step 5: Read EF_SOD (Document Security Object) ────────────────
            Log.d(TAG, "Reading EF_SOD...")
            val sodFile: SODFile? = readSod(ps)

            // ── Step 6: Read EF_DG2 (face photo from chip) ───────────────────
            val dg2FaceBase64 = readDg2FaceImage(ps)

            // ── Step 7: Passive Authentication — DG1 hash verification ────────
            val paVerified = verifyDg1Hash(dg1RawBytes, sodFile)

            // ── Assemble result ───────────────────────────────────────────────
            val sodBase64 = sodFile?.encoded?.let { Base64.encodeToString(it, Base64.NO_WRAP) }
            val chipDataHash = bytesToHex(
                MessageDigest.getInstance("SHA-256").digest(dg1RawBytes)
            )

            try { ps.close() } catch (_: Exception) {}

            return CccdChipData(
                fullName          = buildFullName(mrzInfo),
                cccdNumber        = cccdNumber,
                dateOfBirth       = mrzInfo.dateOfBirth,
                gender            = mrzInfo.gender.toString(),
                expiryDate        = mrzInfo.dateOfExpiry,
                nationality       = mrzInfo.nationality,
                chipDataHash      = chipDataHash,
                chipSerial        = chipSerial,
                passiveAuthData   = sodBase64,
                passiveAuthVerified = paVerified,
                dg2FaceImage      = dg2FaceBase64
            )

        } catch (e: TagLostException) {
            Log.w(TAG, "Tag lost mid-read", e)
            throw NfcReadException(
                "Mat ket noi the! Vui long giu the on dinh tren dien thoai va thu lai."
            )
        } catch (e: IOException) {
            Log.w(TAG, "IO error reading chip", e)
            throw NfcReadException(
                "Loi ket noi NFC. Hay giu the on dinh va khong di chuyen trong luc doc."
            )
        } catch (e: CardServiceException) {
            Log.e(TAG, "Card service error", e)
            throw NfcReadException(
                "Thong tin khong khop. Vui long kiem tra lai so CCCD, ngay sinh " +
                "va ngay het han the roi thu lai."
            )
        } catch (e: SecurityException) {
            if (e.message?.contains("out of date") == true) {
                Log.w(TAG, "Tag out of date — NFC session expired", e)
                throw NfcReadException(
                    "Ket noi the bi het han. Vui long nhac the ra va dat lai tren dien thoai."
                )
            }
            throw e
        } catch (e: NfcReadException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected NFC error", e)
            throw NfcReadException("Khong the doc chip CCCD: ${e.message}")
        } finally {
            try { ps?.close() } catch (_: Exception) {}
            try { isoDep.close() } catch (_: Exception) {}
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Read DG2 (face photo) from CCCD chip.
     * DG2 contains the portrait photo stored during CCCD issuance.
     * This photo serves as the ground-truth reference for face verification.
     *
     * Returns Base64-encoded image bytes, or null if reading fails.
     * The image format may be JPEG or JPEG2000 — server-side OpenCV handles both.
     */
    private fun readDg2FaceImage(service: PassportService): String? = try {
        Log.d(TAG, "Reading EF_DG2 (face photo)...")
        val dg2RawBytes = service.getInputStream(PassportService.EF_DG2).readBytes()
        val dg2File = DG2File(ByteArrayInputStream(dg2RawBytes))

        val faceInfos = dg2File.faceInfos
        if (faceInfos.isNullOrEmpty()) {
            Log.w(TAG, "DG2: No face info entries found")
            null
        } else {
            val faceImageInfos = faceInfos[0].faceImageInfos
            if (faceImageInfos.isNullOrEmpty()) {
                Log.w(TAG, "DG2: No face image entries found")
                null
            } else {
                val imageInfo = faceImageInfos[0]
                val baos = ByteArrayOutputStream()
                imageInfo.imageInputStream.use { input ->
                    val buf = ByteArray(4096)
                    var n: Int
                    while (input.read(buf).also { n = it } != -1) {
                        baos.write(buf, 0, n)
                    }
                }
                val imageBytes = baos.toByteArray()
                Log.d(TAG, "DG2 face image read OK: ${imageBytes.size} bytes, mimeType=${imageInfo.mimeType}")
                Base64.encodeToString(imageBytes, Base64.NO_WRAP)
            }
        }
    } catch (e: Exception) {
        // DG2 reading is optional — don't block enrollment if it fails
        Log.w(TAG, "DG2 read failed (will use selfie instead): ${e.message}")
        null
    }

    private fun readSod(service: PassportService): SODFile? = try {
        val sodStream = service.getInputStream(PassportService.EF_SOD)
        SODFile(sodStream).also { sod ->
            Log.d(TAG, "SOD OK — digestAlgorithm: ${sod.digestAlgorithm}")
        }
    } catch (e: Exception) {
        Log.w(TAG, "SOD read failed — PA will be skipped: ${e.message}")
        null
    }

    private fun verifyDg1Hash(dg1RawBytes: ByteArray, sodFile: SODFile?): Boolean {
        if (sodFile == null) {
            Log.w(TAG, "PA skipped: SOD unavailable")
            return false
        }

        val storedHash: ByteArray = sodFile.dataGroupHashes[1]
            ?: run {
                Log.w(TAG, "PA skipped: DG1 hash entry not present in SOD")
                return false
            }

        val algorithm: String = sodFile.digestAlgorithm
        Log.d(TAG, "PA: computing DG1 hash with $algorithm (${dg1RawBytes.size} bytes)")

        val computedHash: ByteArray = MessageDigest.getInstance(algorithm).digest(dg1RawBytes)

        if (!computedHash.contentEquals(storedHash)) {
            Log.e(
                TAG,
                "PA FAILED — computed: ${bytesToHex(computedHash)} | stored: ${bytesToHex(storedHash)}"
            )
            throw SecurityException("The gia mao: Du lieu DG1 da bi chinh sua!")
        }

        Log.d(TAG, "PA PASSED — DG1 hash verified OK")
        return true
    }

    private fun buildFullName(mrzInfo: MRZInfo): String {
        val primary   = mrzInfo.primaryIdentifier.replace("<", " ").trim()
        val secondary = mrzInfo.secondaryIdentifier.replace("<", " ").trim()
        return buildString {
            if (primary.isNotEmpty()) append(primary)
            if (secondary.isNotEmpty()) {
                if (isNotEmpty()) append(" ")
                append(secondary)
            }
        }.trim()
    }

    private fun bytesToHex(bytes: ByteArray): String =
        bytes.joinToString("") { "%02x".format(it) }

    // ── Exception ─────────────────────────────────────────────────────────────

    class NfcReadException(message: String) : Exception(message)
}
