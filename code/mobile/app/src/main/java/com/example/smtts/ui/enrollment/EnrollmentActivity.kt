package com.example.smtts.ui.enrollment

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
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
import android.widget.TextView
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
import com.example.smtts.MainActivity
import com.example.smtts.R
import com.example.smtts.data.api.ApiClient
import com.example.smtts.data.local.TokenManager
import com.example.smtts.databinding.ActivityEnrollmentBinding
import com.example.smtts.nfc.CccdNfcReader
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.regex.Pattern

/**
 * Enrollment Activity — Biometric registration for subjects.
 *
 * 3-step flow:
 * 1. NFC: Configure BAC → tap CCCD → read chip → submit to server
 * 2. Face: CameraX captures face → upload to server (InsightFace/ArcFace)
 * 3. Submit: Review both steps → send for officer approval
 */
class EnrollmentActivity : BaseNfcActivity() {

    companion object {
        private const val TAG = "EnrollmentActivity"
        private val DATE_PATTERN = Pattern.compile("^\\d{2}/\\d{2}/\\d{4}$")
    }

    private lateinit var binding: ActivityEnrollmentBinding
    private lateinit var viewModel: EnrollmentViewModel
    private lateinit var tokenManager: TokenManager

    // Camera
    private var imageCapture: ImageCapture? = null
    private var cameraStarted = false

