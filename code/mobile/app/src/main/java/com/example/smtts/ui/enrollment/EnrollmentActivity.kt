package com.example.smtts.ui.enrollment

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
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

/**
 * Enrollment Activity — Biometric registration for subjects.
 *
 * Flow:
 * 1. NFC: User taps CCCD card → JMRTD reads chip → sends to server
 * 2. Face: CameraX captures face → uploads to server → InsightFace/ArcFace processes
 * 3. Complete: Both done → server transitions lifecycle ENROLLMENT → DANG_QUAN_LY
 */
class EnrollmentActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "EnrollmentActivity"
    }

    private lateinit var binding: ActivityEnrollmentBinding
    private lateinit var viewModel: EnrollmentViewModel
    private lateinit var tokenManager: TokenManager

    // NFC
    private var nfcAdapter: NfcAdapter? = null
    private val cccdReader = CccdNfcReader()

    // Camera
    private var imageCapture: ImageCapture? = null
    private var cameraStarted = false

    // Permission launcher
    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startCamera()
        } else {
            showSnackbar(getString(R.string.enrollment_camera_permission_denied))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        binding = ActivityEnrollmentBinding.inflate(layoutInflater)
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(binding.rootLayout) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(24, systemBars.top + 24, 24, systemBars.bottom + 24)
            insets
        }

        tokenManager = TokenManager(this)
        ApiClient.init(tokenManager)

        viewModel = ViewModelProvider(
            this,
            EnrollmentViewModel.Factory(tokenManager)
        )[EnrollmentViewModel::class.java]

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        setupUI()
        observeState()
    }

    override fun onResume() {
        super.onResume()
        enableNfcForegroundDispatch()
    }

    override fun onPause() {
        super.onPause()
        disableNfcForegroundDispatch()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
            }
            if (tag != null) {
                handleNfcTag(tag)
            }
        }
    }

    private fun setupUI() {
        binding.btnCaptureFace.setOnClickListener { capturePhoto() }
        binding.btnContinue.setOnClickListener { navigateToMain() }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.uiState.collect { state ->
                        handleUiState(state)
                    }
                }
                launch {
                    viewModel.currentStep.collect { step ->
                        updateStepUI(step)
                    }
                }
                launch {
                    viewModel.nfcDone.collect { done ->
                        if (done) {
                            binding.tvNfcSuccess.visibility = View.VISIBLE
                            binding.tvNfcSuccess.text = getString(R.string.enrollment_nfc_success)
                            binding.tvNfcStatus.visibility = View.GONE
                        }
                    }
                }
                launch {
                    viewModel.faceDone.collect { done ->
                        if (done) {
                            binding.tvFaceSuccess.visibility = View.VISIBLE
                            binding.tvFaceSuccess.text = getString(R.string.enrollment_face_success)
                            binding.cameraPreview.visibility = View.GONE
                            binding.btnCaptureFace.visibility = View.GONE
                        }
                    }
                }
            }
        }
    }

    private fun handleUiState(state: EnrollmentUiState) {
        binding.progressBar.visibility = View.GONE

        when (state) {
            is EnrollmentUiState.Idle -> { }

            is EnrollmentUiState.InProgress -> {
                binding.progressBar.visibility = View.VISIBLE
                binding.btnCaptureFace.isEnabled = false
            }

            is EnrollmentUiState.NfcSuccess -> {
                showSnackbar(state.message)
                // Advance to face capture
                if (hasCameraPermission()) {
                    startCamera()
                } else {
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                }
            }

            is EnrollmentUiState.FaceSuccess -> {
                showSnackbar("${state.message} (chất lượng: ${"%.0f".format(state.qualityScore * 100)}%)")
            }

            is EnrollmentUiState.Complete -> {
                binding.btnContinue.visibility = View.VISIBLE
                showSnackbar(state.message)
            }

            is EnrollmentUiState.Error -> {
                showSnackbar(state.message)
                if (state.step == EnrollmentStep.FACE_CAPTURE) {
                    binding.btnCaptureFace.isEnabled = true
                    binding.btnCaptureFace.text = getString(R.string.enrollment_face_capture_btn)
                }
                viewModel.resetError()
            }
        }
    }

    private fun updateStepUI(step: EnrollmentStep) {
        val nfcActive = step == EnrollmentStep.NFC_SCAN
        val faceActive = step == EnrollmentStep.FACE_CAPTURE || step == EnrollmentStep.COMPLETING

        // Update step indicator visibility
        binding.stepNfcIndicator.alpha = if (nfcActive || viewModel.nfcDone.value) 1.0f else 0.4f
        binding.stepFaceIndicator.alpha = if (faceActive || viewModel.faceDone.value) 1.0f else 0.4f

        // Show/hide sections
        binding.cardNfc.alpha = if (nfcActive || viewModel.nfcDone.value) 1.0f else 0.5f
        binding.cardFace.alpha = if (faceActive || viewModel.faceDone.value) 1.0f else 0.5f

        if (faceActive && !cameraStarted) {
            binding.btnCaptureFace.isEnabled = true
            if (hasCameraPermission()) {
                startCamera()
            } else {
                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }
        }
    }

    // ── NFC Handling ──────────────────────────────────────

    private fun enableNfcForegroundDispatch() {
        val adapter = nfcAdapter ?: return
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_MUTABLE
        )
        val techFilter = IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        val techList = arrayOf(arrayOf(IsoDep::class.java.name))
        adapter.enableForegroundDispatch(this, pendingIntent, arrayOf(techFilter), techList)
    }

    private fun disableNfcForegroundDispatch() {
        nfcAdapter?.disableForegroundDispatch(this)
    }

    private fun handleNfcTag(tag: Tag) {
        if (viewModel.nfcDone.value) return // Already enrolled

        binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_reading)

        // Get BAC key data — CCCD was used as username during activation
        val cccdNumber = tokenManager.getUser()?.username ?: run {
            showSnackbar("Không tìm thấy thông tin CCCD")
            return
        }

        lifecycleScope.launch {
            try {
                val chipData = withContext(Dispatchers.IO) {
                    cccdReader.readChip(
                        tag = tag,
                        cccdNumber = cccdNumber,
                        dateOfBirth = "000000", // Will be set from subject data in production
                        expiryDate = "000000"   // Will be set from subject data in production
                    )
                }

                Log.d(TAG, "NFC read success: ${chipData.fullName}")
                viewModel.submitNfcData(chipData)
            } catch (e: CccdNfcReader.NfcReadException) {
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar(e.message ?: getString(R.string.enrollment_nfc_error))
            } catch (e: Exception) {
                binding.tvNfcStatus.text = getString(R.string.enrollment_nfc_waiting)
                showSnackbar("Lỗi đọc NFC: ${e.message}")
            }
        }
    }

    // ── Camera / Face Capture ─────────────────────────────

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
                showSnackbar("Không thể khởi động camera: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun capturePhoto() {
        val capture = imageCapture ?: run {
            showSnackbar("Camera chưa sẵn sàng")
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
                            showSnackbar("Không thể xử lý ảnh. Vui lòng thử lại.")
                            binding.btnCaptureFace.isEnabled = true
                            binding.btnCaptureFace.text =
                                getString(R.string.enrollment_face_capture_btn)
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    Log.e(TAG, "Photo capture failed", exception)
                    showSnackbar("Chụp ảnh thất bại: ${exception.message}")
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
}
