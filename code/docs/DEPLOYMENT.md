# SMTTS — Hướng dẫn Triển khai (Deployment)

Tài liệu này hướng dẫn từ A → Z cách đưa hệ thống SMTTS (web + backend + face recognition + 2 PostgreSQL + Redis) lên server.

> **Đối tượng đọc:** Sinh viên triển khai bản thử nghiệm cho đồ án tốt nghiệp.
> **Stack triển khai:** Docker + Docker Compose. Tùy chọn HTTPS qua Caddy. CI/CD bằng GitHub Actions + GHCR.

---

## Mục lục

1. [Kiến trúc triển khai](#1-kiến-trúc-triển-khai)
2. [Chuẩn bị server](#2-chuẩn-bị-server)
3. [Cấu hình secrets](#3-cấu-hình-secrets)
4. [Triển khai lần đầu (build trên server)](#4-triển-khai-lần-đầu-build-trên-server)
5. [Cập nhật nhanh khi code thêm](#5-cập-nhật-nhanh-khi-code-thêm)
6. [Bật HTTPS bằng Caddy](#6-bật-https-bằng-caddy-tùy-chọn)
7. [Cấu hình CI/CD bằng GitHub Actions](#7-cấu-hình-cicd-bằng-github-actions)
8. [Backup database](#8-backup-database)
9. [Vận hành: log, restart, troubleshoot](#9-vận-hành-log-restart-troubleshoot)
10. [Phụ lục: cấu trúc file Docker](#10-phụ-lục-cấu-trúc-file-docker)

---

## 1. Kiến trúc triển khai

```
                         ┌─────────────────────────┐
                         │      Internet           │
                         └───────────┬─────────────┘
                                     │ :80/:443
                         ┌───────────▼─────────────┐
                         │  Caddy (tùy chọn HTTPS) │
                         └───────────┬─────────────┘
                                     │
   ┌─────────────────────────────────┼─────────────────────────────────┐
   │                       smtts-net (bridge)                          │
   │                                                                   │
   │   ┌──────────┐    /api/v1   ┌──────────┐    HTTP    ┌──────────┐  │
   │   │   web    ├──────────────►  backend ├────────────►   face   │  │
   │   │ (nginx)  │  /uploads    │ (NestJS) │ check/match│  (Py)    │  │
   │   └──────────┘              └─┬───┬────┘            └──────────┘  │
   │                               │   │                                │
   │              ┌────────────────┘   └─────────────┐                  │
   │              ▼                                  ▼                  │
   │      ┌─────────────┐                  ┌──────────────────┐         │
   │      │ postgres-   │                  │ postgres-        │         │
   │      │ main        │                  │ biometric        │         │
   │      └─────────────┘                  └──────────────────┘         │
   │                                                                   │
   │                          ┌─────────┐                              │
   │                          │  redis  │                              │
   │                          └─────────┘                              │
   └───────────────────────────────────────────────────────────────────┘
```

**Cổng được expose ra ngoài:** chỉ duy nhất `web` (mặc định cổng 80). Các service còn lại chỉ giao tiếp nội bộ qua mạng `smtts-net`.

---

## 2. Chuẩn bị server

### 2.1 Yêu cầu phần cứng tối thiểu

| Mục | Tối thiểu | Khuyến nghị |
|-----|-----------|-------------|
| RAM | 4 GB     | 8 GB |
| CPU | 2 vCPU   | 4 vCPU |
| Đĩa | 20 GB SSD | 40 GB SSD |
| OS  | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

> Face recognition (InsightFace + ONNX) ngốn ~1.5 GB RAM khi load model. Đừng mua VPS dưới 4 GB.

### 2.2 Cài Docker + Docker Compose plugin

SSH vào server, chạy:

```bash
# Cài Docker Engine theo hướng dẫn chính thức
curl -fsSL https://get.docker.com | sudo sh

# Cho user hiện tại dùng docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra
docker --version
docker compose version
```

### 2.3 Mở firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp   # nếu sẽ dùng HTTPS
sudo ufw enable
```

### 2.4 Clone source về server

```bash
sudo mkdir -p /opt/smtts && sudo chown $USER:$USER /opt/smtts
cd /opt/smtts
git clone https://github.com/<your-username>/<your-repo>.git .
```

> Đặt repo tại `/opt/smtts` để các script và CI workflow chạy đúng đường dẫn ví dụ trong tài liệu này.

---

## 3. Cấu hình secrets

```bash
cd /opt/smtts/code/docker
cp .env.prod.example .env.prod
```

Mở `.env.prod` và **bắt buộc** đổi các giá trị sau:

```dotenv
DB_MAIN_PASSWORD=<openssl rand -base64 32>
DB_BIO_PASSWORD=<openssl rand -base64 32>
JWT_SECRET=<openssl rand -hex 32>
REGISTRY_PREFIX=ghcr.io/<github-username-lowercase>   # nếu dùng CI
```

Tạo password mạnh nhanh:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

> File `.env.prod` chứa secrets — **đừng commit lên git**. `.gitignore` mặc định đã bỏ qua các file `.env*`.

---

## 4. Triển khai lần đầu (build trên server)

Phù hợp khi: server mới, chưa setup CI, hoặc muốn test trước.

```bash
cd /opt/smtts
bash code/docker/scripts/deploy.sh
```

Script này:
1. Build 3 image: `backend`, `web`, `face-recognition`
2. Pull image `postgres:16-alpine` và `redis:7-alpine`
3. Khởi tạo 2 database từ các SQL trong `code/scripts/migrations/` (chạy đúng 1 lần khi volume rỗng)
4. Khởi động toàn bộ stack với `restart: unless-stopped`

**Lần đầu sẽ mất ~10–15 phút** vì face-recognition phải cài deps Python và tải model InsightFace (~300 MB).

Sau khi xong, mở browser truy cập `http://<server-ip>` để vào dashboard.

### Kiểm tra nhanh

```bash
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f backend
```

Test API:

```bash
curl -i http://<server-ip>/api/v1
```

---

## 5. Cập nhật nhanh khi code thêm

Bạn có **2 con đường** (chọn 1):

### 5.1 Cách A — Build trực tiếp trên server (đơn giản, không cần CI)

Sau khi code mới đã push lên `main`:

```bash
ssh user@server
cd /opt/smtts
bash code/docker/scripts/update.sh             # cập nhật toàn bộ
# hoặc chỉ build lại 1 service:
bash code/docker/scripts/update.sh backend
bash code/docker/scripts/update.sh web
bash code/docker/scripts/update.sh face
```

Script `update.sh` sẽ:
- `git pull` source mới
- `docker compose build` cho service được chọn
- `docker compose up -d --no-deps <service>` để rolling restart đúng container đó
- Prune image cũ

> **Database không bị mất dữ liệu** — volume `pgdata-main`, `pgdata-biometric`, `redis-data`, `backend-uploads` được giữ qua các lần restart.

### 5.2 Cách B — Build trên GitHub, server chỉ pull (nhanh hơn nhiều)

Yêu cầu: đã setup CI/CD theo [mục 7](#7-cấu-hình-cicd-bằng-github-actions).

Khi bạn push code lên `main`:
- GitHub Actions sẽ build image, push lên GHCR
- Sau đó SSH vào server và tự `docker compose pull && up -d`

Bạn không cần làm gì thêm trên server. Toàn bộ rollout < 2 phút (cộng thời gian build CI ~5–8 phút).

Nếu cần update thủ công khi đã có image trong GHCR:

```bash
ssh user@server
cd /opt/smtts
bash code/docker/scripts/update-from-registry.sh <git-sha-or-latest>
```

---

## 6. Bật HTTPS bằng Caddy (tùy chọn)

Cần có domain trỏ về IP server (ví dụ `smtts.example.com`).

### 6.1 Sửa `.env.prod`

Đổi cổng public của web để nhường 80/443 cho Caddy:

```dotenv
WEB_PUBLIC_PORT=8080
```

Restart stack:

```bash
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 6.2 Sửa Caddyfile

```bash
cp Caddyfile.example Caddyfile
nano Caddyfile     # đổi smtts.example.com → domain thật
```

Sửa `reverse_proxy` thành `host.docker.internal:8080` (hoặc IP nội bộ host) thay vì `web:80`, vì Caddy chạy ngoài compose network. Hoặc cho Caddy join cùng network như ví dụ ở `Caddyfile.example`.

### 6.3 Chạy Caddy

```bash
docker run -d --name caddy --restart unless-stopped \
  --network smtts-prod_smtts-net \
  -p 80:80 -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:2
```

Caddy sẽ tự xin chứng chỉ Let's Encrypt và phục vụ HTTPS. Truy cập `https://smtts.example.com` để xác nhận.

---

## 7. Cấu hình CI/CD bằng GitHub Actions

Workflow nằm tại `.github/workflows/ci-cd.yml`. Mỗi khi push lên `main`:

1. Job `changes`: phát hiện thay đổi ở `code/backend`, `code/web`, hoặc `code/face-recognition`
2. Build image cho các thư mục đã thay đổi, push lên **GHCR** (ghcr.io) với tag `latest` và `<git-sha>`
3. SSH vào server và chạy `docker compose pull && up -d`

### 7.1 Tạo Personal Access Token (PAT) cho GHCR

Server cần token để pull image private từ GHCR.

1. Vào https://github.com/settings/tokens → **Generate new token (classic)**
2. Scopes: `read:packages`, `write:packages`
3. Lưu lại token, đặt tên ví dụ `GHCR_PULL_TOKEN`

### 7.2 Tạo SSH key cho deploy

Trên máy bạn (hoặc server tạm):

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key
# upload public key lên server:
ssh-copy-id -i deploy_key.pub user@server
```

Nội dung `deploy_key` (private) sẽ là secret `DEPLOY_SSH_KEY`.

### 7.3 Khai báo Secrets trong GitHub repo

Vào **Settings → Secrets and variables → Actions → New repository secret**, thêm:

| Secret | Giá trị |
|--------|---------|
| `DEPLOY_HOST` | IP hoặc domain của server |
| `DEPLOY_USER` | User SSH (ví dụ `ubuntu`) |
| `DEPLOY_SSH_KEY` | Nội dung private key `deploy_key` |
| `DEPLOY_PORT` | (tùy chọn) cổng SSH, mặc định 22 |
| `DEPLOY_PATH` | Đường dẫn repo trên server, ví dụ `/opt/smtts` |
| `GHCR_USER` | GitHub username của bạn |
| `GHCR_TOKEN` | PAT đã tạo ở 7.1 |

Cũng tạo một **Environment** tên `production` (Settings → Environments) để job `deploy` được bảo vệ bởi review.

### 7.4 Sửa `REGISTRY_PREFIX` trong `.env.prod`

Trên server:

```dotenv
REGISTRY_PREFIX=ghcr.io/<github-username-lowercase>
```

GHCR images sẽ là `ghcr.io/<user>/smtts-backend:<sha>`, …

### 7.5 Push thử

```bash
git commit --allow-empty -m "ci: kick off pipeline"
git push origin main
```

Vào tab **Actions** trên GitHub để xem workflow chạy. Sau khi xong, web sẽ tự update.

---

## 8. Backup database

Chạy thử:

```bash
bash /opt/smtts/code/docker/scripts/backup-db.sh
ls -lh /opt/smtts/code/docker/backups
```

Tạo cron job chạy hằng ngày 3h sáng:

```bash
crontab -e
```

Thêm dòng:

```
0 3 * * * cd /opt/smtts && bash code/docker/scripts/backup-db.sh >> code/docker/backups/cron.log 2>&1
```

Script tự giữ 14 bản gần nhất, xóa bản cũ hơn.

### Restore

```bash
gunzip -c backups/main_20260417_030000.sql.gz | \
  docker exec -i smtts-postgres-main psql -U smtts_user -d smtts_main
```

---

## 9. Vận hành: log, restart, troubleshoot

### Lệnh hay dùng

```bash
cd /opt/smtts/code/docker
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

# Trạng thái
$COMPOSE ps

# Log realtime, 1 service
$COMPOSE logs -f backend
$COMPOSE logs -f --tail=200 web

# Restart 1 service (không build lại)
$COMPOSE restart backend

# Vào shell trong container
$COMPOSE exec backend sh
$COMPOSE exec postgres-main psql -U smtts_user -d smtts_main

# Tắt toàn bộ (giữ data)
$COMPOSE down

# Tắt + xóa volume (MẤT DATA!)
$COMPOSE down -v
```

### Lỗi hay gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|-------------|--------------------------|
| `web` 502 Bad Gateway khi gọi API | `backend` chưa healthy. Kiểm tra `logs backend`, thường là sai mật khẩu DB hoặc DB chưa migrate. |
| `face-recognition` mất 2 phút mới healthy | Bình thường — model InsightFace mất thời gian load. `start_period: 120s` đã được set. |
| Sửa migration SQL mới không có hiệu lực | Init scripts chỉ chạy khi volume rỗng. Nếu cần re-init: `docker compose down -v` (sẽ XÓA DATA) hoặc apply migration thủ công bằng `psql`. |
| Hết RAM khi build face-recognition | Build trên máy có ≥ 4 GB RAM, hoặc dùng cách B (CI build, server chỉ pull). |
| `docker compose pull` lỗi `denied` | Sai PAT hoặc image visibility là `private` mà chưa login GHCR. Chạy `docker login ghcr.io` trên server. |

---

## 10. Phụ lục: cấu trúc file Docker

```
code/
├── backend/
│   ├── Dockerfile              # Multi-stage build NestJS
│   └── .dockerignore
├── web/
│   ├── Dockerfile              # Multi-stage: Vite build → Nginx serve
│   ├── nginx.conf              # SPA fallback + reverse proxy /api/v1, /uploads
│   └── .dockerignore
├── face-recognition/
│   ├── Dockerfile              # Đã có sẵn — Python + InsightFace
│   └── .dockerignore
├── docker/
│   ├── docker-compose.yml         # Stack DEV (chỉ infra: DB + redis + face)
│   ├── docker-compose.prod.yml    # Stack PROD (đầy đủ web + backend)
│   ├── .env.prod.example          # Template secrets
│   ├── Caddyfile.example          # HTTPS reverse proxy (tùy chọn)
│   └── scripts/
│       ├── deploy.sh                  # Triển khai lần đầu
│       ├── update.sh                  # Build & restart trên server
│       ├── update-from-registry.sh    # Pull image từ GHCR & restart
│       └── backup-db.sh               # Dump 2 DB ra file gzip
└── scripts/migrations/         # SQL init (đã có)

.github/workflows/
└── ci-cd.yml                   # Build → push GHCR → SSH deploy
```

### Phân biệt 2 file compose

| File | Mục đích | Service |
|------|----------|---------|
| `docker-compose.yml` (cũ) | Dev local: chạy infra để dev backend/web bằng `npm run dev` | postgres-main, postgres-biometric, redis, face-recognition |
| `docker-compose.prod.yml` | Prod đầy đủ trên server | + backend + web (Nginx) |

---

## TL;DR — Checklist triển khai lần đầu

- [ ] Mua VPS Ubuntu 22.04, ≥ 4 GB RAM
- [ ] Cài Docker + mở firewall 80/443
- [ ] `git clone` repo về `/opt/smtts`
- [ ] `cp .env.prod.example .env.prod` và đổi mọi password/secret
- [ ] `bash code/docker/scripts/deploy.sh`
- [ ] Mở `http://<ip>` xác nhận hoạt động
- [ ] (Tùy chọn) Trỏ domain + chạy Caddy để có HTTPS
- [ ] (Tùy chọn) Setup GitHub Secrets + push lên main để CI tự deploy
- [ ] Cài cron backup DB

## TL;DR — Cập nhật lần sau

```bash
# Có CI:  chỉ cần push lên main, đợi ~5 phút.
git push origin main

# Không có CI:
ssh user@server
cd /opt/smtts && bash code/docker/scripts/update.sh
```