    // Permission launcher
    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera()
        else showSnackbar(getString(R.string.enrollment_camera_permission_denied))
    }

    // ── Lifecycle ──────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityEnrollmentBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Edge-to-edge: pad only the header for status bar
        ViewCompat.setOnApplyWindowInsetsListener(binding.headerBar) { v, insets ->
            val top = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top
            v.setPadding(v.paddingLeft, top + v.paddingTop.coerceAtMost(14), v.paddingRight, v.paddingBottom)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this,
            EnrollmentViewModel.Factory(tokenManager)
        )[EnrollmentViewModel::class.java]

        // Disable base NFC popup — we handle NFC inline in step 1
        showNfcPopup = false

        setupUI()
        observeState()
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
        // Only handle NFC during Step 1
        if (viewModel.currentStep.value != EnrollmentStep.NFC_SCAN) return
        if (viewModel.nfcDone.value) return

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

        // Step 1: NFC
        binding.btnSaveNfcConfig.setOnClickListener { saveNfcConfig() }
        binding.btnNfcSubmit.setOnClickListener { viewModel.submitNfcData() }
        binding.btnNfcNext.setOnClickListener { viewModel.goToStep(EnrollmentStep.FACE_CAPTURE) }

        // Step 2: Face
        binding.btnCaptureFace.setOnClickListener { capturePhoto() }
        binding.btnFaceNext.setOnClickListener { viewModel.goToStep(EnrollmentStep.SUBMIT) }

        // Step 3: Submit
        binding.btnSubmitEnrollment.setOnClickListener { viewModel.completeEnrollment() }
        binding.btnBackToHome.setOnClickListener { navigateToMain() }

        // Initial NFC config state
        updateNfcConfigVisibility()
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

    private fun updateStepUI(step: EnrollmentStep) {
        // Update step indicator circles
        val step1Bg = when {
            step.ordinal > EnrollmentStep.NFC_SCAN.ordinal -> R.drawable.bg_step_done
            step == EnrollmentStep.NFC_SCAN -> R.drawable.bg_step_active
            else -> R.drawable.bg_step_inactive
        }
        val step2Bg = when {
            step.ordinal > EnrollmentStep.FACE_CAPTURE.ordinal -> R.drawable.bg_step_done
            step == EnrollmentStep.FACE_CAPTURE -> R.drawable.bg_step_active
            else -> R.drawable.bg_step_inactive
        }
        val step3Bg = when {
            step == EnrollmentStep.DONE -> R.drawable.bg_step_done
            step == EnrollmentStep.SUBMIT -> R.drawable.bg_step_active
            else -> R.drawable.bg_step_inactive
        }

        binding.tvStep1.setBackgroundResource(step1Bg)
        binding.tvStep2.setBackgroundResource(step2Bg)
        binding.tvStep3.setBackgroundResource(step3Bg)

        // Step labels color
        val activeColor = getColor(R.color.smtts_red_700)
        val doneColor = getColor(R.color.smtts_red_700)
        val inactiveColor = getColor(R.color.smtts_zinc_400)

        binding.tvStep1Label.setTextColor(if (step.ordinal >= EnrollmentStep.NFC_SCAN.ordinal) activeColor else inactiveColor)
        binding.tvStep2Label.setTextColor(if (step.ordinal >= EnrollmentStep.FACE_CAPTURE.ordinal) activeColor else inactiveColor)
        binding.tvStep3Label.setTextColor(if (step.ordinal >= EnrollmentStep.SUBMIT.ordinal) activeColor else inactiveColor)

        // Step lines
        binding.line1.setBackgroundResource(
            if (step.ordinal > EnrollmentStep.NFC_SCAN.ordinal) R.drawable.bg_step_line_active
            else R.drawable.bg_step_line_inactive
        )
        binding.line2.setBackgroundResource(
            if (step.ordinal > EnrollmentStep.FACE_CAPTURE.ordinal) R.drawable.bg_step_line_active
            else R.drawable.bg_step_line_inactive
        )

        // Show/hide step containers
        binding.stepNfc.visibility = if (step == EnrollmentStep.NFC_SCAN) View.VISIBLE else View.GONE
        binding.stepFace.visibility = if (step == EnrollmentStep.FACE_CAPTURE) View.VISIBLE else View.GONE
        binding.stepSubmit.visibility = if (step == EnrollmentStep.SUBMIT || step == EnrollmentStep.DONE) View.VISIBLE else View.GONE

        // Start camera when entering face step
        if (step == EnrollmentStep.FACE_CAPTURE && !cameraStarted) {
            if (hasCameraPermission()) startCamera()
            else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }

        // Populate Step 3 summary when entering submit step
        if (step == EnrollmentStep.SUBMIT) {
            populateSubmitSummary()
        }
    }

    // ── UI State Handling ─────────────────────────────────

    private fun handleUiState(state: EnrollmentUiState) {
        // Reset progress indicators
        binding.progressNfcSubmit.visibility = View.GONE
        binding.progressFace.visibility = View.GONE
        binding.progressSubmit.visibility = View.GONE

        when (state) {
            is EnrollmentUiState.Idle -> { }

            is EnrollmentUiState.InProgress -> {
                when (state.step) {
                    EnrollmentStep.NFC_SCAN -> {
                        binding.progressNfcSubmit.visibility = View.VISIBLE
                        binding.btnNfcSubmit.isEnabled = false
                    }
                    EnrollmentStep.FACE_CAPTURE -> {
                        binding.progressFace.visibility = View.VISIBLE
                        binding.btnCaptureFace.isEnabled = false
                    }
                    EnrollmentStep.SUBMIT -> {
                        binding.progressSubmit.visibility = View.VISIBLE
                        binding.btnSubmitEnrollment.isEnabled = false
                    }
                    else -> {}
                }
            }

            is EnrollmentUiState.NfcReadSuccess -> {
                // Chip read locally — show result card and submit button
                showNfcReadResult(state.chipData)
            }

            is EnrollmentUiState.NfcSubmitSuccess -> {
                // Server accepted NFC data — show next button
                binding.btnNfcSubmit.visibility = View.GONE
                binding.btnNfcNext.visibility = View.VISIBLE
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_success)
                binding.tvNfcStatus.setTextColor(getColor(R.color.smtts_green_700))
                showSnackbar(state.message)
            }

            is EnrollmentUiState.FaceSuccess -> {
                // Face processed — show quality result and next button
                binding.cardFaceResult.visibility = View.VISIBLE
                binding.tvFaceQuality.text = getString(
                    R.string.enrollment_face_quality, state.qualityScore * 100
                )
                binding.tvFaceLiveness.text = getString(
                    R.string.enrollment_face_liveness, state.livenessScore * 100
                )
                binding.btnCaptureFace.text = getString(R.string.enrollment_face_retry)
                binding.btnCaptureFace.isEnabled = true
                binding.btnFaceNext.visibility = View.VISIBLE
                showSnackbar(state.message)
            }

            is EnrollmentUiState.Complete -> {
                // Enrollment submitted for approval
                binding.btnSubmitEnrollment.visibility = View.GONE
                binding.enrollmentSuccessArea.visibility = View.VISIBLE
                showSnackbar(state.message)
            }

            is EnrollmentUiState.Error -> {
                showSnackbar(state.message)
                when (state.step) {
                    EnrollmentStep.NFC_SCAN -> {
                        binding.btnNfcSubmit.isEnabled = true
                    }
                    EnrollmentStep.FACE_CAPTURE -> {
                        binding.btnCaptureFace.isEnabled = true
                        binding.btnCaptureFace.text = getString(R.string.enrollment_face_capture_btn)
                    }
                    EnrollmentStep.SUBMIT -> {
                        binding.btnSubmitEnrollment.isEnabled = true
                    }
                    else -> {}
                }
                viewModel.resetError()
            }
        }
    }

    // ── Step 1: NFC ───────────────────────────────────────

    private fun updateNfcConfigVisibility() {
        val hasBac = tokenManager.hasNfcBacData()
        binding.cardNfcConfig.visibility = if (hasBac) View.GONE else View.VISIBLE
        binding.nfcWaitingArea.visibility = if (hasBac) View.VISIBLE else View.GONE

        if (hasBac) {
            // Pre-fill config fields in case user wants to edit
            binding.etNfcCccd.setText(tokenManager.getNfcCccd()?.let { yymmddToCccd(it) } ?: "")
            // Start pulse animation
            startNfcPulseAnimation()
        }
    }

    private fun saveNfcConfig() {
        val cccd = binding.etNfcCccd.text?.toString()?.trim() ?: ""
        val dob = binding.etNfcDob.text?.toString()?.trim() ?: ""
        val expiry = binding.etNfcExpiry.text?.toString()?.trim() ?: ""

        // Validate
        var valid = true
        if (cccd.length != 12 || !cccd.all { it.isDigit() }) {
            binding.tilNfcCccd.error = getString(R.string.nfc_config_error_cccd)
            valid = false
        } else {
            binding.tilNfcCccd.error = null
        }

        if (!DATE_PATTERN.matcher(dob).matches()) {
            binding.tilNfcDob.error = getString(R.string.nfc_config_error_dob)
            valid = false
        } else {
            binding.tilNfcDob.error = null
        }

        if (!DATE_PATTERN.matcher(expiry).matches()) {
            binding.tilNfcExpiry.error = getString(R.string.nfc_config_error_expiry)
            valid = false
        } else {
            binding.tilNfcExpiry.error = null
        }

        if (!valid) return

        // Convert dd/mm/yyyy → YYMMDD for BAC
        val dobYymmdd = displayToYymmdd(dob)
        val expiryYymmdd = displayToYymmdd(expiry)

        tokenManager.saveNfcBacData(cccd, dobYymmdd, expiryYymmdd)
        showSnackbar(getString(R.string.nfc_config_saved))

        // Switch to NFC waiting area
        binding.cardNfcConfig.visibility = View.GONE
        binding.nfcWaitingArea.visibility = View.VISIBLE
        startNfcPulseAnimation()
    }

    private fun startNfcPulseAnimation() {
        val pulse = AnimationUtils.loadAnimation(this, R.anim.pulse)
        binding.ivNfcPulse.startAnimation(pulse)
    }

    private fun handleNfcTag(tag: Tag) {
        if (viewModel.nfcDone.value) return

        val bacData = getNfcBacData()
        if (bacData == null) {
            showSnackbar(getString(R.string.nfc_not_configured_msg))
            return
        }

        // Show reading state
        binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_reading)
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

                Log.d(TAG, "NFC read success: ${chipData.fullName}")
                binding.progressNfcRead.visibility = View.GONE
                viewModel.onNfcChipRead(chipData)
            } catch (e: CccdNfcReader.NfcReadException) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar(e.message ?: getString(R.string.enrollment_nfc_error))
            } catch (e: Exception) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar("Loi doc NFC: ${e.message}")
            }
        }
    }

    private fun showNfcReadResult(chipData: CccdNfcReader.CccdChipData) {
        // Hide waiting area, show result card
        binding.nfcWaitingArea.visibility = View.GONE
        binding.cardNfcResult.visibility = View.VISIBLE

        // Populate NFC data rows (inside the include)
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
            if (chipData.passiveAuthData != null) getString(R.string.nfc_result_passive_auth_ok)
            else getString(R.string.nfc_result_passive_auth_none)

        // Show submit button
        binding.btnNfcSubmit.visibility = View.VISIBLE
        binding.btnNfcSubmit.isEnabled = true
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

            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture)
                cameraStarted = true
                Log.d(TAG, "Camera started for face capture")
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
        binding.btnCaptureFace.text = getString(R.string.enrollment_face_processing)

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
                            viewModel.submitFaceImage(bytes)
                        } else {
                            showSnackbar("Khong the xu ly anh. Vui long thu lai.")
                            binding.btnCaptureFace.isEnabled = true
                            binding.btnCaptureFace.text =
                                getString(R.string.enrollment_face_capture_btn)
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e(TAG, "Photo capture failed", exception)
                    showSnackbar("Chup anh that bai: ${exception.message}")
                    binding.btnCaptureFace.isEnabled = true
                    binding.btnCaptureFace.text = getString(R.string.enrollment_face_capture_btn)
                }
            }
        )
    }

    /**
     * Convert ImageProxy (YUV_420_888) to JPEG bytes for upload to server.
     */
    private fun imageProxyToJpegBytes(image: ImageProxy): ByteArray? {
        return try {
            val planes = image.planes
            val yBuffer: ByteBuffer = planes[0].buffer
            val uBuffer: ByteBuffer = planes[1].buffer
            val vBuffer: ByteBuffer = planes[2].buffer

            val ySize = yBuffer.remaining()
            val uSize = uBuffer.remaining()
            val vSize = vBuffer.remaining()

            val nv21 = ByteArray(ySize + uSize + vSize)
            yBuffer.get(nv21, 0, ySize)
            vBuffer.get(nv21, ySize, vSize)
            uBuffer.get(nv21, ySize + vSize, uSize)

            val yuvImage = android.graphics.YuvImage(
                nv21,
                android.graphics.ImageFormat.NV21,
                image.width,
                image.height,
                null
            )
            val stream = ByteArrayOutputStream()
            yuvImage.compressToJpeg(
                android.graphics.Rect(0, 0, image.width, image.height),
                90,
                stream
            )
            val jpegBytes = stream.toByteArray()

            // Rotate if needed (front camera often needs mirroring)
            val rotation = image.imageInfo.rotationDegrees
            if (rotation != 0) {
                val bitmap = BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size)
                val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
                val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                val rotatedStream = ByteArrayOutputStream()
                rotated.compress(Bitmap.CompressFormat.JPEG, 90, rotatedStream)
                bitmap.recycle()
                rotated.recycle()
                rotatedStream.toByteArray()
            } else {
                jpegBytes
            }
        } catch (e: Exception) {
            Log.e(TAG, "Image conversion failed", e)
            null
        }
    }

    // ── Step 3: Submit Summary ────────────────────────────

    private fun populateSubmitSummary() {
        val chipData = viewModel.nfcChipData.value
        if (chipData != null) {
            binding.tvSubmitNfcInfo.text = "${chipData.fullName} — ${chipData.cccdNumber}"
        }

        val quality = viewModel.faceQualityScore.value
        val liveness = viewModel.faceLivenessScore.value
        binding.tvSubmitFaceInfo.text = getString(
            R.string.enrollment_face_quality, quality * 100
        ) + " — " + getString(
            R.string.enrollment_face_liveness, liveness * 100
        )
    }

    // ── Navigation ────────────────────────────────────────

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showSnackbar(message: String) {
        Snackbar.make(binding.rootLayout, message, Snackbar.LENGTH_LONG)
            .setBackgroundTint(getColor(R.color.smtts_zinc_900))
            .setTextColor(getColor(R.color.white))
            .show()
    }

    // ── Date Utilities ────────────────────────────────────

    /** Convert dd/mm/yyyy → YYMMDD for BAC key */
    private fun displayToYymmdd(display: String): String {
        val parts = display.split("/")
        if (parts.size != 3) return "000000"
        val dd = parts[0]
        val mm = parts[1]
        val yyyy = parts[2]
        val yy = if (yyyy.length == 4) yyyy.substring(2) else yyyy
        return "$yy$mm$dd"
    }

    /** Convert YYMMDD → DD/MM/YYYY for display */
    private fun formatYymmdd(yymmdd: String): String {
        if (yymmdd.length != 6) return yymmdd
        val yy = yymmdd.substring(0, 2).toIntOrNull() ?: return yymmdd
        val mm = yymmdd.substring(2, 4)
        val dd = yymmdd.substring(4, 6)
        val yyyy = if (yy > 50) "19$yy" else "20$yy"
        return "$dd/$mm/$yyyy"
    }

    /** Get original 12-digit CCCD from stored BAC cccd (which is already 12 digits) */
    private fun yymmddToCccd(cccd: String): String = cccd
}
