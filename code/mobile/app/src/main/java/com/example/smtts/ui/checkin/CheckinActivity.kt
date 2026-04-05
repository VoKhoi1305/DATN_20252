package com.example.smtts.ui.checkin

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.location.LocationManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.animation.AnimationUtils
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.example.smtts.BaseNfcActivity
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.databinding.ActivityCheckinBinding
import com.example.smtts.nfc.CccdNfcReader
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.io.ByteArrayOutputStream

import java.security.Security

/**
 * Check-in Activity — NFC + Face verification for attendance.
 *
 * 2-step flow:
 * 1. NFC: Tap CCCD → read chip → verify identity (chipDataHash)
 * 2. Face: Capture selfie → submit everything to server
 */
class CheckinActivity : BaseNfcActivity() {

    companion object {
        private const val TAG = "CheckinActivity"
    }

    private lateinit var binding: ActivityCheckinBinding
    private lateinit var viewModel: CheckinViewModel
    private lateinit var tokenManager: TokenManager

    private var imageCapture: ImageCapture? = null
    private var cameraStarted = false

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera()
        else showSnackbar("Can quyen camera de chup anh khuon mat")
    }

    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* GPS collected on-demand; no action needed here */ }

    // ── Lifecycle ──────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME)
        Security.insertProviderAt(BouncyCastleProvider(), 1)

        super.onCreate(savedInstanceState)

        binding = ActivityCheckinBinding.inflate(layoutInflater)
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(binding.headerBar) { v, insets ->
            val top = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top
            v.setPadding(v.paddingLeft, top + v.paddingTop.coerceAtMost(14), v.paddingRight, v.paddingBottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this,
            CheckinViewModel.Factory(tokenManager)
        )[CheckinViewModel::class.java]

        // Disable base NFC popup — we handle NFC inline
        showNfcPopup = false

        setupUI()
        observeState()

        // Pre-request location permission so GPS is available when submitting
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        // Check if BAC data is available
        if (!viewModel.hasBacData()) {
            showSnackbar(getString(R.string.checkin_no_bac_data))
            binding.tvCheckinNfcStatus.text = getString(R.string.checkin_no_bac_data)
        }
    }

    // ── BaseNfcActivity overrides ─────────────────────────

    override fun getNfcBacData(): NfcBacData? {
        val cccd = tokenManager.getNfcCccd() ?: return null
        val dob = tokenManager.getNfcDob() ?: return null
        val expiry = tokenManager.getNfcExpiry() ?: return null
        return NfcBacData(cccd, dob, expiry)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (viewModel.currentStep.value != CheckinStep.NFC_SCAN) return

        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }
            if (tag != null) handleNfcTag(tag)
        }
    }

    // ── Setup ─────────────────────────────────────────────

    private fun setupUI() {
        binding.btnBack.setOnClickListener { finish() }
        binding.btnCheckinNfcNext.setOnClickListener { viewModel.goToFaceStep() }
        binding.btnCaptureFace.setOnClickListener { capturePhoto() }
        binding.btnBackToHome.setOnClickListener { finish() }

        startNfcPulseAnimation()
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { viewModel.currentStep.collect { updateStepUI(it) } }
                launch { viewModel.uiState.collect { handleUiState(it) } }
            }
        }
    }

    // ── Step Navigation UI ────────────────────────────────

    private fun updateStepUI(step: CheckinStep) {
        // Step indicators
        val step1Bg = when {
            step.ordinal > CheckinStep.NFC_SCAN.ordinal -> R.drawable.bg_step_done
            step == CheckinStep.NFC_SCAN -> R.drawable.bg_step_active
            else -> R.drawable.bg_step_inactive
        }
        val step2Bg = when {
            step.ordinal >= CheckinStep.DONE.ordinal -> R.drawable.bg_step_done
            step == CheckinStep.FACE_CAPTURE || step == CheckinStep.SUBMITTING -> R.drawable.bg_step_active
            else -> R.drawable.bg_step_inactive
        }
        binding.tvStep1.setBackgroundResource(step1Bg)
        binding.tvStep2.setBackgroundResource(step2Bg)

        val activeColor = getColor(R.color.smtts_red_700)
        val inactiveColor = getColor(R.color.smtts_zinc_400)
        binding.tvStep1Label.setTextColor(if (step.ordinal >= CheckinStep.NFC_SCAN.ordinal) activeColor else inactiveColor)
        binding.tvStep2Label.setTextColor(if (step.ordinal >= CheckinStep.FACE_CAPTURE.ordinal) activeColor else inactiveColor)

        binding.line1.setBackgroundResource(
            if (step.ordinal > CheckinStep.NFC_SCAN.ordinal) R.drawable.bg_step_line_active
            else R.drawable.bg_step_line_inactive
        )

        // Show/hide step containers
        binding.stepNfc.visibility = if (step == CheckinStep.NFC_SCAN) View.VISIBLE else View.GONE
        binding.stepFace.visibility = if (step == CheckinStep.FACE_CAPTURE || step == CheckinStep.SUBMITTING) View.VISIBLE else View.GONE
        binding.stepDone.visibility = if (step == CheckinStep.DONE) View.VISIBLE else View.GONE

        // Start camera when entering face step
        if (step == CheckinStep.FACE_CAPTURE && !cameraStarted) {
            if (hasCameraPermission()) startCamera()
            else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // ── UI State Handling ─────────────────────────────────

    private fun handleUiState(state: CheckinUiState) {
        binding.progressSubmit.visibility = View.GONE

        when (state) {
            is CheckinUiState.Idle -> { }

            is CheckinUiState.InProgress -> {
                when (state.step) {
                    CheckinStep.SUBMITTING -> {
                        binding.progressSubmit.visibility = View.VISIBLE
                        binding.btnCaptureFace.isEnabled = false
                    }
                    else -> {}
                }
            }

            is CheckinUiState.NfcSuccess -> {
                showNfcResult(state.chipData)

                // Auto-advance to face capture after 1.5s
                lifecycleScope.launch {
                    delay(1500)
                    viewModel.goToFaceStep()
                }
            }

            is CheckinUiState.SubmitSuccess -> {
                binding.tvCheckinResultTitle.text = when (state.result) {
                    "SUCCESS" -> getString(R.string.checkin_result_success)
                    "WARNING" -> getString(R.string.checkin_result_warning)
                    else -> getString(R.string.checkin_result_failed)
                }

                // Build detailed result message with face match score
                val details = buildString {
                    append(state.message)
                    state.event?.let { evt ->
                        evt.faceMatchScore?.let { score ->
                            append("\n\n")
                            append(getString(R.string.checkin_face_score, score))
                        }
                        evt.livenessScore?.let { score ->
                            append("\n")
                            append(getString(R.string.checkin_liveness_score, score))
                        }
                        if (evt.nfcVerified == true) {
                            append("\n")
                            append(getString(R.string.checkin_nfc_ok))
                        }
                        if (evt.deviceMatched == false) {
                            append("\n")
                            append(getString(R.string.checkin_device_mismatch))
                        }
                    }
                }
                binding.tvCheckinResultMsg.text = details

                val iconTint = when (state.result) {
                    "SUCCESS" -> getColor(R.color.smtts_green_700)
                    "WARNING" -> getColor(R.color.smtts_amber_600)
                    else -> getColor(R.color.smtts_red_700)
                }
                binding.ivCheckinResultIcon.setColorFilter(iconTint)
            }

            is CheckinUiState.Error -> {
                showSnackbar(state.message)
                when (state.step) {
                    CheckinStep.FACE_CAPTURE -> {
                        binding.btnCaptureFace.isEnabled = true
                        binding.btnCaptureFace.text = getString(R.string.checkin_capture_face)
                    }
                    else -> {}
                }
                viewModel.resetError()
            }
        }
    }

    // ── Step 1: NFC ───────────────────────────────────────

    private fun startNfcPulseAnimation() {
        val pulse = AnimationUtils.loadAnimation(this, R.anim.pulse)
        binding.ivNfcPulse.startAnimation(pulse)
    }

    private fun handleNfcTag(tag: Tag) {
        val bacData = getNfcBacData()
        if (bacData == null) {
            showSnackbar(getString(R.string.checkin_no_bac_data))
            return
        }

        binding.tvCheckinNfcStatus.text = getString(R.string.checkin_nfc_reading)
        binding.progressNfcRead.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val chipData = withContext(Dispatchers.IO) {
                    CccdNfcReader().readChip(
                        tag = tag,
                        cccdNumber = bacData.cccdNumber,
                        dateOfBirth = bacData.dateOfBirth,
                        expiryDate = bacData.expiryDate
                    )
                }
                Log.d(TAG, "NFC read OK: ${chipData.fullName}, hash=${chipData.chipDataHash}")
                binding.progressNfcRead.visibility = View.GONE
                viewModel.onNfcChipRead(chipData)
            } catch (e: CccdNfcReader.NfcReadException) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvCheckinNfcStatus.text = getString(R.string.checkin_nfc_waiting)
                showSnackbar(e.message ?: getString(R.string.enrollment_nfc_error))
                // Log failure to backend immediately
                viewModel.logNfcFailure(this@CheckinActivity, "NFC_READ_ERROR")
            } catch (e: SecurityException) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvCheckinNfcStatus.text = getString(R.string.checkin_nfc_waiting)
                showSnackbar(e.message ?: "Canh bao: Phat hien the CCCD khong hop le!")
                // Security exception = passive auth failed / suspected cloned card — critical event
                viewModel.logNfcFailure(this@CheckinActivity, "PASSIVE_AUTH_FAILED")
            } catch (e: Exception) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvCheckinNfcStatus.text = getString(R.string.checkin_nfc_waiting)
                showSnackbar("Loi doc NFC: ${e.message}")
                viewModel.logNfcFailure(this@CheckinActivity, "NFC_EXCEPTION")
            }
        }
    }

    private fun showNfcResult(chipData: CccdNfcReader.CccdChipData) {
        binding.nfcWaitingArea.visibility = View.GONE
        binding.cardNfcResult.visibility = View.VISIBLE

        binding.nfcDataRows.tvNfcRowFullName.text = chipData.fullName
        binding.nfcDataRows.tvNfcRowCccd.text = chipData.cccdNumber
        binding.nfcDataRows.tvNfcRowDob.text = formatYymmdd(chipData.dateOfBirth)
        binding.nfcDataRows.tvNfcRowGender.text = when (chipData.gender.uppercase()) {
            "M", "MALE" -> getString(R.string.nfc_result_gender_male)
            "F", "FEMALE" -> getString(R.string.nfc_result_gender_female)
            else -> chipData.gender
        }
        binding.nfcDataRows.tvNfcRowNationality.text = chipData.nationality
        binding.nfcDataRows.tvNfcRowExpiry.text = formatYymmdd(chipData.expiryDate)
        binding.nfcDataRows.tvNfcRowChipSerial.text = chipData.chipSerial
        binding.nfcDataRows.tvNfcRowPassiveAuth.text =
            if (chipData.passiveAuthVerified) getString(R.string.nfc_result_passive_auth_ok)
            else getString(R.string.nfc_result_passive_auth_none)

        binding.btnCheckinNfcNext.visibility = View.VISIBLE
    }

    // ── Step 2: Face Capture ──────────────────────────────

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun startCamera() {
        if (cameraStarted) return
        binding.cameraPreview.visibility = View.VISIBLE
        binding.btnCaptureFace.isEnabled = true

        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.surfaceProvider = binding.cameraPreview.surfaceProvider
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .build()

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, CameraSelector.DEFAULT_FRONT_CAMERA, preview, imageCapture
                )
                cameraStarted = true
            } catch (e: Exception) {
                Log.e(TAG, "Camera start failed", e)
                showSnackbar("Khong the khoi dong camera: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun capturePhoto() {
        val capture = imageCapture ?: run {
            showSnackbar("Camera chua san sang")
            return
        }

        binding.btnCaptureFace.isEnabled = false
        binding.btnCaptureFace.text = getString(R.string.checkin_processing)

        capture.takePicture(
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    lifecycleScope.launch {
                        val bytes = withContext(Dispatchers.IO) {
                            imageProxyToJpegBytes(image)
                        }
                        image.close()

                        if (bytes != null && bytes.isNotEmpty()) {
                            viewModel.submitCheckin(bytes, this@CheckinActivity)
                        } else {
                            showSnackbar("Khong the xu ly anh. Vui long thu lai.")
                            binding.btnCaptureFace.isEnabled = true
                            binding.btnCaptureFace.text = getString(R.string.checkin_capture_face)
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e(TAG, "Photo capture failed", exception)
                    showSnackbar("Chup anh that bai: ${exception.message}")
                    binding.btnCaptureFace.isEnabled = true
                    binding.btnCaptureFace.text = getString(R.string.checkin_capture_face)
                }
            }
        )
    }

    private fun imageProxyToJpegBytes(image: ImageProxy): ByteArray? {
        return try {
            // ImageCapture returns JPEG format — single plane
            val buffer = image.planes[0].buffer
            val jpegBytes = ByteArray(buffer.remaining())
            buffer.get(jpegBytes)

            val rotation = image.imageInfo.rotationDegrees
            val bitmap = BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size)
            val matrix = Matrix().apply {
                if (rotation != 0) postRotate(rotation.toFloat())
                postScale(-1f, 1f) // horizontal mirror for front camera
            }
            val corrected = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            val stream = ByteArrayOutputStream()
            corrected.compress(Bitmap.CompressFormat.JPEG, 90, stream)
            bitmap.recycle()
            corrected.recycle()
            stream.toByteArray()
        } catch (e: Exception) {
            Log.e(TAG, "Image conversion failed", e)
            null
        }
    }

    // ── Helpers ────────────────────────────────────────────

    private fun formatYymmdd(yymmdd: String): String {
        if (yymmdd.length != 6) return yymmdd
        val yy = yymmdd.substring(0, 2).toIntOrNull() ?: return yymmdd
        val mm = yymmdd.substring(2, 4)
        val dd = yymmdd.substring(4, 6)
        val yyyy = if (yy > 50) "19$yy" else "20$yy"
        return "$dd/$mm/$yyyy"
    }

    private fun showSnackbar(message: String) {
        Snackbar.make(binding.rootLayout, message, Snackbar.LENGTH_LONG)
            .setBackgroundTint(getColor(R.color.smtts_zinc_900))
            .setTextColor(getColor(R.color.white))
            .show()
    }
}
