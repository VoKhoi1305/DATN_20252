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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.io.ByteArrayOutputStream

import java.security.Security
import android.text.Editable
import android.text.TextWatcher
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
        // Register the full BouncyCastle provider at position 1 (highest priority)
        // BEFORE super.onCreate() so it is available for all PACE/BAC crypto operations.
        // Android ships a stripped-down BC provider that lacks DESede, ECDH, AESCMAC, etc.
        // Removing it first prevents "duplicate provider" conflicts.
        Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME)
        Security.insertProviderAt(BouncyCastleProvider(), 1)

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
        binding.btnEditNfcConfig.setOnClickListener { showNfcConfigForEdit() }
        binding.btnNfcSubmit.setOnClickListener { viewModel.submitNfcData() }
        binding.btnNfcNext.setOnClickListener { viewModel.goToStep(EnrollmentStep.FACE_CAPTURE) }

        // Step 2: Face
        binding.btnCaptureFace.setOnClickListener { capturePhoto() }
        binding.btnFaceNext.setOnClickListener { viewModel.goToStep(EnrollmentStep.DEVICE_ENROLL) }

        // Step 3: Device (auto-enrolls on entering step)
        // Step 4: Submit
        binding.btnSubmitEnrollment.setOnClickListener { viewModel.completeEnrollment() }
        binding.btnBackToHome.setOnClickListener { navigateToMain() }

        // Auto-format date fields (dd/mm/yyyy)
        binding.etNfcDob.addTextChangedListener(DateTextWatcher(binding.etNfcDob))
        binding.etNfcExpiry.addTextChangedListener(DateTextWatcher(binding.etNfcExpiry))

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
        // Update step indicator circles (3 visible steps: NFC, Face, Submit)
        // Device enrollment is auto-done between Face and Submit
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
            step == EnrollmentStep.SUBMIT || step == EnrollmentStep.DEVICE_ENROLL -> R.drawable.bg_step_active
            else -> R.drawable.bg_step_inactive
        }

        binding.tvStep1.setBackgroundResource(step1Bg)
        binding.tvStep2.setBackgroundResource(step2Bg)
        binding.tvStep3.setBackgroundResource(step3Bg)

        // Step labels color
        val activeColor = getColor(R.color.smtts_red_700)
        val inactiveColor = getColor(R.color.smtts_zinc_400)

        binding.tvStep1Label.setTextColor(if (step.ordinal >= EnrollmentStep.NFC_SCAN.ordinal) activeColor else inactiveColor)
        binding.tvStep2Label.setTextColor(if (step.ordinal >= EnrollmentStep.FACE_CAPTURE.ordinal) activeColor else inactiveColor)
        binding.tvStep3Label.setTextColor(if (step.ordinal >= EnrollmentStep.SUBMIT.ordinal || step == EnrollmentStep.DEVICE_ENROLL) activeColor else inactiveColor)

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
        binding.stepSubmit.visibility = if (step == EnrollmentStep.SUBMIT || step == EnrollmentStep.DONE || step == EnrollmentStep.DEVICE_ENROLL) View.VISIBLE else View.GONE

        // Start camera when entering face step
        if (step == EnrollmentStep.FACE_CAPTURE && !cameraStarted) {
            if (hasCameraPermission()) startCamera()
            else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }

        // Auto-enroll device when entering device step, then move to submit
        if (step == EnrollmentStep.DEVICE_ENROLL) {
            viewModel.enrollDevice(this)
        }

        // Populate summary when entering submit step
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
                // Server accepted NFC data — show result then auto-advance
                binding.btnNfcSubmit.visibility = View.GONE
                binding.btnNfcNext.visibility = View.VISIBLE
                binding.tvNfcStatus.text = if (state.dg2FaceEnrolled) {
                    getString(R.string.enrollment_nfc_success) + "\n" + getString(R.string.enrollment_dg2_face_enrolled)
                } else {
                    getString(R.string.enrollment_nfc_success)
                }
                binding.tvNfcStatus.setTextColor(getColor(R.color.smtts_green_700))
                showSnackbar(state.message)

                // Auto-advance to face capture after 1.5s
                lifecycleScope.launch {
                    delay(1500)
                    viewModel.goToStep(EnrollmentStep.FACE_CAPTURE)
                }
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

            is EnrollmentUiState.DeviceSuccess -> {
                // Device enrolled — auto-advance to submit step
                showSnackbar(state.message)
                viewModel.goToStep(EnrollmentStep.SUBMIT)
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
                    EnrollmentStep.DEVICE_ENROLL -> {
                        // Device enrollment failed — allow retry via submit step
                        binding.btnSubmitEnrollment.isEnabled = true
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
        if (hasBac) startNfcPulseAnimation()
    }

    /**
     * Hiển thị form nhập lại thông tin BAC (CCCD/Ngày sinh/Ngày hết hạn).
     * Gọi khi người dùng nhấn "Sửa thông tin thẻ" sau khi đã lưu nhưng quét bị lỗi sai chìa khóa.
     * Tự động điền lại dữ liệu đang lưu để dễ chỉnh sửa từng trường.
     */
    private fun showNfcConfigForEdit() {
        // Điền lại toàn bộ 3 trường từ dữ liệu đang lưu
        binding.etNfcCccd.setText(tokenManager.getNfcCccd() ?: "")
        binding.etNfcDob.setText(tokenManager.getNfcDob()?.let { formatYymmdd(it) } ?: "")
        binding.etNfcExpiry.setText(tokenManager.getNfcExpiry()?.let { formatYymmdd(it) } ?: "")

        // Xóa lỗi cũ nếu có
        binding.tilNfcCccd.error = null
        binding.tilNfcDob.error = null
        binding.tilNfcExpiry.error = null

        // Chuyển về form nhập liệu
        binding.nfcWaitingArea.visibility = View.GONE
        binding.cardNfcConfig.visibility = View.VISIBLE
    }

    private fun saveNfcConfig() {
        val cccd = binding.etNfcCccd.text?.toString()?.trim() ?: ""
        val dob = binding.etNfcDob.text?.toString()?.trim() ?: ""
        val expiry = binding.etNfcExpiry.text?.toString()?.trim() ?: ""

        Log.d(TAG, "┌─── saveNfcConfig() RAW INPUT ───")
        Log.d(TAG, "│ CCCD:   '$cccd' (len=${cccd.length})")
        Log.d(TAG, "│ DOB:    '$dob' (len=${dob.length})")
        Log.d(TAG, "│ Expiry: '$expiry' (len=${expiry.length})")
        Log.d(TAG, "└─────────────────────────────────")

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
            Log.w(TAG, "DOB validation FAILED: '$dob' does not match dd/MM/yyyy")
            valid = false
        } else {
            binding.tilNfcDob.error = null
        }

        if (!DATE_PATTERN.matcher(expiry).matches()) {
            binding.tilNfcExpiry.error = getString(R.string.nfc_config_error_expiry)
            Log.w(TAG, "Expiry validation FAILED: '$expiry' does not match dd/MM/yyyy")
            valid = false
        } else {
            binding.tilNfcExpiry.error = null
        }

        if (!valid) return

        // Convert dd/mm/yyyy → YYMMDD for BAC
        val dobYymmdd = displayToYymmdd(dob)
        val expiryYymmdd = displayToYymmdd(expiry)

        Log.d(TAG, "┌─── BAC KEY DATA (converted) ───")
        Log.d(TAG, "│ CCCD:        '$cccd'")
        Log.d(TAG, "│ DOB YYMMDD:  '$dobYymmdd' (from '$dob')")
        Log.d(TAG, "│ EXP YYMMDD:  '$expiryYymmdd' (from '$expiry')")
        Log.d(TAG, "│ DocNumber:   '${cccd.take(9)}' (first 9 of CCCD)")
        Log.d(TAG, "└─────────────────────────────────")

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

        Log.d(TAG, "┌─── handleNfcTag() BAC DATA ────")
        Log.d(TAG, "│ CCCD:      '${bacData.cccdNumber}'")
        Log.d(TAG, "│ DOB:       '${bacData.dateOfBirth}' (YYMMDD)")
        Log.d(TAG, "│ Expiry:    '${bacData.expiryDate}' (YYMMDD)")
        Log.d(TAG, "│ DocNumber: '${bacData.cccdNumber.take(9)}' (first 9)")
        Log.d(TAG, "└─────────────────────────────────")

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

                Log.d(TAG, "┌─── NFC READ SUCCESS ───────────")
                Log.d(TAG, "│ FullName:   '${chipData.fullName}'")
                Log.d(TAG, "│ CCCD:       '${chipData.cccdNumber}'")
                Log.d(TAG, "│ DOB:        '${chipData.dateOfBirth}' (YYMMDD from chip)")
                Log.d(TAG, "│ Gender:     '${chipData.gender}'")
                Log.d(TAG, "│ Expiry:     '${chipData.expiryDate}'")
                Log.d(TAG, "│ Nationality:'${chipData.nationality}'")
                Log.d(TAG, "│ ChipSerial: '${chipData.chipSerial}'")
                Log.d(TAG, "│ PA Verified: ${chipData.passiveAuthVerified}")
                Log.d(TAG, "│ ChipHash:   '${chipData.chipDataHash}'")
                Log.d(TAG, "└─────────────────────────────────")
                binding.progressNfcRead.visibility = View.GONE
                viewModel.onNfcChipRead(chipData)
            } catch (e: CccdNfcReader.NfcReadException) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar(e.message ?: getString(R.string.enrollment_nfc_error))
            } catch (e: SecurityException) {
                // Passive Authentication failed — chip data was tampered.
                // Surface as a high-visibility warning; do NOT continue enrollment.
                binding.progressNfcRead.visibility = View.GONE
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar(e.message ?: "Cảnh báo: Phát hiện thẻ CCCD không hợp lệ!")
            } catch (e: Exception) {
                binding.progressNfcRead.visibility = View.GONE
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar("Lỗi đọc NFC: ${e.message}")
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
            if (chipData.passiveAuthVerified) getString(R.string.nfc_result_passive_auth_ok)
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
     * Convert ImageProxy (JPEG from ImageCapture) to JPEG bytes for upload.
     * Applies rotation + horizontal mirror for front camera.
     */
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
        if (parts.size != 3) {
            Log.e(TAG, "displayToYymmdd FAILED: '$display' split into ${parts.size} parts (expected 3)")
            return "000000"
        }
        val dd = parts[0]
        val mm = parts[1]
        val yyyy = parts[2]
        val yy = if (yyyy.length == 4) yyyy.substring(2) else yyyy
        val result = "$yy$mm$dd"
        Log.d(TAG, "displayToYymmdd: '$display' → dd='$dd' mm='$mm' yyyy='$yyyy' yy='$yy' → '$result'")
        if (result.length != 6) {
            Log.e(TAG, "displayToYymmdd BAD RESULT: '$result' (len=${result.length}, expected 6)")
        }
        return result
    }

    /** Convert YYMMDD → DD/MM/YYYY for display */
    private fun formatYymmdd(yymmdd: String): String {
        if (yymmdd.length != 6) {
            Log.e(TAG, "formatYymmdd SKIP: '$yymmdd' (len=${yymmdd.length}, expected 6)")
            return yymmdd
        }
        val yy = yymmdd.substring(0, 2).toIntOrNull() ?: return yymmdd
        val mm = yymmdd.substring(2, 4)
        val dd = yymmdd.substring(4, 6)
        val yyyy = if (yy > 50) "19$yy" else "20$yy"
        val result = "$dd/$mm/$yyyy"
        Log.d(TAG, "formatYymmdd: '$yymmdd' → '$result'")
        return result
    }

    // ── Date Auto-Formatter ────────────────────────────────

    /**
     * TextWatcher that auto-inserts '/' separators as user types digits.
     * Turns raw digit input "13052004" into "13/05/2004".
     */
    private class DateTextWatcher(
        private val editText: com.google.android.material.textfield.TextInputEditText
    ) : TextWatcher {
        private var isFormatting = false

        override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
        override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}

        override fun afterTextChanged(s: Editable?) {
            if (isFormatting || s == null) return
            isFormatting = true

            // Strip everything except digits
            val digits = s.toString().replace(Regex("[^0-9]"), "")

            // Rebuild with slashes: dd/mm/yyyy
            val formatted = buildString {
                for (i in digits.indices) {
                    if (i == 2 || i == 4) append('/')
                    if (length >= 10) break  // dd/mm/yyyy = 10 chars max
                    append(digits[i])
                }
            }

            if (formatted != s.toString()) {
                editText.setText(formatted)
                editText.setSelection(formatted.length)
            }

            isFormatting = false
        }
    }
}
