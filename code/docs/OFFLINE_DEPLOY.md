# SMTTS — Triển khai Offline (Build trên Dev → Chuyển sang Server)

> **Khi nào dùng cách này?**
> - Server VPS yếu (≤ 4 GB RAM) — không build nổi face-recognition (cần ~3 GB RAM lúc compile)
> - Chưa setup CI/CD nhưng không muốn cài Node + Python + build deps trên server production
> - Server không có internet ổn định để pull image
> - Muốn test trên máy local trước khi chuyển lên server
>
> **Đã build sẵn trên máy bạn:** ✅ 3 image đã có trong `code/docker/dist/smtts-images-latest.tar.gz` (~1.1 GB)

---

## Tóm tắt 3 bước

```
┌──────────────┐  scp tar.gz  ┌──────────┐  docker compose up  ┌──────────┐
│  DEV (build) ├─────────────►│  SERVER  ├────────────────────►│  RUNNING │
└──────────────┘   ~1.1 GB    └──────────┘     (instant)       └──────────┘
```

| Bước | Ở đâu | Lệnh | Thời gian |
|------|-------|------|-----------|
| 1. Build + save | Dev (Windows) | `bash code/docker/scripts/save-images.sh` | ~15 phút (đã chạy xong ✅) |
| 2. Transfer | Dev → Server | `scp` hoặc rsync | ~5–20 phút (tùy băng thông) |
| 3. Load + start | Server | `bash code/docker/scripts/load-images.sh` | ~3 phút |

---

## Bước 1 — Build & save images trên dev machine

### 1.1 Build 3 image (nếu chưa)

Trên máy dev (Git Bash trên Windows):

```bash
cd /e/DATN_20252

# Đảm bảo Docker Desktop đang chạy
docker version

# Build 3 image (đã chạy xong; chỉ chạy lại nếu code thay đổi)
docker build -t smtts-backend:latest -f code/backend/Dockerfile         code/backend
docker build -t smtts-web:latest     -f code/web/Dockerfile             code/web
docker build -t smtts-face:latest    -f code/face-recognition/Dockerfile code/face-recognition
```

> **Lưu ý PATH trên Windows Git Bash:** Nếu `docker build` báo `docker-credential-desktop not found`, chạy:
> ```bash
> export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
> ```
> Hoặc thêm dòng đó vào `~/.bashrc` để áp dụng vĩnh viễn.

Verify:
```bash
docker images | grep smtts
# smtts-backend  latest  ...  259MB
# smtts-web      latest  ...  50MB
# smtts-face     latest  ...  2.1GB
```

### 1.2 Đóng gói thành 1 file để chuyển

```bash
bash code/docker/scripts/save-images.sh latest
```

Script sẽ:
1. Re-tag: `smtts-backend:latest` → `local/smtts-backend:latest` (để khớp template trong `docker-compose.prod.yml`)
2. Save 3 image vào 1 tarball + gzip
3. Output: `code/docker/dist/smtts-images-latest.tar.gz` (~1.1 GB)

> **Tag khác `latest`?** Truyền tham số: `save-images.sh v0.1.0` → file `smtts-images-v0.1.0.tar.gz`

---

## Bước 2 — Transfer file sang server

### Option A — SCP (đơn giản nhất, chạy trên dev machine)

```bash
# Tạo trước thư mục dist trên server
ssh smtts@<server-ip> "mkdir -p /opt/smtts/code/docker/dist"

# Copy
scp code/docker/dist/smtts-images-latest.tar.gz \
    smtts@<server-ip>:/opt/smtts/code/docker/dist/
```

Tốc độ ước tính:
- Mạng VN (FPT/Viettel) ↔ Singapore VPS: ~5–15 MB/s → **2–5 phút**
- Mạng VN ↔ VPS Việt Nam: ~30–80 MB/s → **15–40 giây**

### Option B — rsync (resume được nếu mất kết nối)

```bash
rsync -avzP --partial \
    code/docker/dist/smtts-images-latest.tar.gz \
    smtts@<server-ip>:/opt/smtts/code/docker/dist/
```

`--partial` cho phép tiếp tục từ chỗ dừng nếu `Ctrl+C` hoặc rớt mạng.

### Option C — Qua USB / file storage trung gian

Nếu server không cho SSH inbound từ máy bạn:
1. Upload tarball lên Google Drive / Dropbox / file.io
2. Trên server: `wget <url>` hoặc `curl -O <url>` về `/opt/smtts/code/docker/dist/`

