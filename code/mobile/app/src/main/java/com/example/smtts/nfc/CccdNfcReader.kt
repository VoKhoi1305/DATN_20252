package com.example.smtts.nfc

import android.nfc.Tag
import android.nfc.TagLostException
import android.nfc.tech.IsoDep
import android.util.Base64
import android.util.Log
import net.sf.scuba.smartcards.CardService
import net.sf.scuba.smartcards.CardServiceException
import org.jmrtd.BACKey
import org.jmrtd.PACEKeySpec
import org.jmrtd.PassportService
import org.jmrtd.lds.CardAccessFile
import org.jmrtd.lds.PACEInfo
import org.jmrtd.lds.SODFile
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.icao.MRZInfo
import java.io.ByteArrayInputStream
import java.io.IOException
import java.security.MessageDigest

/**
 * Vietnamese CCCD NFC Chip Reader — JMRTD / ICAO 9303 implementation.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * Reading flow (optimised — EF_DG2/EF_DG13 intentionally SKIPPED):
 *
 *   1. Mutual Auth  → PACE (ICAO 9303 preferred) with BAC fallback
 *   2. Read EF_DG1  → buffer raw bytes + parse MRZ personal data
 *   3. Read EF_SOD  → Document Security Object (digital signature)
 *   4. Passive Auth → compare SHA-256(dg1Raw) vs SOD.dataGroupHashes[1]
 *
 * FaceID (EF_DG2) is handled by a separate dedicated module — do NOT read it here.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Prerequisites:
 *   - BouncyCastleProvider must be registered at Security position 1
 *     BEFORE this class is used.  See EnrollmentActivity.onCreate().
 */
class CccdNfcReader {

    companion object {
        private const val TAG = "CccdNfcReader"
    }

    // ── Data model ────────────────────────────────────────────────────────────

    /**
     * Identity and integrity data extracted from the CCCD NFC chip.
     *
     * NOTE: facePhoto is intentionally absent — face recognition is a
     * separate enrollment step and does not require chip data.
     */
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
        val passiveAuthVerified: Boolean
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
            ?: throw NfcReadException("Thiết bị không hỗ trợ đọc NFC cho thẻ này.")

        isoDep.timeout = 12_000 // 12 s — allow for slow chips
        val chipSerial = tag.id?.let { bytesToHex(it) } ?: "unknown"
        val docNumber = cccdNumber

        Log.d(TAG, "NFC chip detected — serial: $chipSerial")
        Log.d(TAG, "┌─── BAC/PACE KEY INPUT ─────────")
        Log.d(TAG, "│ cccdNumber:  '$cccdNumber' (len=${cccdNumber.length})")
        Log.d(TAG, "│ docNumber:   '$docNumber' (first 9)")
        Log.d(TAG, "│ dateOfBirth: '$dateOfBirth' (len=${dateOfBirth.length})")
        Log.d(TAG, "│ expiryDate:  '$expiryDate' (len=${expiryDate.length})")
        Log.d(TAG, "└─────────────────────────────────")

