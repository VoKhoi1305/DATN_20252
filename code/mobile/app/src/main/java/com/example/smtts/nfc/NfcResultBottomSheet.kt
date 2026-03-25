package com.example.smtts.nfc

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import com.example.smtts.R
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView

/**
 * Bottom sheet dialog that displays NFC scan results with animations.
 *
 * States:
 * - LOADING: Pulse animation on NFC icon + progress bar (reading chip)
 * - SUCCESS: Green icon + full parsed CCCD data
 * - ERROR: Red icon + error message with troubleshooting hint
 * - TAG_ONLY: Amber icon + chip serial only (BAC failed but tag detected)
 * - NOT_CONFIGURED: Info message telling user to configure BAC data first
 */
class NfcResultBottomSheet : BottomSheetDialogFragment() {

    private var chipData: CccdNfcReader.CccdChipData? = null
    private var errorMessage: String? = null
    private var tagSerial: String? = null
    private var notConfiguredSerial: String? = null
    private var isLoading: Boolean = true

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_nfc_result, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        view.findViewById<MaterialButton>(R.id.btnCloseNfcResult).setOnClickListener {
            dismiss()
        }

        updateUI(view)
    }

    fun showLoading() {
        isLoading = true
        chipData = null
        errorMessage = null
        tagSerial = null
        notConfiguredSerial = null
        view?.let { updateUI(it) }
    }

    fun showResult(data: CccdNfcReader.CccdChipData) {
        isLoading = false
        chipData = data
        errorMessage = null
        notConfiguredSerial = null
        view?.let { updateUI(it) }
    }

    fun showError(message: String) {
        isLoading = false
        errorMessage = message
        chipData = null
        notConfiguredSerial = null
        view?.let { updateUI(it) }
    }

    fun showTagOnly(serial: String) {
        isLoading = false
        tagSerial = serial
        chipData = null
        errorMessage = null
        notConfiguredSerial = null
        view?.let { updateUI(it) }
    }

    fun showNotConfigured(serial: String) {
        isLoading = false
        notConfiguredSerial = serial
        chipData = null
        errorMessage = null
        tagSerial = null
        view?.let { updateUI(it) }
    }

    private fun updateUI(view: View) {
        val progress = view.findViewById<ProgressBar>(R.id.progressNfc)
        val cardInfo = view.findViewById<MaterialCardView>(R.id.cardNfcInfo)
        val tvStatus = view.findViewById<TextView>(R.id.tvNfcResultStatus)
        val tvError = view.findViewById<TextView>(R.id.tvNfcError)
        val ivIcon = view.findViewById<ImageView>(R.id.ivNfcIcon)

        // Stop any previous animation
        ivIcon.clearAnimation()

        when {
            isLoading -> {
                progress.visibility = View.VISIBLE
                cardInfo.visibility = View.GONE
                tvError.visibility = View.GONE
                tvStatus.text = getString(R.string.nfc_result_reading)
                ivIcon.setBackgroundResource(R.drawable.bg_icon_circle_blue)

                // Start pulse animation on the NFC icon
                val pulse = AnimationUtils.loadAnimation(requireContext(), R.anim.pulse)
                ivIcon.startAnimation(pulse)
            }

            chipData != null -> {
                progress.visibility = View.GONE
                cardInfo.visibility = View.VISIBLE
                tvError.visibility = View.GONE
                tvStatus.text = getString(R.string.nfc_result_success)
                ivIcon.setBackgroundResource(R.drawable.bg_icon_circle_green)
                bindChipData(view, chipData!!)
            }

            notConfiguredSerial != null -> {
                progress.visibility = View.GONE
                cardInfo.visibility = View.VISIBLE
                tvError.visibility = View.VISIBLE
                tvError.text = getString(R.string.nfc_not_configured_msg)
                tvError.setBackgroundColor(requireContext().getColor(R.color.smtts_zinc_100))
                tvError.setTextColor(requireContext().getColor(R.color.smtts_zinc_700))
                tvStatus.text = getString(R.string.nfc_detected_vibrate)
                ivIcon.setBackgroundResource(R.drawable.bg_icon_circle_amber)
                bindTagOnly(view, notConfiguredSerial!!)
            }

            tagSerial != null -> {
                progress.visibility = View.GONE
                cardInfo.visibility = View.VISIBLE
                tvError.visibility = View.GONE
                tvStatus.text = getString(R.string.nfc_result_partial)
                ivIcon.setBackgroundResource(R.drawable.bg_icon_circle_amber)
                bindTagOnly(view, tagSerial!!)
            }

            errorMessage != null -> {
                progress.visibility = View.GONE
                cardInfo.visibility = View.GONE
                tvError.visibility = View.VISIBLE
                tvError.text = errorMessage
                tvError.setBackgroundColor(requireContext().getColor(R.color.smtts_red_100))
                tvError.setTextColor(requireContext().getColor(R.color.smtts_red_700))
                tvStatus.text = getString(R.string.nfc_result_error)
                ivIcon.setBackgroundResource(R.drawable.bg_icon_circle_red)
            }
        }
    }

    private fun bindChipData(view: View, data: CccdNfcReader.CccdChipData) {
        view.findViewById<TextView>(R.id.tvFullName).text = data.fullName
        view.findViewById<TextView>(R.id.tvCccdNumber).text = data.cccdNumber
        view.findViewById<TextView>(R.id.tvDob).text = formatDate(data.dateOfBirth)
        view.findViewById<TextView>(R.id.tvGender).text = when (data.gender.uppercase()) {
            "M", "MALE" -> getString(R.string.nfc_result_gender_male)
            "F", "FEMALE" -> getString(R.string.nfc_result_gender_female)
            else -> data.gender
        }
        view.findViewById<TextView>(R.id.tvNationality).text = data.nationality
        view.findViewById<TextView>(R.id.tvExpiry).text = formatDate(data.expiryDate)
        view.findViewById<TextView>(R.id.tvChipSerial).text = data.chipSerial
        view.findViewById<TextView>(R.id.tvPassiveAuth).text =
            if (data.passiveAuthData != null)
                getString(R.string.nfc_result_passive_auth_ok)
            else
                getString(R.string.nfc_result_passive_auth_none)

        // Show all rows
        view.findViewById<View>(R.id.rowFullName).visibility = View.VISIBLE
        view.findViewById<View>(R.id.rowCccd).visibility = View.VISIBLE
        view.findViewById<View>(R.id.rowDob).visibility = View.VISIBLE
        view.findViewById<View>(R.id.rowGender).visibility = View.VISIBLE
        view.findViewById<View>(R.id.rowNationality).visibility = View.VISIBLE
        view.findViewById<View>(R.id.rowExpiry).visibility = View.VISIBLE
    }

    private fun bindTagOnly(view: View, serial: String) {
        view.findViewById<TextView>(R.id.tvChipSerial).text = serial

        // Hide data rows that we don't have
        view.findViewById<View>(R.id.rowFullName).visibility = View.GONE
        view.findViewById<View>(R.id.rowCccd).visibility = View.GONE
        view.findViewById<View>(R.id.rowDob).visibility = View.GONE
        view.findViewById<View>(R.id.rowGender).visibility = View.GONE
        view.findViewById<View>(R.id.rowNationality).visibility = View.GONE
        view.findViewById<View>(R.id.rowExpiry).visibility = View.GONE
        view.findViewById<TextView>(R.id.tvPassiveAuth).text =
            getString(R.string.nfc_result_passive_auth_none)
    }

    /**
     * Format YYMMDD date to DD/MM/YYYY.
     */
    private fun formatDate(yymmdd: String): String {
        if (yymmdd.length != 6) return yymmdd
        val yy = yymmdd.substring(0, 2).toIntOrNull() ?: return yymmdd
        val mm = yymmdd.substring(2, 4)
        val dd = yymmdd.substring(4, 6)
        val yyyy = if (yy > 50) "19$yy" else "20$yy"
        return "$dd/$mm/$yyyy"
    }

    companion object {
        const val TAG = "NfcResultBottomSheet"

        fun newInstance(): NfcResultBottomSheet {
            return NfcResultBottomSheet()
        }
    }
}