### Option D — Nếu máy bạn dùng Windows mà không cài OpenSSH

Dùng [WinSCP](https://winscp.net/) (GUI), kéo-thả file vào `/opt/smtts/code/docker/dist/`.

---

## Bước 3 — Load & start trên server

SSH vào server:
```bash
ssh smtts@<server-ip>
```

### 3.1 Đảm bảo đã có code repo

(Theo [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) Phần 6). Tóm tắt:
```bash
ls /opt/smtts/code/docker/  # phải thấy docker-compose.prod.yml
```

### 3.2 Đảm bảo đã có `.env.prod`

(Theo [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) Phần 7). Tóm tắt:
```bash
cd /opt/smtts/code/docker
[ -f .env.prod ] || cp .env.prod.example .env.prod
nano .env.prod   # đảm bảo đã đổi DB_MAIN_PASSWORD, DB_BIO_PASSWORD, JWT_SECRET
chmod 600 .env.prod
```

### 3.3 Chạy script load

```bash
cd /opt/smtts
bash code/docker/scripts/load-images.sh latest
```

Script sẽ:
1. `docker load` 3 image từ tarball (~1–2 phút)
2. **Tự sửa `.env.prod`** đặt `REGISTRY_PREFIX=local` và `IMAGE_TAG=latest` để compose trỏ đúng image vừa load

Output mong đợi:
```
==> Loading images from 1.1G smtts-images-latest.tar.gz
Loaded image: local/smtts-backend:latest
Loaded image: local/smtts-web:latest
Loaded image: local/smtts-face:latest

==> Loaded images:
local/smtts-backend  latest  ...  259MB
local/smtts-face     latest  ...  2.1GB
local/smtts-web      latest  ...  50MB

==> Updated /opt/smtts/code/docker/.env.prod  →  REGISTRY_PREFIX=local, IMAGE_TAG=latest

Next step — start (or roll) the stack:
  cd /opt/smtts/code/docker
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 3.4 Khởi động stack

```bash
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Compose sẽ:
- Pull `postgres:16-alpine` + `redis:7-alpine` (nhẹ, ~50 MB tổng)
- **KHÔNG build** backend/web/face — dùng image local đã load
- Khởi tạo 2 PostgreSQL DB từ migration SQL (chỉ chạy lần đầu khi volume rỗng)
- Start 6 container

Kiểm tra:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
curl -i http://localhost/api/v1
```

✅ Mở browser: `http://<server-ip>` → trang đăng nhập SMTTS.

---

## Quy trình update lần sau (sau khi code mới)

### Trên dev machine

```bash
cd /e/DATN_20252

# Build lại các service đã thay đổi (chỉ cần build cái nào sửa code)
docker build -t smtts-backend:latest -f code/backend/Dockerfile code/backend
# (skip web, face nếu không đổi)

# Hoặc dùng tag mới để dễ quản lý version
TAG=v0.2.0
docker build -t smtts-backend:$TAG -f code/backend/Dockerfile code/backend
docker build -t smtts-web:$TAG     -f code/web/Dockerfile     code/web
docker build -t smtts-face:$TAG    -f code/face-recognition/Dockerfile code/face-recognition

# Save
bash code/docker/scripts/save-images.sh $TAG
```

### Transfer & deploy trên server

```bash
# Dev
scp code/docker/dist/smtts-images-v0.2.0.tar.gz smtts@<ip>:/opt/smtts/code/docker/dist/

# Server
ssh smtts@<ip>
cd /opt/smtts
bash code/docker/scripts/load-images.sh v0.2.0
cd code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Compose so sánh image, **chỉ recreate container có image đổi** → các service không đổi giữ nguyên uptime.

### Mẹo: tối ưu transfer

Nếu chỉ đổi `backend` (~250 MB) thay vì cả face (~2 GB), save riêng để file nhỏ hơn nhiều:

```bash
# Trên dev — save chỉ backend
docker tag smtts-backend:latest local/smtts-backend:v0.2.0
docker save local/smtts-backend:v0.2.0 | gzip > backend-v0.2.0.tar.gz   # ~100 MB

# Transfer
scp backend-v0.2.0.tar.gz smtts@<ip>:/tmp/

# Server
ssh smtts@<ip>
gunzip -c /tmp/backend-v0.2.0.tar.gz | docker load
cd /opt/smtts/code/docker
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=v0.2.0/' .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend
```

---

## So sánh 3 cách deploy

| Tiêu chí | Build trên server (cách 1) | Offline tar.gz (cách 2) | CI/CD + GHCR (cách 3) |
|----------|---------------------------|-------------------------|------------------------|
| Setup ban đầu | Đơn giản nhất | Trung bình | Phức tạp nhất |
| Server cần RAM | ≥ 4 GB | ≥ 2 GB | ≥ 2 GB |
| Server cần internet | Có (pull base + npm/pip) | Không (chỉ pull postgres/redis) | Có (pull GHCR) |
| Update lần sau | SSH + `update.sh` | Build local → scp → load | Chỉ `git push` |
| Phụ thuộc tốc độ mạng | Trung bình | Cao (transfer 1 GB+) | Thấp (chỉ pull diff layer) |
| Chi phí | 0đ | 0đ | 0đ (GHCR free cho repo private đến 500 MB) |

**Khuyên dùng:**
- **Demo/thesis 1 lần:** cách 2 (offline) — đơn giản, không phụ thuộc CI
- **Phát triển dài hạn:** cách 3 (CI/CD)
- **Server có CPU mạnh + chỉ deploy 1 lần:** cách 1

Có thể **kết hợp**: lần đầu dùng cách 2 cho nhanh, sau đó setup cách 3 để các update sau tự động.

---

## Troubleshooting

| Triệu chứng | Cách xử lý |
|-------------|------------|
| `docker save` lỗi "no space left" | Đĩa của Docker (Docker Desktop) đầy. Vào Docker Desktop → Settings → Resources → tăng disk image size, hoặc `docker system prune -a` |
| `scp` báo `Connection refused` | Sai IP/port, hoặc firewall server chặn 22 |
| `scp` đứng giữa chừng | Mạng yếu — chuyển sang `rsync --partial -P` để resume |
| Load xong nhưng compose vẫn cố pull từ ghcr.io | Kiểm tra `cat .env.prod \| grep REGISTRY_PREFIX` — phải là `local`. Có thể `load-images.sh` không tìm thấy `.env.prod`. Sửa thủ công và `up -d` lại. |
| `image not found: local/smtts-backend:latest` | Image chưa load. `docker images \| grep smtts`. Nếu trống, chạy lại `load-images.sh`. |
| Build face báo OOM trên dev | Cần ≥ 8 GB RAM máy build. Nếu Docker Desktop, tăng RAM trong Settings → Resources |
| Tar.gz kích thước cực to (~5 GB+) | Có image cũ trùng layer. `docker image prune -a` rồi build lại |

### Kiểm tra integrity của tarball trước khi transfer

Trên dev:
```bash
sha256sum code/docker/dist/smtts-images-latest.tar.gz
# Lưu lại hash
```

Trên server sau khi scp:
```bash
sha256sum /opt/smtts/code/docker/dist/smtts-images-latest.tar.gz
# So với hash của dev — phải giống nhau
```

---

## Cấu trúc file liên quan

```
code/
├── docker/
│   ├── docker-compose.prod.yml   # Có REGISTRY_PREFIX → cho phép switch giữa GHCR/local
│   ├── .env.prod                 # REGISTRY_PREFIX=local cho cách offline
│   ├── dist/                     # Tarball images (gitignored)
│   │   └── smtts-images-<tag>.tar.gz
│   └── scripts/
│       ├── save-images.sh        # Dev: build → tag → tar.gz
│       └── load-images.sh        # Server: tar.gz → load → cập nhật .env
└── docs/
    ├── DEPLOYMENT.md             # Reference đầy đủ
    ├── DEPLOYMENT_GUIDE.md       # Tutorial step-by-step (online build trên server)
    └── OFFLINE_DEPLOY.md         # Tutorial này (build offline trên dev)
```

---

## TL;DR — Cheatsheet

```bash
# === DEV (Windows Git Bash) ===
cd /e/DATN_20252
export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"

# Build (lần đầu, hoặc khi code đổi)
docker build -t smtts-backend:latest -f code/backend/Dockerfile         code/backend
docker build -t smtts-web:latest     -f code/web/Dockerfile             code/web
docker build -t smtts-face:latest    -f code/face-recognition/Dockerfile code/face-recognition

# Đóng gói
bash code/docker/scripts/save-images.sh

# Chuyển
scp code/docker/dist/smtts-images-latest.tar.gz smtts@<ip>:/opt/smtts/code/docker/dist/

# === SERVER ===
ssh smtts@<ip>
bash /opt/smtts/code/docker/scripts/load-images.sh
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Xong. Mở `http://<ip>` để xem.