        try {
            isoDep.connect()

            // ── Step 1: Mutual Authentication ─────────────────────────────────
            // Try PACE first. If PACE fails (corrupts NFC session), reconnect
            // IsoDep and create a fresh PassportService for BAC fallback.
            val passportService = authenticateChip(
                isoDep, docNumber, dateOfBirth, expiryDate
            )

            // ── Step 2: Read EF_DG1 (MRZ / personal data) ────────────────────
            Log.d(TAG, "Reading EF_DG1...")
            val dg1RawBytes: ByteArray =
                passportService.getInputStream(PassportService.EF_DG1).readBytes()
            val dg1File = DG1File(ByteArrayInputStream(dg1RawBytes))
            val mrzInfo: MRZInfo = dg1File.mrzInfo

            Log.d(TAG, "┌─── DG1 MRZ PARSED DATA ────────")
            Log.d(TAG, "│ documentNumber: '${mrzInfo.documentNumber}'")
            Log.d(TAG, "│ primaryId:      '${mrzInfo.primaryIdentifier}'")
            Log.d(TAG, "│ secondaryId:    '${mrzInfo.secondaryIdentifier}'")
            Log.d(TAG, "│ dateOfBirth:    '${mrzInfo.dateOfBirth}' (YYMMDD)")
            Log.d(TAG, "│ dateOfExpiry:   '${mrzInfo.dateOfExpiry}' (YYMMDD)")
            Log.d(TAG, "│ gender:         '${mrzInfo.gender}'")
            Log.d(TAG, "│ nationality:    '${mrzInfo.nationality}'")
            Log.d(TAG, "│ issuingState:   '${mrzInfo.issuingState}'")
            Log.d(TAG, "└─────────────────────────────────")

            // ── Step 3: Read EF_SOD (Document Security Object) ────────────────
            Log.d(TAG, "Reading EF_SOD...")
            val sodFile: SODFile? = readSod(passportService)

            // ── Step 4: Passive Authentication — DG1 hash verification ────────
            val paVerified = verifyDg1Hash(dg1RawBytes, sodFile)

            // ── Assemble result ───────────────────────────────────────────────
            val sodBase64 = sodFile?.encoded?.let { Base64.encodeToString(it, Base64.NO_WRAP) }
            val chipDataHash = bytesToHex(
                MessageDigest.getInstance("SHA-256").digest(dg1RawBytes)
            )

            try { passportService.close() } catch (_: Exception) {}

            return CccdChipData(
                fullName          = buildFullName(mrzInfo),
                cccdNumber        = mrzInfo.documentNumber.trimEnd('<').trim(),
                dateOfBirth       = mrzInfo.dateOfBirth,
                gender            = mrzInfo.gender.toString(),
                expiryDate        = mrzInfo.dateOfExpiry,
                nationality       = mrzInfo.nationality,
                chipDataHash      = chipDataHash,
                chipSerial        = chipSerial,
                passiveAuthData   = sodBase64,
                passiveAuthVerified = paVerified
            )

        } catch (e: TagLostException) {
            Log.w(TAG, "Tag lost mid-read", e)
            throw NfcReadException(
                "Mất kết nối thẻ! Vui lòng giữ thẻ ổn định trên điện thoại và thử lại."
            )
        } catch (e: IOException) {
            Log.w(TAG, "IO error reading chip", e)
            throw NfcReadException(
                "Lỗi kết nối NFC. Hãy giữ thẻ ổn định và không di chuyển trong lúc đọc."
            )
        } catch (e: CardServiceException) {
            Log.e(TAG, "Card service error — likely BAC key mismatch", e)
            throw NfcReadException(
                "Thông tin không khớp. Vui lòng kiểm tra lại số CCCD, ngày sinh " +
                "và ngày hết hạn thẻ rồi thử lại."
            )
        } catch (e: SecurityException) {
            // PA failure (fake card) is re-thrown intact.
            // "Tag is out of date" SecurityException is wrapped as NfcReadException.
            if (e.message?.contains("out of date") == true) {
                Log.w(TAG, "Tag out of date — NFC session expired", e)
                throw NfcReadException(
                    "Kết nối thẻ bị hết hạn. Vui lòng nhấc thẻ ra và đặt lại trên điện thoại."
                )
            }
            throw e
        } catch (e: NfcReadException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected NFC error", e)
            throw NfcReadException("Không thể đọc chip CCCD: ${e.message}")
        } finally {
            try { isoDep.close() } catch (_: Exception) {}
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Create and open a fresh PassportService from an already-connected IsoDep.
     */
    private fun openPassportService(isoDep: IsoDep): PassportService {
        val cardService = CardService.getInstance(isoDep)
        cardService.open()
        val ps = PassportService(
            cardService,
            PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
            PassportService.DEFAULT_MAX_BLOCKSIZE,
            false,
            false
        )
        ps.open()
        return ps
    }

    /**
     * Authenticate the chip: PACE → reconnect → BAC fallback.
     *
     * When PACE fails, the NFC session is often corrupted ("Tag is out of date").
     * This method handles that by closing/reconnecting IsoDep and creating a
     * fresh PassportService before attempting BAC.
     *
     * @return The authenticated PassportService ready for reading DG1/SOD.
     */
    private fun authenticateChip(
        isoDep: IsoDep,
        docNumber: String,
        dateOfBirth: String,
        expiryDate: String
    ): PassportService {
        val bacKey = BACKey(docNumber, dateOfBirth, expiryDate)

        // ── Attempt 1: PACE on fresh connection ──
        var service = openPassportService(isoDep)
        try {
            val cardAccessStream = service.getInputStream(PassportService.EF_CARD_ACCESS)
            val cardAccessFile = CardAccessFile(cardAccessStream)
            val paceInfo = cardAccessFile.securityInfos
                .filterIsInstance<PACEInfo>()
                .firstOrNull()

            if (paceInfo != null) {
                Log.d(TAG, "PACE info found — OID: ${paceInfo.objectIdentifier}, attempting PACE...")
                val paceKey = PACEKeySpec.createMRZKey(bacKey)
                val paramSpec = PACEInfo.toParameterSpec(paceInfo.parameterId)
                service.doPACE(paceKey, paceInfo.objectIdentifier, paramSpec)
                Log.d(TAG, "✓ PACE OK")
                return service
            } else {
                Log.d(TAG, "No PACEInfo in CardAccess, skipping PACE")
            }
        } catch (e: Exception) {
            Log.w(TAG, "PACE failed (${e.javaClass.simpleName}: ${e.message})")
            Log.d(TAG, "Reconnecting IsoDep for BAC fallback...")

            // PACE failure corrupts the NFC session on many devices.
            // Close everything and reconnect before trying BAC.
            try { service.close() } catch (_: Exception) {}
            try { isoDep.close() } catch (_: Exception) {}

            isoDep.connect()
            service = openPassportService(isoDep)
            Log.d(TAG, "IsoDep reconnected OK")
        }

        // ── Attempt 2: BAC (on fresh or reconnected session) ──
        Log.d(TAG, "Attempting BAC...")
        service.doBAC(bacKey)
        Log.d(TAG, "✓ BAC OK")
        return service
    }

    /**
     * Read EF_SOD (Document Security Object).
     * Returns null if the file cannot be read — Passive Authentication will be
     * skipped gracefully rather than blocking the entire read.
     */
    private fun readSod(service: PassportService): SODFile? = try {
        val sodStream = service.getInputStream(PassportService.EF_SOD)
        SODFile(sodStream).also { sod ->
            Log.d(TAG, "SOD OK — digestAlgorithm: ${sod.digestAlgorithm}")
        }
    } catch (e: Exception) {
        Log.w(TAG, "SOD read failed — PA will be skipped: ${e.message}")
        null
    }

    /**
     * Passive Authentication — verify the DG1 hash against the SOD-sealed value.
     *
     * Security model:
     *   The SOD is signed by Vietnam's CSCA (Country Signing CA) private key.
     *   It contains the hash of each Data Group as computed at card issuance time.
     *   By recomputing the hash of the raw DG1 bytes we just read from the chip
     *   and comparing it to sodFile.dataGroupHashes[1], we detect any post-issuance
     *   modification of the personal data without needing the CSCA certificate
     *   (full chain verification requires the CSCA cert and is done server-side).
     *
     * @return true  → hash matched; client-side PA passed.
     *         false → SOD unavailable; PA skipped (not an error).
     * @throws SecurityException if computed hash ≠ stored hash (fake/cloned card).
     */
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

        // The SOD declares which algorithm was used to hash each DG at issuance.
        val algorithm: String = sodFile.digestAlgorithm
        Log.d(TAG, "PA: computing DG1 hash with $algorithm (${dg1RawBytes.size} bytes)")

        val computedHash: ByteArray = MessageDigest.getInstance(algorithm).digest(dg1RawBytes)

        if (!computedHash.contentEquals(storedHash)) {
            Log.e(
                TAG,
                "PA FAILED — computed: ${bytesToHex(computedHash)} | stored: ${bytesToHex(storedHash)}"
            )
            throw SecurityException("Thẻ giả mạo: Dữ liệu DG1 đã bị chỉnh sửa!")
        }

        Log.d(TAG, "PA PASSED — DG1 hash verified OK")
        return true
    }

    /**
     * Build a clean display name from MRZ primary/secondary identifiers.
     * MRZ uses '<' as a filler/separator character.
     */
    private fun buildFullName(mrzInfo: MRZInfo): String {
        val secondary = mrzInfo.secondaryIdentifier.replace("<", " ").trim()
        val primary   = mrzInfo.primaryIdentifier.replace("<", " ").trim()
        return buildString {
            if (secondary.isNotEmpty()) append(secondary)
            if (primary.isNotEmpty()) {
                if (isNotEmpty()) append(" ")
                append(primary)
            }
        }.trim()
    }

    private fun bytesToHex(bytes: ByteArray): String =
        bytes.joinToString("") { "%02x".format(it) }

    // ── Exception ─────────────────────────────────────────────────────────────

    /** Wraps all NFC/card read failures with a UI-safe Vietnamese message. */
    class NfcReadException(message: String) : Exception(message)
}
