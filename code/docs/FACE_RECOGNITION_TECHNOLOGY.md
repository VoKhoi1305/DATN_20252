# Công nghệ nhận diện khuôn mặt trong hệ thống SMTTS

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Mô hình AI được sử dụng](#2-mô-hình-ai-được-sử-dụng)
3. [Pipeline xử lý khuôn mặt](#3-pipeline-xử-lý-khuôn-mặt)
4. [Kiến trúc triển khai](#4-kiến-trúc-triển-khai)
5. [Chống giả mạo (Anti-Spoofing)](#5-chống-giả-mạo-anti-spoofing)
6. [Đánh giá chất lượng ảnh](#6-đánh-giá-chất-lượng-ảnh)
7. [So khớp khuôn mặt (Face Verification)](#7-so-khớp-khuôn-mặt-face-verification)
8. [Luồng xử lý trong SMTTS](#8-luồng-xử-lý-trong-smtts)
9. [API Endpoints](#9-api-endpoints)
10. [Bảo mật và lưu trữ](#10-bảo-mật-và-lưu-trữ)
11. [Cấu hình và ngưỡng](#11-cấu-hình-và-ngưỡng)
12. [So sánh với các giải pháp khác](#12-so-sánh-với-các-giải-pháp-khác)

---

## 1. Tổng quan

### Vai trò trong SMTTS

Nhận diện khuôn mặt là **yếu tố xác thực thứ hai** trong quy trình 4 yếu tố. Mục đích:
- **Enrollment**: Thu thập embedding khuôn mặt khi đăng ký
- **Check-in**: So khớp khuôn mặt với mẫu đã đăng ký để xác minh danh tính
- **Liveness**: Phát hiện ảnh giả (in ấn, màn hình) để chống gian lận

### Tại sao xử lý trên server?

SMTTS chọn kiến trúc **server-side inference** (xử lý AI trên server) thay vì on-device:

| Tiêu chí | On-Device (TFLite) | Server-Side (InsightFace) |
|-----------|-------------------|---------------------------|
| **Độ chính xác** | ~95-97% (mô hình nhỏ) | **99.83% trên LFW** |
| **Nhất quán** | Phụ thuộc phần cứng thiết bị | **Giống nhau mọi thiết bị** |
| **Cập nhật mô hình** | Cần phát hành app mới | **Cập nhật server, không cần app** |
| **Bảo vệ mô hình** | Model weights trên thiết bị | **Weights chỉ trên server** |
| **Kích thước app** | +50-100MB model files | **Không tăng kích thước app** |
| **Yêu cầu mạng** | Offline capable | Cần kết nối internet |
| **Tốc độ** | ~100-200ms trên device | ~30ms inference + network latency |

**Kết luận**: Với yêu cầu cao về độ chính xác và tính nhất quán trong hệ thống quản lý đối tượng, server-side là lựa chọn phù hợp.

---

## 2. Mô hình AI được sử dụng

### InsightFace — buffalo_l Model Pack

SMTTS sử dụng **InsightFace** với model pack **buffalo_l**, bao gồm nhiều mô hình chuyên biệt:

```
buffalo_l Model Pack
├── det_10g.onnx          ← RetinaFace (phát hiện khuôn mặt)
├── w600k_r50.onnx        ← ArcFace-R100 (nhận diện khuôn mặt)
├── 1k3d68.onnx           ← 3D Face Alignment (68 landmarks)
├── 2d106det.onnx         ← 2D Landmark Detection
├── genderage.onnx        ← Gender + Age Estimation
└── model info             ← Metadata
```

SMTTS chỉ sử dụng 2 module:
- **detection** (RetinaFace): Phát hiện khuôn mặt
- **recognition** (ArcFace-R100): Trích xuất embedding

### 2.1. RetinaFace — Phát hiện khuôn mặt

| Thuộc tính | Giá trị |
|-----------|---------|
| Kiến trúc | Single-stage anchor-free detector |
| Input | Ảnh BGR bất kỳ kích thước (resize về 640x640) |
| Output | Bounding boxes + 5-point landmarks + confidence scores |
| Đặc điểm | Xử lý tốt: nhiều góc nghiêng, che khuất một phần, khuôn mặt nhỏ |
| Tốc độ | ~10-15ms trên CPU |

**Cách hoạt động**:

```
Input Image (640x640)
        │
        ▼
┌──────────────────────┐
│   Feature Pyramid    │   Trích xuất đặc trưng ở nhiều scale
│   Network (FPN)      │   (nhận diện cả mặt nhỏ lẫn lớn)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Classification     │   Mỗi anchor point: có mặt hay không?
│   + Regression       │   Nếu có: tọa độ bbox + landmarks
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   NMS                │   Non-Maximum Suppression
│   (Non-Max Suppress) │   Loại bỏ bbox trùng lặp
└──────────┬───────────┘
           │
           ▼
Output: [{
    bbox: {x1, y1, x2, y2},    // Tọa độ bounding box
    det_score: 0.99,             // Độ tin cậy phát hiện
    landmarks: [[x,y] × 5]      // 5 điểm: 2 mắt, mũi, 2 khóe miệng
}]
```

### 2.2. ArcFace-R100 — Nhận diện khuôn mặt

| Thuộc tính | Giá trị |
|-----------|---------|
| Kiến trúc | ResNet-100 backbone |
| Loss Function | **Additive Angular Margin Loss (ArcFace)** |
| Training Data | MS1MV3 (~5.8M images, 93K identities) |
| Output | **512-dimensional L2-normalized embedding** |
| Độ chính xác | **99.83% trên LFW**, 98.28% trên CFP-FP |
| Inference | ONNX Runtime, ~15-20ms trên CPU |

#### ArcFace Loss — Tại sao chọn ArcFace?

ArcFace (Additive Angular Margin Loss) là hàm loss tiên tiến nhất cho bài toán face recognition:

```
Các hàm loss trong face recognition (tiến hóa):

1. Softmax Loss (cơ bản)
   └── Chỉ phân loại, không tối ưu khoảng cách giữa các lớp
   └── Embedding không đủ phân biệt

2. Center Loss (2016)
   └── Thêm ràng buộc: embedding cùng người phải gần tâm
   └── Cải thiện intra-class compactness

3. SphereFace / A-Softmax (2017)
   └── Multiplicative angular margin
   └── Khó hội tụ khi training

4. CosFace / AM-Softmax (2018)
   └── Additive cosine margin
   └── Ổn định hơn SphereFace

5. ArcFace (2019) ★ Được SMTTS sử dụng
   └── Additive Angular Margin trong không gian góc
   └── Trực quan hình học: tăng khoảng cách góc giữa các lớp
   └── Training ổn định, hiệu quả cao nhất
```

**Công thức ArcFace Loss**:

```
L = -log( e^(s·cos(θ_yi + m)) / (e^(s·cos(θ_yi + m)) + Σ e^(s·cos(θ_j))) )

Trong đó:
  θ_yi = góc giữa feature vector và weight vector của lớp đúng
  m    = angular margin (thường = 0.5 radian ≈ 28.6°)
  s    = scale factor (thường = 64)
```

**Giải thích trực quan**:

```
Không gian embedding (hypersphere):

      Softmax Loss:                    ArcFace Loss:
      (embedding lẫn lộn)              (embedding tách biệt rõ ràng)

         ○ ○                              ○ ○
        ○ ● ○                            ○ ○
       ● ○ ● ○                                    ● ●
        ○ ● ○                                    ● ●
         ● ○
                                    margin (khoảng cách góc)
      ○ = Người A                   ←─────────────────────→
      ● = Người B                   Embedding cùng người: gần nhau
                                    Embedding khác người: xa nhau
```

#### Embedding 512-dimensional

Mỗi khuôn mặt được biểu diễn bằng một vector 512 chiều, đã được **L2-normalized** (nằm trên hypersphere đơn vị):

```
Input: Ảnh khuôn mặt đã align (112x112 RGB)
         │
         ▼
┌─────────────────────┐
│   ResNet-100        │    100 layers deep
│   (Backbone)        │    Trích xuất đặc trưng bậc cao
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Global Average    │
│   Pooling + FC      │    Nén thành vector 512-dim
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   L2 Normalization  │    ||embedding|| = 1
└─────────┬───────────┘
          │
          ▼
Output: [0.0234, -0.0156, 0.0412, ..., 0.0089]
         ←──────── 512 giá trị float ────────→

Tính chất:
  - Mỗi người có embedding gần như không đổi (bất kể ánh sáng, góc)
  - Hai embedding cùng người: cosine similarity > 0.45
  - Hai embedding khác người: cosine similarity < 0.30
  - Đã normalize → dot product = cosine similarity
```

---

## 3. Pipeline xử lý khuôn mặt

### Tổng quan pipeline

```
Ảnh gốc (JPEG/PNG)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. DECODE IMAGE                                                  │
│     PIL.Image.open() → RGB → cv2.cvtColor() → BGR (OpenCV)      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. FACE DETECTION (RetinaFace)                                   │
│     InsightFace.get(image) → danh sách faces                     │
│     Mỗi face: bbox, det_score, landmarks, embedding              │
│                                                                   │
│     Kiểm tra:                                                     │
│     ✗ Không phát hiện khuôn mặt → ValueError                     │
│     ✗ Nhiều hơn 1 khuôn mặt (enrollment) → ValueError            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. QUALITY ASSESSMENT                                            │
│     Đánh giá chất lượng ảnh khuôn mặt:                           │
│                                                                   │
│     a) Face Size: min(width, height) ≥ 80px                      │
│     b) Sharpness: Laplacian variance ≥ threshold                 │
│     c) Det Score: Confidence from RetinaFace                      │
│     d) Combined Quality: 0.4×det + 0.35×sharp + 0.25×size ≥ 0.4 │
│                                                                   │
│     ✗ Mặt quá nhỏ (< 80px) → "Move closer to camera"            │
│     ✗ Quality quá thấp (< 0.4) → "Ensure good lighting"         │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. LIVENESS DETECTION (Anti-Spoofing)                            │
│     3 phép phân tích tần số + màu sắc:                            │
│                                                                   │
│     a) Laplacian Variance (50%): vi kết cấu da                   │
│     b) DCT High-Frequency (30%): năng lượng tần số cao           │
│     c) Color Saturation Std (20%): biến thiên bão hòa màu        │
│                                                                   │
│     Combined: 0.5×lap + 0.3×hf + 0.2×sat ≥ 0.5                  │
│     ✗ Score < 0.5 → "Phát hiện khuôn mặt không thật"            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. EMBEDDING EXTRACTION (ArcFace-R100)                           │
│     Face alignment (5-point landmarks) → crop 112×112             │
│     → ResNet-100 → 512-dim vector → L2 normalize                 │
│                                                                   │
│     Output: [0.0234, -0.0156, ..., 0.0089] (512 floats)          │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
Kết quả: {
    embedding: number[512],
    embedding_version: "arcface_r100",
    quality_score: 0.82,
    det_score: 0.99,
    face_size: 156,
    liveness: { is_real: true, score: 0.73 }
}
```

---

## 4. Kiến trúc triển khai

### Microservice Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────────────┐
│   MOBILE APP     │     │   NestJS BACKEND   │     │  FACE RECOGNITION        │
│   (Android)      │     │   (Orchestrator)   │     │  SERVICE (Python)        │
│                  │     │                    │     │                          │
│  CameraX capture ├────▶│  POST /enrollment  ├────▶│  FastAPI + InsightFace   │
│  → JPEG bytes    │     │  /face             │     │  + ArcFace-R100          │
│                  │     │                    │     │  + ONNX Runtime          │
│                  │     │  Nhận embedding    │◀────│                          │
│                  │     │  → Lưu biometric   │     │  POST /enroll            │
│                  │     │    DB              │     │  POST /verify-image      │
│                  │◀────│  Trả kết quả      │     │  POST /detect            │
│                  │     │                    │     │  POST /liveness          │
└──────────────────┘     └───────────┬────────┘     └──────────────────────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │  BIOMETRIC DB      │
                          │  (PostgreSQL)      │
                          │                    │
                          │  face_templates:   │
                          │  - embedding BYTEA │
                          │  - quality_score   │
                          │  - is_active       │
                          └────────────────────┘
```

### Docker Deployment

```yaml
# Face Recognition Service
face-recognition:
  image: python:3.11-slim-bookworm
  dependencies:
    - FastAPI 0.115.6
    - InsightFace 0.7.3
    - ONNX Runtime 1.20.1
    - OpenCV Headless 4.10
  ports: 8000
  healthcheck:
    start_period: 120s     # Thời gian load model (~60s)
  resources:
    memory: ~2GB (model weights)
    cpu: inference ~30ms/face
```

### Quy trình khởi động

```
Container Start
    │
    ▼
1. Load InsightFace models (buffalo_l)
   ├── det_10g.onnx (~15MB)        → RAM
   ├── w600k_r50.onnx (~250MB)     → RAM
   └── Thời gian: ~30-60 giây
    │
    ▼
2. ONNX Runtime khởi tạo
   ├── CPUExecutionProvider
   └── Tối ưu graph cho inference
    │
    ▼
3. FastAPI sẵn sàng
   └── Healthcheck: GET /health → {"model_loaded": true}
```

---

## 5. Chống giả mạo (Anti-Spoofing)

### Tại sao cần Anti-Spoofing?

Các kiểu tấn công phổ biến:

| Kiểu tấn công | Mô tả | Mức độ |
|---------------|--------|--------|
| **Print Attack** | In ảnh khuôn mặt ra giấy, đưa trước camera | Phổ biến |
| **Screen Replay** | Hiển thị ảnh/video trên màn hình điện thoại/tablet | Phổ biến |
| **3D Mask** | Mặt nạ 3D in từ ảnh | Hiếm, tinh vi |
| **Deepfake Video** | Video giả tạo bằng AI | Hiếm, rất tinh vi |

### Phương pháp phát hiện trong SMTTS

SMTTS sử dụng **phân tích tần số và kết cấu** (Texture-based Frequency Analysis) — một phương pháp passive liveness (không yêu cầu người dùng thực hiện hành động):

#### 5.1. Laplacian Variance (Trọng số: 50%)

Đo **độ sắc nét vi mô** của khuôn mặt. Khuôn mặt thật có kết cấu da phong phú (lỗ chân lông, nếp nhăn vi mô), trong khi ảnh in/màn hình bị mất chi tiết.

```
Thuật toán:
1. Crop vùng khuôn mặt từ bbox
2. Chuyển sang grayscale
3. Áp dụng Laplacian operator (đạo hàm bậc 2):
   L(x,y) = ∂²I/∂x² + ∂²I/∂y²
4. Tính variance: var(L)
5. Normalize: lap_score = min(1.0, variance / 800.0)

Kết quả điển hình:
  Khuôn mặt thật:  variance = 500-2000+  → score = 0.6-1.0
  Ảnh in (giấy):   variance = 50-200     → score = 0.06-0.25
  Ảnh màn hình:    variance = 100-400    → score = 0.12-0.50
```

#### 5.2. DCT High-Frequency Energy (Trọng số: 30%)

Phân tích **phổ tần số** của ảnh khuôn mặt. Khuôn mặt thật có thành phần tần số cao phong phú hơn.

```
Thuật toán:
1. Resize vùng mặt về 128×128 (chuẩn hóa kích thước)
2. Áp dụng Discrete Cosine Transform (DCT)
3. Tính tỷ lệ năng lượng tần số cao:
   hf_energy = Σ|DCT[h/2:, w/2:]| / Σ|DCT| + ε
4. Normalize: hf_score = min(1.0, hf_energy / 0.25)

                    DCT Matrix
              ┌─────────┬─────────┐
              │   Low   │  Medium │
              │  Freq   │  Freq   │
              ├─────────┼─────────┤
              │ Medium  │  HIGH   │ ← Vùng tính năng lượng
              │  Freq   │  FREQ   │    tần số cao
              └─────────┴─────────┘

Kết quả điển hình:
  Khuôn mặt thật:  hf_energy = 0.15-0.35  → score = 0.6-1.0
  Ảnh giả:         hf_energy = 0.05-0.15  → score = 0.2-0.6
```

#### 5.3. Color Saturation Variance (Trọng số: 20%)

Phân tích **biến thiên màu sắc**. Màn hình có dải màu hạn chế, ảnh in mất sắc tố da tự nhiên.

```
Thuật toán:
1. Chuyển vùng mặt sang HSV color space
2. Tính standard deviation kênh Saturation:
   sat_std = std(HSV[:, :, 1])
3. Normalize: sat_score = min(1.0, sat_std / 40.0)

Kết quả điển hình:
  Khuôn mặt thật:  sat_std = 30-50+    → score = 0.75-1.0
  Màn hình:        sat_std = 15-25     → score = 0.37-0.62
  Ảnh in:          sat_std = 10-30     → score = 0.25-0.75
```

#### Công thức tổng hợp

```
liveness_score = 0.5 × lap_score + 0.3 × hf_score + 0.2 × sat_score

Ngưỡng quyết định: liveness_score ≥ 0.5 → REAL (thật)
                    liveness_score < 0.5 → FAKE (giả)

Ví dụ:
  Mặt thật: 0.5×0.8 + 0.3×0.7 + 0.2×0.9 = 0.79 ✓ REAL
  Ảnh in:   0.5×0.2 + 0.3×0.3 + 0.2×0.4 = 0.27 ✗ FAKE
  Màn hình: 0.5×0.4 + 0.3×0.4 + 0.2×0.5 = 0.42 ✗ FAKE
```

### Hạn chế và hướng phát triển

| Phương pháp hiện tại | Hạn chế | Giải pháp nâng cấp |
|----------------------|---------|---------------------|
| Texture-based | Có thể bị qua mặt bởi ảnh chất lượng rất cao | CNN-based anti-spoofing |
| Passive liveness | Không chống được 3D mask | Active liveness (yêu cầu nháy mắt, quay đầu) |
| Single-frame | Chỉ phân tích 1 ảnh | Video-based (phân tích nhiều frame) |

Các mô hình nâng cấp đề xuất:
- **Silent-Face-Anti-Spoofing** (MinivisionAI) — Patch-based CNN, nhẹ, chính xác
- **FAS from InsightFace** — CNN chuyên dụng cho anti-spoofing
- **DepthNet** — Ước lượng depth map để phân biệt 2D/3D

---

## 6. Đánh giá chất lượng ảnh

### Các chỉ số đánh giá

```
Quality Assessment Pipeline:
────────────────────────────

1. Detection Confidence (40%)
   └── RetinaFace det_score
   └── Cao = phát hiện rõ ràng, không mơ hồ
   └── Thường > 0.9 cho ảnh chính diện tốt

2. Sharpness (35%)
   └── Laplacian variance trên vùng mặt
   └── Cao = ảnh nét, chi tiết tốt
   └── Normalize: min(1.0, lap_var / 500)

3. Face Size (25%)
   └── min(face_width, face_height) / 200
   └── Cao = mặt chiếm tỷ lệ đủ lớn trong ảnh
   └── Yêu cầu tối thiểu: 80px

Combined Quality Score:
  quality = 0.4 × det_score + 0.35 × sharpness + 0.25 × size_score

Ngưỡng: quality ≥ 0.4 → Chấp nhận
```

### Nguyên nhân chất lượng thấp

| Vấn đề | Biểu hiện | Hướng dẫn người dùng |
|--------|-----------|---------------------|
| Thiếu sáng | Laplacian thấp, det_score thấp | "Đảm bảo ánh sáng tốt" |
| Mặt quá nhỏ | face_size < 80px | "Di chuyển gần camera hơn" |
| Mờ/rung | Laplacian rất thấp | "Giữ yên điện thoại" |
| Không chính diện | Det_score thấp | "Nhìn thẳng vào camera" |
| Nhiều khuôn mặt | > 1 face detected | "Chỉ nên có 1 người trong ảnh" |

---

## 7. So khớp khuôn mặt (Face Verification)

### Cosine Similarity

ArcFace embedding đã được L2-normalized, nên **dot product = cosine similarity**:

```
Công thức:
  similarity = embedding1 · embedding2 = Σ(e1[i] × e2[i]), i=0..511

  Vì ||e1|| = ||e2|| = 1 (L2-normalized):
  cos(θ) = (e1 · e2) / (||e1|| × ||e2||) = e1 · e2

Phạm vi: -1.0 đến 1.0
  1.0  = hoàn toàn giống nhau (cùng ảnh)
  0.45+ = khớp (cùng người, khác ảnh)
  0.30  = vùng không chắc chắn
  0.0  = hoàn toàn khác nhau
  -1.0 = đối lập hoàn toàn (hiếm gặp)
```

### Ngưỡng quyết định

```
          similarity
    -1.0         0.0         0.30        0.45        1.0
     |───────────|───────────|────────────|───────────|
     │    Khác người rõ ràng │  Uncertain │ Cùng người│
     │                       │            │           │

Ngưỡng mặc định SMTTS: 0.45

Phân tích ngưỡng:
  ┌──────────┬────────────────────────────────────────────┐
  │ Ngưỡng   │ Ý nghĩa                                   │
  ├──────────┼────────────────────────────────────────────┤
  │ 0.35     │ Lỏng: ít false reject, nhiều false accept  │
  │ 0.40     │ Trung bình: cân bằng                       │
  │ 0.45 ★   │ Chặt vừa: phù hợp 1:1 verification        │
  │ 0.50     │ Chặt: rất ít false accept                  │
  │ 0.55+    │ Rất chặt: có thể reject người đúng         │
  └──────────┴────────────────────────────────────────────┘
```

### Code so khớp

```python
# face_engine.py
def verify(self, embedding1, embedding2, threshold=0.45):
    vec1 = np.array(embedding1, dtype=np.float32)
    vec2 = np.array(embedding2, dtype=np.float32)

    # Dot product = cosine similarity (đã L2-normalized)
    similarity = float(np.dot(vec1, vec2))

    return {
        "match": similarity >= threshold,
        "similarity": round(similarity, 6),
        "threshold": threshold,
    }
```

---

## 8. Luồng xử lý trong SMTTS

### 8.1. Enrollment (Đăng ký khuôn mặt)

```
    MOBILE APP                    NestJS BACKEND              FACE SERVICE          BIOMETRIC DB
        │                              │                          │                      │
   1. CameraX capture                 │                          │                      │
      ảnh khuôn mặt                   │                          │                      │
        │                              │                          │                      │
   2. YUV→NV21→JPEG                   │                          │                      │
      + rotation                       │                          │                      │
        │                              │                          │                      │
   3.──POST /enrollment/face─────────▶│                          │                      │
      │ multipart: file=image.jpg     │                          │                      │
        │                              │                          │                      │
        │                       4.──POST /enroll──────────────▶  │                      │
        │                         │ multipart: file=image.jpg    │                      │
        │                              │                          │                      │
        │                              │                    5. Decode image              │
        │                              │                       (PIL→RGB→BGR)             │
        │                              │                          │                      │
        │                              │                    6. RetinaFace detect         │
        │                              │                       → 1 face found            │
        │                              │                          │                      │
        │                              │                    7. Quality check             │
        │                              │                       → score=0.82 ✓            │
        │                              │                          │                      │
        │                              │                    8. Liveness check            │
        │                              │                       → score=0.73 ✓ REAL       │
        │                              │                          │                      │
        │                              │                    9. ArcFace embedding         │
        │                              │                       → 512-dim vector          │
        │                              │                          │                      │
        │                       10.◀── JSON response ────────────│                      │
        │                         │ embedding[512]                │                      │
        │                         │ quality_score: 0.82           │                      │
        │                         │ liveness: {is_real: true}     │                      │
        │                              │                          │                      │
        │                       11. Validate liveness             │                      │
        │                           (is_real == true?)            │                      │
        │                              │                          │                      │
        │                       12. SHA-256(imageBuffer)          │                      │
        │                           → sourceImageHash             │                      │
        │                              │                          │                      │
        │                       13. Float32Array → Buffer         │                      │
        │                           (512 floats → 2048 bytes)     │                      │
        │                              │                          │                      │
        │                       14.──INSERT face_templates────────────────────────────▶  │
        │                         │ subject_id                    │                      │
        │                         │ embedding (BYTEA, 2048B)      │                      │
        │                         │ embedding_version: arcface_r100│                     │
        │                         │ source_image_hash             │                      │
        │                         │ quality_score: 0.82           │                      │
        │                         │ is_active: true               │                      │
        │                              │                          │                      │
   ◀───── 201 Created ────────────────│                          │                      │
     │ faceTemplateId                  │                          │                      │
     │ qualityScore: 0.82             │                          │                      │
     │ livenessScore: 0.73            │                          │                      │
```

### 8.2. Check-in (So khớp khuôn mặt)

```
    MOBILE APP                    NestJS BACKEND              FACE SERVICE          BIOMETRIC DB
        │                              │                          │                      │
   1. CameraX capture                 │                          │                      │
        │                              │                          │                      │
   2.──POST /checkin─────────────────▶│                          │                      │
      │ file: face_image.jpg           │                          │                      │
      │ nfcChipHash: abc...           │                          │                      │
        │                              │                          │                      │
        │                       3.──SELECT face_templates────────────────────────────▶   │
        │                         │ WHERE subject_id = ?          │                      │
        │                         │ AND is_active = true          │               ◀──────│
        │                              │                          │                      │
        │                       4. Buffer → Float32Array          │                      │
        │                          (2048 bytes → 512 floats)      │                      │
        │                              │                          │                      │
        │                       5.──POST /verify-image─────────▶ │                      │
        │                         │ file: face_image.jpg          │                      │
        │                         │ stored_embedding: [512]       │                      │
        │                         │ threshold: 0.45               │                      │
        │                              │                          │                      │
        │                              │                    6. Extract new embedding     │
        │                              │                    7. Cosine similarity         │
        │                              │                       new_emb · stored_emb      │
        │                              │                       = 0.847                   │
        │                              │                          │                      │
        │                       8.◀── {match: true, sim: 0.847} ─│                      │
        │                              │                          │                      │
        │                       9.──INSERT biometric_logs─────────────────────────────▶  │
        │                         │ face_result: MATCH            │                      │
        │                         │ face_match_score: 0.847       │                      │
        │                         │ liveness_result: PASS         │                      │
        │                              │                          │                      │
   ◀───── Check-in success ───────────│                          │                      │
```

---

## 9. API Endpoints

### Face Recognition Service (Python FastAPI, port 8000)

| Method | Endpoint | Mô tả | Input | Output |
|--------|----------|-------|-------|--------|
| `GET` | `/health` | Kiểm tra service + model status | — | `{status, model_loaded, det_model, embedding_dim}` |
| `POST` | `/detect` | Phát hiện tất cả khuôn mặt | `file` (image) | `{faces_found, faces[{bbox, det_score, quality}]}` |
| `POST` | `/embed` | Trích xuất embedding từ 1 mặt | `file` (image) | `{embedding[512], quality_score, det_score}` |
| `POST` | `/verify` | So khớp 2 embedding | `embedding1, embedding2, threshold` | `{match, similarity, threshold}` |
| `POST` | `/liveness` | Kiểm tra chống giả mạo | `file` (image) | `{is_real, liveness_score, detail}` |
| `POST` | `/enroll` | Enrollment: detect+quality+liveness+embed | `file` (image) | `{embedding, quality, liveness, ...}` |
| `POST` | `/verify-image` | So khớp ảnh mới với embedding đã lưu | `file, stored_embedding, threshold` | `{match, similarity}` |

### NestJS Backend Enrollment API (port 3001)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/v1/enrollment/status` | Kiểm tra tiến trình enrollment |
| `POST` | `/api/v1/enrollment/face` | Upload ảnh khuôn mặt cho enrollment |
| `POST` | `/api/v1/enrollment/nfc` | Gửi dữ liệu NFC chip |
| `POST` | `/api/v1/enrollment/complete` | Hoàn tất enrollment |

---

## 10. Bảo mật và lưu trữ

### Embedding Storage

```
Quy trình lưu trữ:
1. Python service trả về: number[512] (JSON array)
2. NestJS chuyển đổi: Float32Array → Buffer (2048 bytes)
3. PostgreSQL lưu: BYTEA column (binary)

Quy trình đọc:
1. PostgreSQL đọc: Buffer (BYTEA)
2. NestJS chuyển đổi: Buffer → Float32Array → number[512]
3. Gửi cho Python service để so khớp
```

### Database Schema (Biometric DB — tách biệt theo SBR-18)

```sql
-- Bảng face_templates
CREATE TABLE face_templates (
  id                UUID PRIMARY KEY,
  subject_id        UUID NOT NULL,          -- Liên kết với main DB
  embedding         BYTEA NOT NULL,         -- 512 × 4 bytes = 2048 bytes
  embedding_version VARCHAR(20) NOT NULL,   -- "arcface_r100"
  source_image_hash VARCHAR(64) NOT NULL,   -- SHA-256 hash ảnh gốc
  quality_score     DECIMAL(5,2),           -- Điểm chất lượng
  enrolled_at       TIMESTAMPTZ NOT NULL,
  re_enrolled_at    TIMESTAMPTZ,            -- Nếu đăng ký lại
  expires_at        TIMESTAMPTZ,            -- Hạn sử dụng embedding
  is_active         BOOLEAN DEFAULT true,   -- Soft deactivate
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
);

-- Unique constraint: chỉ 1 template active per subject
CREATE UNIQUE INDEX idx_face_subject
  ON face_templates(subject_id) WHERE is_active = true;
```

### Không lưu trữ ảnh gốc

SMTTS **KHÔNG** lưu ảnh khuôn mặt gốc trên server:

| Dữ liệu | Lưu trữ? | Lý do |
|----------|----------|-------|
| Ảnh gốc (JPEG) | **KHÔNG** | Rủi ro rò rỉ hình ảnh cá nhân |
| Embedding (512-dim) | **CÓ** (BYTEA) | Không thể khôi phục thành ảnh |
| Source image hash | **CÓ** (SHA-256) | Audit trail, không phải ảnh |
| Quality score | **CÓ** | Đánh giá chất lượng enrollment |

> **Lưu ý quan trọng**: Embedding vector không thể đảo ngược thành ảnh khuôn mặt (one-way transformation), nên việc lưu trữ embedding an toàn hơn nhiều so với lưu ảnh gốc.

---

## 11. Cấu hình và ngưỡng

### Tham số cấu hình (Environment Variables)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `FACE_DET_MODEL` | `buffalo_l` | Model pack InsightFace |
| `FACE_DET_SIZE_W` | `640` | Chiều rộng ảnh input detection |
| `FACE_DET_SIZE_H` | `640` | Chiều cao ảnh input detection |
| `FACE_FACE_SCORE_THRESHOLD` | `0.5` | Ngưỡng confidence cho face detection |
| `FACE_MIN_FACE_SIZE` | `80` | Kích thước tối thiểu khuôn mặt (px) |
| `FACE_MIN_QUALITY_SCORE` | `0.4` | Điểm chất lượng tối thiểu |
| `FACE_DEFAULT_MATCH_THRESHOLD` | `0.45` | Ngưỡng cosine similarity cho matching |
| `FACE_LIVENESS_THRESHOLD` | `0.5` | Ngưỡng liveness score |
| `FACE_ENABLE_LIVENESS` | `true` | Bật/tắt kiểm tra liveness |
| `FACE_MAX_IMAGE_SIZE_MB` | `10` | Kích thước ảnh tối đa (MB) |
| `FACE_MAX_FACES_PER_IMAGE` | `1` | Số mặt tối đa (enrollment = 1) |
| `FACE_SERVICE_URL` | `http://localhost:8000` | URL Face Recognition service |

---

## 12. So sánh với các giải pháp khác

### So sánh mô hình nhận diện khuôn mặt

| Mô hình | Accuracy (LFW) | Embedding Dim | Tốc độ (CPU) | Kích thước | Ghi chú |
|---------|----------------|---------------|---------------|-----------|---------|
| **ArcFace-R100** ★ | **99.83%** | 512 | ~20ms | ~250MB | Được SMTTS sử dụng |
| ArcFace-R50 | 99.77% | 512 | ~10ms | ~150MB | Nhẹ hơn, hơi kém chính xác |
| MobileFaceNet | 99.28% | 128 | ~5ms | ~10MB | Cho mobile on-device |
| FaceNet (Google) | 99.63% | 128 | ~15ms | ~90MB | Triplet loss, cũ hơn |
| DeepFace (Meta) | 97.35% | 4096 | ~50ms | ~500MB | Embedding quá lớn |
| dlib face_recognition | 99.38% | 128 | ~30ms | ~23MB | Dễ dùng, kém hơn |

### Tại sao chọn ArcFace-R100?

1. **Chính xác nhất** (99.83% LFW) — quan trọng cho hệ thống quản lý
2. **Embedding 512-dim** — cân bằng giữa độ chính xác và kích thước lưu trữ
3. **InsightFace ecosystem** — bao gồm cả detection, recognition, anti-spoofing
4. **ONNX Runtime** — inference nhanh, cross-platform
5. **Đã được benchmark** trên MegaFace, IJB-B, CFP-FP — không chỉ LFW

### File liên quan trong codebase

| File | Vai trò |
|------|---------|
| `face-recognition/Dockerfile` | Docker build cho face service |
| `face-recognition/requirements.txt` | Python dependencies |
| `face-recognition/app/config.py` | Cấu hình ngưỡng và tham số |
| `face-recognition/app/face_engine.py` | Core engine: detect, embed, verify, liveness |
| `face-recognition/app/main.py` | FastAPI endpoints |
| `face-recognition/app/models.py` | Pydantic response models |
| `backend/.../enrollment/face-recognition.client.ts` | NestJS HTTP client gọi face service |
| `backend/.../enrollment/enrollment.service.ts` | Logic enrollment khuôn mặt |
| `backend/.../biometric/entities/face-template.entity.ts` | Entity lưu embedding |
| `backend/.../biometric/biometric.service.ts` | Lưu/đọc embedding từ DB |
| `mobile/.../ui/enrollment/EnrollmentActivity.kt` | CameraX capture trên Android |
