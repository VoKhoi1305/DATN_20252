# SMTTS — Hướng dẫn Triển khai Chi tiết (Step-by-Step)

> **Tài liệu này dành cho ai?** Sinh viên/dev chưa từng deploy lên server bao giờ. Mọi bước đều có lệnh cụ thể, output mong đợi, và cách xử lý khi lỗi.
>
> **Tổng thời gian:** ~60–90 phút lần đầu. Các lần sau chỉ < 5 phút.
>
> **Tài liệu liên quan:** [DEPLOYMENT.md](DEPLOYMENT.md) (reference đầy đủ về kiến trúc, scripts, compose).

---

## Mục lục

- [Phần 0 — Trước khi bắt đầu](#phần-0--trước-khi-bắt-đầu)
- [Phần 1 — Mua VPS](#phần-1--mua-vps)
- [Phần 2 — SSH vào server lần đầu](#phần-2--ssh-vào-server-lần-đầu)
- [Phần 3 — Bảo mật cơ bản: tạo user thường + SSH key](#phần-3--bảo-mật-cơ-bản-tạo-user-thường--ssh-key)
- [Phần 4 — Cài Docker và mở firewall](#phần-4--cài-docker-và-mở-firewall)
- [Phần 5 — Push source SMTTS lên GitHub](#phần-5--push-source-smtts-lên-github)
- [Phần 6 — Clone source về server](#phần-6--clone-source-về-server)
- [Phần 7 — Cấu hình secrets `.env.prod`](#phần-7--cấu-hình-secrets-envprod)
- [Phần 8 — Deploy lần đầu](#phần-8--deploy-lần-đầu)
- [Phần 9 — Kiểm thử hệ thống](#phần-9--kiểm-thử-hệ-thống)
- [Phần 10 — (Tùy chọn) Trỏ domain và bật HTTPS](#phần-10--tùy-chọn-trỏ-domain-và-bật-https)
- [Phần 11 — (Khuyến nghị) Setup CI/CD GitHub Actions](#phần-11--khuyến-nghị-setup-cicd-github-actions)
- [Phần 12 — Cài backup tự động](#phần-12--cài-backup-tự-động)
- [Phần 13 — Quy trình update khi code thêm](#phần-13--quy-trình-update-khi-code-thêm)
- [Phần 14 — Troubleshooting](#phần-14--troubleshooting)

---

## Phần 0 — Trước khi bắt đầu

### Bạn cần chuẩn bị

| Mục | Yêu cầu | Ghi chú |
|-----|---------|---------|
| Tài khoản GitHub | Có repo chứa source SMTTS | Free là đủ |
| Thẻ Visa/Mastercard | Hoặc ví Momo (DigitalOcean qua Paypal) | Để mua VPS |
| Email | Để nhận thông tin VPS | |
| (Tùy chọn) Domain | Ví dụ `smtts.io.vn` | Mua sau cũng được |

### Công cụ trên máy bạn (Windows)

Cài sẵn 3 công cụ sau (nếu chưa có):

1. **Git for Windows** — https://git-scm.com/download/win → chạy installer mặc định
2. **OpenSSH client** — Windows 10/11 có sẵn. Mở PowerShell, gõ `ssh` để kiểm tra
3. **VS Code** (khuyên dùng) — để chỉnh file remote qua Remote-SSH extension

> **Mẹo:** Dùng Git Bash thay cho PowerShell vì hầu hết lệnh trong tài liệu là bash.

---

## Phần 1 — Mua VPS

Chọn 1 trong 3 nhà cung cấp dưới. Khuyến nghị **DigitalOcean** vì giao diện rõ ràng nhất.

### Cấu hình tối thiểu cho SMTTS

| Mục | Yêu cầu |
|-----|---------|
| OS | Ubuntu 22.04 LTS (x86_64) |
| RAM | 4 GB (face-recognition cần ~1.5 GB khi load model) |
| CPU | 2 vCPU |
| Đĩa | 40 GB SSD |
| Giá tham khảo | 6 USD/tháng (DO) hoặc 200k VND/tháng (VietNix) |

### Option A — DigitalOcean (khuyên dùng)

1. Đăng ký tại https://www.digitalocean.com/ (nếu mới, có ưu đãi $200 credit 60 ngày)
2. **Create → Droplets**
3. Chọn:
   - **Region**: Singapore (gần VN nhất, latency ~50 ms)
   - **OS**: Ubuntu 22.04 LTS x64
   - **Size**: Basic → Regular SSD → **$24/mo (4 GB / 2 CPU)** (nhỏ hơn không đủ build face)
   - **Authentication**: chọn **Password** (đơn giản cho lần đầu, sẽ đổi sang SSH key ở Phần 3)
   - **Hostname**: `smtts-prod`
4. Bấm **Create Droplet**, chờ ~1 phút
5. Ghi lại **IP public** (dạng `134.209.xxx.xxx`) và **password** (xem trong email)

### Option B — Vultr

Tương tự DigitalOcean, chọn **Tokyo** hoặc **Singapore** location, plan **Cloud Compute Regular** $24/mo (4 GB).

### Option C — Nhà cung cấp Việt Nam

VietNix / TinoHost / Vinahost — tìm gói **VPS NVMe 4GB**, OS **Ubuntu 22.04**. Giá khoảng 200k–300k/tháng. Họ sẽ gửi mail kèm IP, root password, control panel.

> ✅ **Sau bước này bạn có:** IP server (ví dụ `134.209.180.45`), root password.

---

## Phần 2 — SSH vào server lần đầu

Mở **Git Bash** (hoặc PowerShell) trên máy Windows:

```bash
ssh root@134.209.180.45
```

Lần đầu sẽ hỏi:
```
The authenticity of host '134.209.180.45' can't be established.
ED25519 key fingerprint is SHA256:xxxxx.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```
Gõ `yes` → Enter → nhập password.

### Output mong đợi
```
Welcome to Ubuntu 22.04.x LTS (GNU/Linux 5.15.x x86_64)
...
root@smtts-prod:~#
```

✅ **Bạn đã vào được server.** Chạy `whoami` xem ra `root`, `lsb_release -a` xem OS là Ubuntu 22.04.

### Nếu lỗi

| Lỗi | Cách sửa |
|-----|----------|
| `Connection refused` | Kiểm tra IP đúng chưa, server đã khởi động xong chưa (đợi 2 phút sau khi tạo) |
| `Permission denied` | Sai password, hoặc nhà cung cấp dùng cổng SSH khác (thử `ssh -p 2222 root@<ip>`) |
| Treo không phản hồi | Mạng VN đôi khi chặn SSH out, thử bật/tắt VPN |

---

## Phần 3 — Bảo mật cơ bản: tạo user thường + SSH key

> **Tại sao cần?** Login `root` bằng password rất dễ bị tấn công brute-force. Ta tạo user thường và login bằng SSH key, sau đó disable root password login.

### 3.1 Tạo user mới trên server

Đang ở SSH session với `root`:

```bash
adduser smtts
# Nhập password mới (lưu lại) — các thông tin còn lại Enter để bỏ qua
usermod -aG sudo smtts        # cho user vào group sudo
```

### 3.2 Tạo SSH key trên máy của bạn

**Mở Git Bash mới** trên máy Windows (KHÔNG đóng cửa sổ SSH cũ — phòng khi cấu hình sai cần dùng lại):

```bash
ssh-keygen -t ed25519 -C "smtts-deploy" -f ~/.ssh/smtts_deploy
# Khi hỏi passphrase: bấm Enter (hoặc đặt passphrase nếu muốn an toàn hơn)
```

Sẽ tạo ra 2 file:
- `~/.ssh/smtts_deploy` (private key — **không bao giờ chia sẻ**)
- `~/.ssh/smtts_deploy.pub` (public key — đẩy lên server)

### 3.3 Copy public key lên server

```bash
ssh-copy-id -i ~/.ssh/smtts_deploy.pub smtts@134.209.180.45
# Nhập password của user smtts vừa tạo ở 3.1
```

### 3.4 Test login bằng key

```bash
ssh -i ~/.ssh/smtts_deploy smtts@134.209.180.45
```

Nếu vào được mà **không bị hỏi password** → key đã hoạt động ✅

Để khỏi phải gõ `-i` mỗi lần, tạo file `~/.ssh/config` trên máy bạn:

```bash
# ~/.ssh/config
Host smtts
    HostName 134.209.180.45
    User smtts
    IdentityFile ~/.ssh/smtts_deploy
```

Từ giờ chỉ cần: `ssh smtts`.

### 3.5 (Tùy chọn) Disable root login bằng password

Trong SSH session với user `smtts`:

```bash
sudo nano /etc/ssh/sshd_config
```

Sửa 2 dòng:
```
PermitRootLogin no
PasswordAuthentication no
```

```bash
sudo systemctl restart ssh
```

✅ **Sau bước này bạn có:** user `smtts` login bằng SSH key, không ai brute-force vào được.

---

## Phần 4 — Cài Docker và mở firewall

SSH vào server với user `smtts`:

```bash
ssh smtts
```

### 4.1 Cài Docker Engine

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

**Quan trọng:** logout và SSH lại để group `docker` có hiệu lực:

```bash
exit
ssh smtts
```

Test:
```bash
docker --version           # docker version 27.x
docker compose version     # Docker Compose version v2.x
docker run --rm hello-world
```

Nếu thấy "Hello from Docker!" → ✅

### 4.2 Mở firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

Output mong đợi:
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

✅ **Sau bước này:** Docker chạy được, server chỉ mở 3 cổng cần thiết.

---

## Phần 5 — Push source SMTTS lên GitHub

Trên **máy local Windows**, mở Git Bash, vào thư mục dự án:

```bash
cd /e/DATN_20252
```

### 5.1 Kiểm tra trạng thái git

```bash
git status
```

Bạn sẽ thấy nhiều file đang modify + các file Docker mới mình vừa tạo. Quan trọng: **đảm bảo `.env.prod` KHÔNG có trong danh sách**.

```bash
cat code/docker/.gitignore 2>/dev/null
```

Nếu chưa có, tạo file `.gitignore` trong `code/docker/`:

```bash
echo -e ".env.prod\nbackups/" >> code/docker/.gitignore
```

### 5.2 Commit và push

```bash
git add .
git commit -m "chore: add Docker production setup + CI/CD"
git push origin main
```

> Nếu repo chưa có remote: tạo repo mới trên https://github.com/new (đặt **Private** cho an toàn), copy URL, rồi:
> ```bash
> git remote add origin https://github.com/<username>/<repo>.git
> git branch -M main
> git push -u origin main
> ```

✅ **Sau bước này:** code đã trên GitHub. Vào trang repo xác nhận thấy thư mục `code/docker/`, `.github/workflows/ci-cd.yml`.

---

## Phần 6 — Clone source về server

SSH vào server (`ssh smtts`).

### 6.1 Tạo thư mục triển khai

```bash
sudo mkdir -p /opt/smtts
sudo chown $USER:$USER /opt/smtts
cd /opt/smtts
```

### 6.2 Clone repo

**Repo public:**
```bash
git clone https://github.com/<username>/<repo>.git .
```

**Repo private:** cần Personal Access Token (PAT):

1. Trên https://github.com/settings/tokens → **Generate new token (classic)**
2. Scope: tích **`repo`**
3. Tạo token, copy lại

```bash
git clone https://<username>:<TOKEN>@github.com/<username>/<repo>.git .
```

> Sau khi clone, gỡ token khỏi remote URL để khỏi lộ:
> ```bash
> git remote set-url origin https://github.com/<username>/<repo>.git
> ```

### 6.3 Lưu credential cho lần pull sau

```bash
git config --global credential.helper store
git pull       # nhập user + token; sau đó nó nhớ vĩnh viễn
```

### 6.4 Kiểm tra cấu trúc

```bash
ls code/docker/
# docker-compose.yml  docker-compose.prod.yml  .env.prod.example  scripts/  Caddyfile.example
```

✅ **Sau bước này:** source đã ở `/opt/smtts` trên server.

---

## Phần 7 — Cấu hình secrets `.env.prod`

```bash
cd /opt/smtts/code/docker
cp .env.prod.example .env.prod
```

### 7.1 Sinh các secret mạnh

```bash
echo "DB_MAIN_PASSWORD: $(openssl rand -base64 32)"
echo "DB_BIO_PASSWORD:  $(openssl rand -base64 32)"
echo "JWT_SECRET:       $(openssl rand -hex 32)"
```

Ghi 3 chuỗi ra 1 chỗ tạm (notepad).

### 7.2 Sửa file

```bash
nano .env.prod
```

Sửa **bắt buộc** 3 dòng (paste giá trị vừa sinh):

```dotenv
DB_MAIN_PASSWORD=K8x...vừa-sinh-ở-trên...
DB_BIO_PASSWORD=Q2p...vừa-sinh-ở-trên...
JWT_SECRET=4f3a9c1b...64-ký-tự-hex...
```

Lưu (`Ctrl+O` → Enter → `Ctrl+X`).

### 7.3 Bảo vệ file

```bash
chmod 600 .env.prod
ls -l .env.prod    # phải là -rw-------
```

✅ **Sau bước này:** đã có file secrets, chỉ user của bạn đọc được.

---

## Phần 8 — Deploy lần đầu

```bash
cd /opt/smtts
bash code/docker/scripts/deploy.sh
```

### Diễn biến (tổng cộng 10–15 phút lần đầu)

| Phút | Đang làm gì |
|------|-------------|
| 0–1 | Pull `postgres:16-alpine`, `redis:7-alpine` |
| 1–8 | Build `face-recognition` image: cài Python deps + tải ~300 MB model InsightFace |
| 8–10 | Build `backend` image: `npm ci` + `nest build` |
| 10–11 | Build `web` image: `npm ci` + `vite build` |
| 11–13 | Khởi tạo 2 PostgreSQL DB từ migration SQL, start tất cả container |
| 13–15 | Face-recognition mất ~2 phút load model → healthy |

Khi script in xong "Deploy done", chạy:

```bash
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Bạn sẽ thấy 6 service trạng thái `Up` hoặc `Up (healthy)`. Riêng `smtts-face-recognition` có thể `Up (health: starting)` trong 1–2 phút đầu — bình thường.

### Output mong đợi

```
NAME                       STATUS                 PORTS
smtts-backend              Up (healthy)           3000/tcp
smtts-face-recognition     Up (healthy)           8000/tcp
smtts-postgres-biometric   Up (healthy)           5432/tcp
smtts-postgres-main        Up (healthy)           5432/tcp
smtts-redis                Up (healthy)           6379/tcp
smtts-web                  Up                     0.0.0.0:80->80/tcp
```

### Nếu deploy lỗi

Xem log của service bị lỗi:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 backend
```

Lỗi thường gặp xem [Phần 14 — Troubleshooting](#phần-14--troubleshooting).

✅ **Sau bước này:** stack đang chạy.

---

## Phần 9 — Kiểm thử hệ thống

### 9.1 Test từ trong server

```bash
curl -i http://localhost/api/v1
# HTTP/1.1 401 Unauthorized   ← OK, có nghĩa backend phản hồi
```

```bash
curl -i http://localhost/
# HTTP/1.1 200 OK + nội dung HTML React
```

### 9.2 Test từ máy ngoài

Mở browser, truy cập:
```
http://<IP-server>
```

Bạn sẽ thấy **trang đăng nhập SMTTS**.

### 9.3 Login bằng tài khoản seed

Source seed sẵn vài user trong `code/scripts/migrations/003_seed_data.sql` và `004_seed_dashboard_data.sql`. Tìm user/password để test:

```bash
docker exec -it smtts-postgres-main \
  psql -U smtts_user -d smtts_main \
  -c "SELECT username, full_name, role FROM users LIMIT 5;"
```

> Password đã hash bằng bcrypt — không xem được. Mặc định seed thường dùng `password123` hoặc tương tự, xem trong file SQL.

### 9.4 Test face-recognition service

```bash
curl http://localhost:8000/health
# {"status":"ok"}    ← service đã load model xong
```

(Cổng 8000 chỉ accessible nội bộ container, từ host phải `docker exec`):
```bash
docker exec smtts-backend wget -qO- http://face-recognition:8000/health
```

✅ **Sau bước này:** xác nhận hệ thống hoạt động end-to-end.

---

## Phần 10 — (Tùy chọn) Trỏ domain và bật HTTPS

> Bỏ qua phần này nếu bạn chỉ cần demo qua IP. Khi nào có domain hãy quay lại.

### 10.1 Mua domain

Mua tại Namecheap, GoDaddy, hoặc Mắt Bão / PA VietNam. Domain `.io.vn` rẻ (~50k/năm).

### 10.2 Trỏ DNS A record

Vào trang quản lý DNS của domain, tạo:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `134.209.180.45` (IP server) | 3600 |
| A | `www` | `134.209.180.45` | 3600 |

Đợi 5–30 phút để DNS propagate. Test:
```bash
dig +short smtts.example.com
# 134.209.180.45
```

### 10.3 Đổi web sang cổng nội bộ

Trên server:
```bash
nano /opt/smtts/code/docker/.env.prod
```

Sửa:
```dotenv
WEB_PUBLIC_PORT=8080
```

Restart:
```bash
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### 10.4 Chạy Caddy để có HTTPS tự động

```bash
cd /opt/smtts/code/docker
cp Caddyfile.example Caddyfile
nano Caddyfile
```

Thay `smtts.example.com` bằng domain thật, sửa `reverse_proxy`:

```caddy
smtts.io.vn {
    encode gzip zstd
    reverse_proxy host.docker.internal:8080
}
```

Chạy Caddy:
```bash
docker run -d --name caddy --restart unless-stopped \
  -p 80:80 -p 443:443 \
  --add-host=host.docker.internal:host-gateway \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:2
```

Đợi 30 giây rồi mở browser: `https://smtts.io.vn` → có ổ khóa xanh ✅

Xem log Caddy nếu lỗi:
```bash
docker logs caddy
```

---

## Phần 11 — (Khuyến nghị) Setup CI/CD GitHub Actions

> **Lợi ích:** Sau khi setup xong, mỗi lần `git push origin main` sẽ tự động build image trên GitHub, push lên Container Registry, SSH vào server và rolling update. Bạn không cần SSH vào server thủ công nữa.

### 11.1 Tạo PAT cho server pull image từ GHCR

1. Trên máy bạn, vào https://github.com/settings/tokens → **Generate new token (classic)**
2. Note: `smtts-ghcr-pull`
3. Expiration: 1 year
4. Scopes: chỉ tích **`read:packages`**
5. Generate → **copy token** ngay (chỉ hiện 1 lần)

### 11.2 Khai báo GitHub Secrets cho repo

Vào repo trên GitHub → **Settings → Secrets and variables → Actions → New repository secret**

Thêm 7 secret:

| Tên Secret | Giá trị |
|------------|---------|
| `DEPLOY_HOST` | `134.209.180.45` (IP server) |
| `DEPLOY_USER` | `smtts` |
| `DEPLOY_SSH_KEY` | **Toàn bộ nội dung** file `~/.ssh/smtts_deploy` (private key, kể cả dòng `-----BEGIN/END-----`) |
| `DEPLOY_PORT` | `22` |
| `DEPLOY_PATH` | `/opt/smtts` |
| `GHCR_USER` | GitHub username của bạn (chữ thường) |
| `GHCR_TOKEN` | Token tạo ở 11.1 |

> **Cách lấy nội dung private key trên Windows:**
> ```bash
> cat ~/.ssh/smtts_deploy
> ```
> Copy toàn bộ output (gồm `-----BEGIN OPENSSH PRIVATE KEY-----` và `-----END...`) paste vào ô Secret.

### 11.3 Tạo Environment `production`

Trong repo: **Settings → Environments → New environment** → đặt tên `production`. (Có thể bật "Required reviewers" nếu muốn duyệt tay trước khi deploy.)

### 11.4 Cập nhật REGISTRY_PREFIX trên server

```bash
ssh smtts
nano /opt/smtts/code/docker/.env.prod
```

Sửa:
```dotenv
REGISTRY_PREFIX=ghcr.io/<github-username-lowercase>
```

> `<github-username-lowercase>` phải viết thường, ví dụ `voanhkhoi91b` không phải `VoAnhKhoi91B`.

### 11.5 Login GHCR trên server

Để pull image private:
```bash
echo "<GHCR_TOKEN-vừa-tạo>" | docker login ghcr.io -u <github-username> --password-stdin
```

Output: `Login Succeeded`

### 11.6 Push thử để kích workflow

Trên máy local:
```bash
cd /e/DATN_20252
git commit --allow-empty -m "ci: trigger first deploy"
git push origin main
```

Vào tab **Actions** trên GitHub:
- Job `changes` → `build-backend`/`build-web`/`build-face` → `deploy`
- Click vào từng job xem log

Workflow chạy lần đầu mất ~10–15 phút (build cache trống). Lần sau ~3–5 phút.

### 11.7 Kiểm tra image đã có trên GHCR

Vào trang GitHub profile/org của bạn → tab **Packages** → sẽ thấy 3 package: `smtts-backend`, `smtts-web`, `smtts-face`.

✅ **Sau bước này:** mỗi lần push lên `main` là server tự update.

---

## Phần 12 — Cài backup tự động

### 12.1 Test script backup thủ công

```bash
ssh smtts
bash /opt/smtts/code/docker/scripts/backup-db.sh
ls -lh /opt/smtts/code/docker/backups/
# main_20260417_xxxxxx.sql.gz
# biometric_20260417_xxxxxx.sql.gz
```

### 12.2 Cài cron chạy 3h sáng hàng ngày

```bash
crontab -e
# Lần đầu sẽ hỏi chọn editor → chọn nano (số 1)
```

Thêm dòng:
```cron
0 3 * * * cd /opt/smtts && bash code/docker/scripts/backup-db.sh >> /opt/smtts/code/docker/backups/cron.log 2>&1
```

Lưu, thoát. Kiểm tra:
```bash
crontab -l
```

Script tự giữ 14 bản gần nhất. Mỗi backup ~5–20 MB tùy data.

### 12.3 Tải backup về máy

Trên máy local:
```bash
scp smtts:/opt/smtts/code/docker/backups/main_*.sql.gz ./
```

✅ **Sau bước này:** DB tự backup hàng ngày, có thể tải về.

---

## Phần 13 — Quy trình update khi code thêm

Đây là phần bạn dùng **mỗi tuần / mỗi lần code mới**.

### 13.1 Có CI/CD (đã setup Phần 11)

Trên máy local:
```bash
# Code, commit như bình thường
git add .
git commit -m "feat: add new feature"
git push origin main
```

Mở tab **Actions** trên GitHub xem tiến độ. Sau ~5 phút, mở `https://<domain>` xác nhận thay đổi đã lên.

### 13.2 Không có CI/CD — update thủ công

```bash
ssh smtts
cd /opt/smtts

# Update toàn bộ
bash code/docker/scripts/update.sh

# Hoặc chỉ update 1 service (nhanh hơn, ít downtime)
bash code/docker/scripts/update.sh backend
bash code/docker/scripts/update.sh web
bash code/docker/scripts/update.sh face
```

Script sẽ:
1. `git pull` source mới
2. `docker compose build <service>`
3. `docker compose up -d --no-deps <service>` → rolling restart đúng container đó
4. Prune image cũ

### 13.3 Khi sửa migration SQL mới

⚠️ **Quan trọng:** init scripts trong `docker-compose.prod.yml` **chỉ chạy khi volume rỗng**. Nếu bạn thêm `013_xxx.sql`, nó sẽ KHÔNG tự apply.

Cách xử lý:
```bash
# Apply thủ công migration mới
docker exec -i smtts-postgres-main \
  psql -U smtts_user -d smtts_main \
  < /opt/smtts/code/scripts/migrations/013_xxx.sql
```

### 13.4 Khi thay đổi `.env.prod`

```bash
cd /opt/smtts/code/docker
nano .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
# Compose tự phát hiện env đổi → recreate container có biến đó
```

### 13.5 Rollback khi update bị lỗi

Nếu dùng CI (image tag = git SHA):
```bash
cd /opt/smtts/code/docker
bash scripts/update-from-registry.sh <git-sha-cũ>
```

Nếu build local:
```bash
cd /opt/smtts
git log --oneline -5     # tìm commit ổn định trước
git reset --hard <commit-sha>
bash code/docker/scripts/update.sh
```

---

## Phần 14 — Troubleshooting

### Lệnh chẩn đoán nhanh

```bash
cd /opt/smtts/code/docker
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

$COMPOSE ps                              # trạng thái
$COMPOSE logs --tail=200 backend         # log gần nhất
$COMPOSE logs -f web                     # follow log realtime
$COMPOSE exec backend sh                 # vào shell trong container
$COMPOSE exec postgres-main psql -U smtts_user -d smtts_main
docker stats                             # CPU/RAM realtime
df -h                                    # đĩa còn trống bao nhiêu
```

### Bảng lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| `502 Bad Gateway` khi gọi API | `backend` chưa healthy | `$COMPOSE logs backend` → thường sai password DB hoặc DB chưa up |
| `web` không hiện, browser timeout | Firewall chặn 80, hoặc cloud provider có firewall riêng | `sudo ufw status`; với DO/Vultr check Networking tab |
| `face-recognition` mãi `health: starting` | Đang load model, hoặc thiếu RAM | Chờ thêm 2 phút; nếu vẫn fail xem `logs face-recognition`, kiểm tra `docker stats` xem có swap không |
| `denied: permission_denied` khi pull image | Chưa login GHCR, hoặc PAT thiếu scope `read:packages` | Login lại theo 11.5 |
| Build face-recognition báo "killed" | Hết RAM khi compile | Build trên máy có ≥ 4 GB; hoặc dùng CI build (Phần 11) |
| Sửa SQL migration không có hiệu lực | Init scripts chỉ chạy 1 lần khi volume rỗng | Apply thủ công bằng `psql` (xem 13.3); hoặc `docker compose down -v` (XÓA DATA) |
| Disk đầy | Image cũ, log Docker tích lũy | `docker system prune -a --volumes`; xem `du -sh /var/lib/docker/*` |
| Đổi `.env.prod` không có tác dụng | Compose cache | `docker compose ... up -d --force-recreate` |
| SSH bị disconnect liên tục | Idle timeout | Trên máy local, thêm `~/.ssh/config`: `ServerAliveInterval 60` |

### Log Docker quá nhiều

Sau vài tuần, log Docker có thể chiếm nhiều GB. Limit log bằng cách thêm vào `/etc/docker/daemon.json`:

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
cd /opt/smtts/code/docker
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

### Health check container "unhealthy"

Xem chi tiết:
```bash
docker inspect --format='{{json .State.Health}}' smtts-backend | jq
```

---

## Tóm tắt: Toàn bộ command từ đầu đến cuối (cheatsheet)

```bash
# === MÁY LOCAL ===
ssh-keygen -t ed25519 -C "smtts-deploy" -f ~/.ssh/smtts_deploy
ssh-copy-id -i ~/.ssh/smtts_deploy.pub root@<IP>
cd /e/DATN_20252 && git push origin main

# === SERVER (lần đầu) ===
ssh smtts@<IP>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && exit
ssh smtts@<IP>
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
sudo mkdir -p /opt/smtts && sudo chown $USER:$USER /opt/smtts
git clone https://github.com/<user>/<repo>.git /opt/smtts
cd /opt/smtts/code/docker
cp .env.prod.example .env.prod
nano .env.prod    # paste 3 secret mạnh
chmod 600 .env.prod
cd /opt/smtts && bash code/docker/scripts/deploy.sh

# === SERVER (mỗi lần update sau này) ===
ssh smtts@<IP>
cd /opt/smtts && bash code/docker/scripts/update.sh

# === Hoặc nếu có CI/CD, chỉ cần ===
git push origin main
```

---

## Bạn cần làm gì tiếp theo?

1. Đọc lướt **Phần 0** để chuẩn bị tài khoản và công cụ
2. Bắt đầu từ **Phần 1**, làm tuần tự đến **Phần 9** → bạn đã có hệ thống chạy
3. Khi cần demo cho thầy hướng dẫn → thêm **Phần 10** (HTTPS) cho đẹp
4. Khi đã ổn định và bắt đầu code thêm thường xuyên → setup **Phần 11** (CI/CD)
5. Trước khi đưa cho người dùng thật → bật **Phần 12** (backup)

Chúc deploy thành công 🚀
