# 04 – Security Upgrade Plan (SMTTS)

> **Mục đích:** Lộ trình nâng cấp bảo mật cho hệ thống SMTTS trước khi triển khai
> chính thức (bảo vệ thông tin công dân theo Nghị định 13/2023/NĐ-CP và các
> thông lệ OWASP ASVS L2). Tài liệu này **chỉ là bản kế hoạch để phê duyệt** –
> chưa lập trình. Sau khi được duyệt mới tiến hành implement.
>
> **Phạm vi:** Backend NestJS (API), Web dashboard (React), Mobile Android,
> Python Face Recognition service, hạ tầng PostgreSQL / Redis / Docker, quy trình
> vận hành.
>
> **Ưu tiên:** `P0` = bắt buộc trước go-live. `P1` = trong 30 ngày sau
> go-live. `P2` = roadmap.

---

## 0. Bản đồ trạng thái hiện tại (gap analysis)

Khảo sát code ngày 2026-04-16 cho thấy các vấn đề cần xử lý:

| # | Vấn đề | Vị trí | Mức độ | Ưu tiên |
|---|--------|--------|--------|---------|
| 1 | HTTP plaintext — không có TLS/HTTPS | `main.ts:36` (`app.listen(port, '0.0.0.0')`) | Lộ JWT, password, CCCD trên đường truyền | **P0** |
| 2 | JWT + Refresh token lưu `localStorage` | `web/src/stores/auth.store.ts` | Vector XSS → đánh cắp session | **P0** |
| 3 | CCCD "encrypted" chỉ là plaintext | `subjects.service.ts:566` (`cccdEncrypted: dto.cccd` — comment "In production: encrypt") | Vi phạm nghị định 13/2023 | **P0** |
| 4 | `JWT_SECRET` mặc định trong `.env.example` là chuỗi yếu | `.env.example:13` | Forgeable token nếu leak repo | **P0** |
| 5 | DB password hard-code default trong `docker-compose.yml` | `docker/docker-compose.yml:14,39` | Nguy cơ lộ credentials | **P0** |
| 6 | CORS mở `origin: true, credentials: true` | `main.ts:16-19` | Mọi origin đều được phép gửi cookie/token | **P0** |
| 7 | Không có Helmet / security headers (CSP, HSTS, X-Frame-Options,…) | `main.ts` | Clickjacking, MIME sniffing, XSS reflect | **P0** |
| 8 | Throttle chỉ áp cho `/auth/login`, `/auth/activate`, `/auth/verify-backup-code` | `auth.controller.ts` | Brute force OTP / refresh / checkin | **P1** |
| 9 | Không có Audit Log đầy đủ (`audit_logs` table có nhưng chưa bắt event) | §12.2 02_FUNCTIONAL_SPEC | Không truy vết được thao tác | **P1** |
| 10 | `ValidationPipe` bật `transform: true` nhưng không có `SanitizeHtml` | `main.ts:23-29` | Stored XSS qua `notes`, `approval_note` | **P1** |
| 11 | Static uploads (`/uploads`) phục vụ trực tiếp, không có auth | `main.ts:14` | Ai có URL đều xem được ảnh CCCD/selfie | **P0** |
| 12 | Face embedding BYTEA không mã hóa | `biometric.service.ts` | Biometric template là dữ liệu nhạy cảm không thể thay đổi | **P1** |
| 13 | Password không có policy (chỉ `MinLength(6)`) | `login.dto.ts:9` | Yếu theo NIST 800-63B | **P1** |
| 14 | Không có test bảo mật tự động (SAST, dep-scan) | CI/CD | Lỗ hổng library không được phát hiện | **P1** |
| 15 | Không có retention/purge cho refresh tokens revoked | `refresh_tokens` | DB phình + lộ lịch sử token nếu leak | **P2** |
| 16 | Device binding chưa verify `deviceId` chống tamper trên mobile | `devices.service.ts` | Spoof device dễ qua emulator | **P2** |

---

## 1. Mã hóa trên đường truyền (Transport Layer)  — **P0**

### 1.1 Triển khai TLS 1.3 cho toàn bộ endpoint

**Mục tiêu:** Mọi traffic giữa client ↔ backend, backend ↔ face-service, backend
↔ database đều được mã hóa, chặn MITM / packet sniffing trên LAN nội bộ và
internet.

**Kế hoạch:**
1. **Reverse proxy Nginx** trước NestJS (pattern chuẩn, không chạy TLS trực tiếp
   trong Node):
   ```
   client ── HTTPS :443 ──▶ Nginx ── HTTP :3000 ──▶ NestJS
                                └──── HTTP :8000 ──▶ face-service
   ```
   - Cert do `certbot` tự động (Let's Encrypt, auto-renew 60 ngày).
   - Trường hợp chạy nội bộ (không có domain public) → dùng internal CA
     (step-ca hoặc openssl self-signed + phân phối CA root cho máy officer).
2. **Cấu hình Nginx** (sẽ đưa vào `docker/nginx/conf.d/smtts.conf`):
   - `ssl_protocols TLSv1.2 TLSv1.3;` (cắt SSLv3/TLS1.0/1.1).
   - `ssl_ciphers` theo Mozilla "Intermediate" preset.
   - `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`
   - `ssl_stapling on` + `resolver 1.1.1.1 8.8.8.8 valid=300s;`.
   - Redirect `http://` → `https://` (301).
3. **Backend chỉ bind 127.0.0.1** (sửa `main.ts:36` — không expose 0.0.0.0).
4. **Database** PostgreSQL bật `ssl = on`, Redis bật TLS nếu deploy đa node.
   Trong single-host Docker compose giữ plaintext nhưng chỉ expose qua docker
   network nội bộ (bỏ `ports:` trong production compose).
5. **Face-service** chỉ lắng nghe trên docker network nội bộ; nếu cross-host thì
   dùng mTLS giữa backend ↔ face-service.

**Tiêu chí chấp nhận:**
- `curl http://<domain>/api/v1/health` → 301 redirect.
- [SSL Labs](https://www.ssllabs.com/ssltest/) (hoặc `testssl.sh` cho internal) đạt **A**.
- `nmap --script ssl-enum-ciphers -p 443 <domain>` không còn cipher `TLS_RSA_*`, `3DES`, `RC4`.

### 1.2 Certificate pinning trên Mobile  — **P1**

- Android app pin SHA-256 public key của server cert qua `NetworkSecurityConfig`.
- Cấp 2 pin (current + backup) để tránh brick nếu renew.
- Áp dụng cho tất cả endpoint `/api/v1/*`, đặc biệt `/auth/*` và `/checkin`.

---

## 2. Xác thực & Quản lý phiên (AuthN/Session) — **P0**

### 2.1 Chuyển refresh token sang HttpOnly cookie

**Vấn đề hiện tại:** Web lưu `accessToken` + `refreshToken` trong `localStorage`.
Một XSS duy nhất là mất toàn bộ phiên + khả năng refresh vô hạn → attacker duy
trì quyền truy cập bất kể chủ tài khoản logout.

**Đề xuất:**
- Access token (15m) vẫn trả JSON → web giữ trong **memory React context**, không
  ghi storage. Khi refresh tab → gọi `/auth/refresh` (cookie tự gửi).
- Refresh token (7d) set qua HTTP-only, Secure, SameSite=Strict cookie:
  ```
  Set-Cookie: smtts_rt=<random>; HttpOnly; Secure; SameSite=Strict;
              Path=/api/v1/auth; Max-Age=604800
  ```
- Backend đọc cookie bằng `cookie-parser`. Không còn body field `refreshToken`.
- **CSRF mitigation** (do cookie có thể bị CSRF): áp double-submit token trên
  các endpoint mutating (xem §2.3) HOẶC dựa vào `SameSite=Strict` + không
  redirect nào dẫn về form POST từ external origin.

### 2.2 Refresh token rotation có detection

Đã có `revoked` column. Bổ sung:
- Mỗi lần refresh thành công: đánh dấu token cũ `revoked=true`, chèn token mới
  với `parent_id` liên kết → tạo "token family".
- Nếu một token đã `revoked` bị reuse → **thu hồi toàn bộ family** + ghi
  `audit_logs` event `REFRESH_REUSE_DETECTED` + buộc user login lại.
- Endpoint `/auth/logout` xoá cookie + revoke token trong DB (đã có logic revoke,
  cần thêm `Set-Cookie: smtts_rt=; Max-Age=0`).

### 2.3 CSRF protection

Áp dụng chỉ khi đã chuyển refresh token sang cookie:
- Backend sinh CSRF token (random 32 bytes) → trả về qua header `X-CSRF-Token`
  ở response của `/auth/login` và `/auth/refresh`.
- Web lưu trong memory, gửi kèm header `X-CSRF-Token` cho mọi request mutating.
- Backend dùng `CsrfMiddleware` so khớp header vs cookie `smtts_csrf`
  (double-submit).
- Mobile app không bị ảnh hưởng (dùng Bearer token).

### 2.4 Password policy

- Tăng `MinLength` lên **12** cho officer, **10** cho subject (subject dùng CCCD
  làm username, password thường yếu hơn).
- Kiểm tra qua `zxcvbn-ts` score ≥ 3 ở frontend, enforce strength ở backend.
- Cấm reuse 5 password gần nhất (cần bảng `password_history` — schema có sẵn
  chưa dùng).
- Rotation: yêu cầu officer đổi password mỗi 180 ngày (tùy chọn, theo chính
  sách của đơn vị).

### 2.5 Rate limiting / brute force

- Mở rộng `@UseGuards(ThrottlerGuard)` cho:
  - `POST /auth/verify-otp` (5 req / 15 phút / IP+user).
  - `POST /auth/refresh` (30 req / 5 phút / IP).
  - `POST /checkin` (20 req / phút / subject — chống replay flood).
  - `POST /enrollment/face` (3 req / phút / subject).
- Lock account sau **10 lần sai password trong 30 phút** (hiện 5 lần). Lý do:
  officer có thể gõ sai do phím cứng, 5 là hơi khắt khe.
- Thêm CAPTCHA (hCaptcha) trên web login khi `failed_login_count ≥ 3`.

---

## 3. Bảo vệ dữ liệu nhạy cảm (PII & Biometric) — **P0/P1**

### 3.1 Mã hóa CCCD ở tầng ứng dụng

**Hiện trạng:** `subjects.cccd_encrypted` là plaintext, chỉ có `cccd_hash`
SHA-256 để lookup.

**Thiết kế:**
- Dùng AES-256-GCM qua `node:crypto` (đã có sẵn, không thêm dep).
- Key 32 bytes lưu trong KMS (HashiCorp Vault / AWS KMS); staging có thể tạm
  dùng env `PII_ENCRYPTION_KEY` (base64).
- Mỗi record có IV riêng (12 bytes random) lưu cùng ciphertext:
  ```
  cccd_encrypted = base64( iv (12) || ciphertext || authTag (16) )
  ```
- `cccd_hash` giữ nguyên để lookup (`findOne`, uniqueness index).
- Viết `CryptoService` (common module) với method `encryptPii/decryptPii`.
- **Migration** `011_encrypt_existing_cccd.sql` + script Node chạy 1 lần:
  đọc plaintext → encrypt → update. Có dry-run + rollback plan.
- Trong service `formatCccd()` hiện mask 3 số giữa. Sau migration:
  - Default mask cho role `CAN_BO_CO_SO`, `VIEWER`.
  - Unmask cho `IT_ADMIN`, `LANH_DAO`, `CAN_BO_QUAN_LY` (có ghi `audit_logs`
    event `PII_DECRYPTED`).

### 3.2 Key rotation

- Khóa mã hóa PII xoay 12 tháng/lần.
- Schema cho phép đa key: `cccd_encrypted` prefix `v1:`, `v2:` → CryptoService
  chọn key theo version; migration dần trong nền.

### 3.3 Biometric templates (face embedding)

- Face embedding là dữ liệu sinh trắc **không thay đổi được** → leak = vĩnh viễn.
- Đã isolate sang `smtts_biometric` DB (SBR-18) — tốt.
- Tăng thêm:
  - Encrypt BYTEA embedding bằng key riêng `BIO_ENCRYPTION_KEY` (AES-256-GCM).
  - `smtts_biometric.face_templates.embedding` đổi sang `TEXT` chứa ciphertext
    base64; verify thành Float32Array chỉ trong memory khi `checkin`.
  - CSCA signature (Passive Auth) không lưu plain — đã lưu BYTEA, cần encrypt
    luôn `nfc_records.passive_auth_data`.
- Database encryption at rest: PostgreSQL bật TDE (nếu dùng bản Enterprise) hoặc
  mã hóa volume (LUKS) — tối thiểu một lớp.

### 3.4 Upload files (ảnh chân dung, tài liệu)

**Vấn đề:** `app.useStaticAssets('uploads')` public toàn bộ — ai đoán URL là xem
được CCCD chip photo.

**Đề xuất:**
- Bỏ `useStaticAssets`.
- Tạo endpoint `GET /files/:fileId` có guard JWT + check `files.entity_type/id`
  so với data scope của user. Trả file qua `StreamableFile` với header
  `Content-Disposition: inline`.
- File lưu **ngoài web-root** (vd `/var/smtts/uploads`) để không thể serve nhầm.
- Ảnh DG2 face + selfie lưu vào volume đã encrypt (xem §3.3).
- Thumbnail chỉ sinh theo nhu cầu, cache có TTL ngắn.

### 3.5 Data retention & xóa

- Chính sách lưu trữ: `biometric_logs`, `face_templates`, `nfc_records` giữ tối
  đa **5 năm** sau khi subject chuyển `KET_THUC` (phù hợp luật quản lý giám sát).
- Job nền (Schedule Module đã có): mỗi ngày 02:00 quét + soft-delete record quá
  hạn, sau 30 ngày thì hard-delete khỏi `smtts_biometric`.
- Audit log của việc xóa lưu trong `smtts_main.audit_logs` — không xóa.

---

## 4. Security headers & middleware HTTP — **P0**

### 4.1 Helmet

Thêm `helmet` + config chặt:
```ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],          // bỏ 'unsafe-inline' khi Vite prod build
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind JIT inline OK nếu nonce hoá
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://maps.googleapis.com'],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy:  { policy: 'same-origin' },
  crossOriginResourcePolicy:{ policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
```

### 4.2 CORS strict

Thay `origin: true`:
```ts
const allowed = [
  configService.get('WEB_ORIGIN'),   // https://smtts.example.gov.vn
];
app.enableCors({
  origin: (origin, cb) =>
    !origin || allowed.includes(origin) ? cb(null, true) : cb(new Error('CORS')),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 600,
});
```
Mobile app không gửi `Origin` header → OK.

### 4.3 Request size & timeout

- Body JSON limit `1mb` (hiện mặc định `100kb` của Nest/Express, nhưng multer
  dùng 10MB cho face image — đã check).
- `timeout: 30s` cho mọi request qua nginx `proxy_read_timeout 30s;`.
- Face service timeout 20s (đã có trong `FaceRecognitionClient`, verify lại).

---

## 5. Input validation & output encoding — **P1**

### 5.1 Validation

Hiện đã dùng `class-validator` + `whitelist + forbidNonWhitelisted`. Bổ sung:
- Tất cả field text tự do (`notes`, `approval_note`, `rejection_note`, `reason`)
  → `@IsString() + @MaxLength(1000) + @Matches(/^[\p{L}\p{N}\s\p{P}]+$/u)` (chặn
  control chars).
- `cccd`: `@Matches(/^[0-9]{12}$/)`.
- `phone`: `@Matches(/^(0|\+84)[0-9]{9,10}$/)`.
- File upload: giữ MIME + magic-byte check (thư viện `file-type`) — hiện chỉ
  check extension/MIME header dễ bị giả.

### 5.2 Chống SSRF / URL injection

- `FaceRecognitionClient` URL load từ `FACE_SERVICE_URL` — cố định qua env, OK.
- Nếu sau này cho officer upload ảnh từ URL → allowlist domain.

### 5.3 Chống SQL injection

TypeORM có parametric binding, code hiện tại dùng placeholder `$1, $2, …` trong
`dataSource.query()` — OK. Quy tắc:
- Cấm string-concat vào query. Sẽ thêm ESLint rule `sql-template-strings`.
- `SELECT * FROM users WHERE data_scope_level = '${...}'` sẽ bị flag.

### 5.4 Chống XSS trên web

- React mặc định escape, nhưng:
  - Cấm `dangerouslySetInnerHTML` (thêm ESLint rule
    `react/no-danger`: error).
  - Khi render `notes` có xuống dòng → dùng `white-space: pre-wrap`, không
    `innerHTML`.
  - Nếu cần render markdown (biên bản hiện trường) → dùng `react-markdown` +
    `rehype-sanitize`.

### 5.5 Stored XSS trong notifications / audit

- `notifications.message` có thể chứa tên người dùng — sanitize ở backend trước
  khi insert.
- `audit_logs` bản thân không hiển thị trực tiếp, nhưng cần escape khi export
  Excel (tránh CSV injection: prefix `=`, `+`, `-`, `@` với `'`).

---

## 6. Authorization & data scope — **P1**

### 6.1 Kiểm tra scope ở mọi endpoint mutating

- Hiện có `checkOfficerAreaScope()` ở `EnrollmentService`, áp không đều.
- Kế hoạch: tạo `@AreaScopeGuard({ entity: 'subjects', param: 'id' })` dùng
  chung, kiểm tra `subject.areaId` nằm trong `areasService.resolveAreaIds()`
  của officer trước khi cho qua.
- Áp dụng cho: `subjects/*`, `events/*`, `alerts/*`, `cases/*`, `enrollment/*`,
  `requests/*`, `files/*`.
- E2E test cover: officer quận Hà Đông không được sửa subject quận Đống Đa.

### 6.2 Privilege escalation

- Endpoint `PATCH /users/:id` hiện chưa có guard ngăn user tự nâng quyền mình
  (`role: IT_ADMIN`). Cần:
  - Cấm thay đổi `role`, `data_scope_level`, `area_id` qua `/users/me`.
  - Chỉ `IT_ADMIN` mới được update các field đặc quyền này của user khác.

### 6.3 IDOR (Insecure Direct Object Reference)

- Endpoint `GET /subjects/:id`, `GET /files/:id`, `GET /cases/:id`, … phải check
  data scope trước khi trả 200 — tránh lộ UUID là xem được.
- E2E test: request `GET /subjects/<otherAreaId>` → 403, không phải 200.

---

## 7. Audit log toàn diện — **P1**

### 7.1 AuditLogInterceptor

- Tạo `@Auditable('SUBJECT.UPDATE')` decorator + global interceptor:
  - Bắt user (`JwtPayload`), action name, entity id (từ `@Param`), body diff.
  - Ghi vào `audit_logs` bất đồng bộ (không block response).
- Áp cho tất cả mutating endpoint (POST/PATCH/DELETE).

### 7.2 Bảo vệ audit log

- `audit_logs` **append-only** (SBR-17) — thêm trigger DB chặn `UPDATE/DELETE`
  trên bảng này (`CREATE RULE no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;`).
- Backup audit log ra object storage read-only (MinIO / S3 Glacier) hằng tuần.

### 7.3 Alert bất thường

- Log các sự kiện nhạy cảm: `LOGIN_FAILED` ≥ 10/15p, `PII_DECRYPTED` spike,
  `REFRESH_REUSE_DETECTED`, `ROLE_CHANGED`, `ENROLLMENT_RESET`.
- Forward sang Grafana Loki / syslog; IT admin xem qua trang `/audit-logs` (v3).

---

## 8. Secrets & cấu hình — **P0**

### 8.1 Secrets không bao giờ vào git

- Audit: `git log --all --pretty=format: --name-only --diff-filter=A | rg -i
  'env|secret|pem|key'` để kiểm tra lịch sử repo. Nếu có file nhạy cảm từng commit
  → dùng `git-filter-repo` purge + rotate toàn bộ key.
- Thêm file `.gitignore` đầy đủ: `.env`, `.env.*`, `*.pem`, `*.key`, `credentials/`.
- Pre-commit hook `gitleaks` quét diff.

### 8.2 Quản lý secret production

- Dùng Docker Swarm secrets hoặc HashiCorp Vault KV v2. Tối thiểu: Docker
  Compose `secrets:` + file ngoài repo.
- Secrets cần rotate:
  - `JWT_SECRET` (64 bytes random) — rotation → revoke mọi refresh token.
  - `DB_PASS`, `BIO_DB_PASS`.
  - `PII_ENCRYPTION_KEY`, `BIO_ENCRYPTION_KEY`.
- Mỗi key có `kid` (key id) để support key rotation smooth.

### 8.3 Environment hardening

- Docker container: `read_only: true` filesystem, chỉ cho ghi `uploads`, `tmp`
  volumes.
- `user: node:node` (không chạy root).
- Network: backend ↔ postgres qua docker internal network; không expose port
  PostgreSQL ra host production.

---

## 9. Mobile app — **P1**

### 9.1 Storage

- Token lưu `EncryptedSharedPreferences` + Android Keystore, không dùng
  `SharedPreferences` thường.
- File ảnh selfie tạm: lưu `context.filesDir` (private), xóa sau upload.

### 9.2 Root / tamper detection

- `SafetyNet Attestation API` (hoặc Play Integrity) ở bước `/auth/activate` và
  `/checkin`. Nếu root/emulator → block, log event `DEVICE_COMPROMISED`.
- Chặn screenshot ở các màn CCCD / selfie bằng `FLAG_SECURE`.

### 9.3 NFC chain of trust

- Xác minh Passive Auth chữ ký CSCA trước khi chấp nhận chip data. Hiện mới lưu
  SOD nhưng chưa verify signature → implement trong
  `enrollment.service.ts:enrollNfc`.
- Đối chiếu CSCA public key với danh sách CSCA chính thức của Bộ Công An.

---

## 10. DevSecOps & CI/CD — **P1**

| Stage | Tool | Output |
|-------|------|--------|
| Pre-commit | `gitleaks`, `eslint-plugin-security` | Chặn secret / pattern nguy hiểm |
| Build | `npm audit`, `snyk test`, `osv-scanner` | Báo lỗ hổng dependency |
| SAST | `semgrep --config auto`, CodeQL (GitHub) | Phân tích code bảo mật |
| Docker image | `trivy image smtts-backend:*` | CVE của base image |
| DAST (staging) | OWASP ZAP baseline scan tuần | Phát hiện lỗ hổng runtime |
| Secrets in runtime | Docker secret / Vault | Không env trực tiếp |

- CI phải fail nếu có CVE critical/high chưa có fix.
- `package.json` pin version (`^` → `~` cho deps an ninh nhạy cảm: `bcryptjs`,
  `jsonwebtoken`, `helmet`, `class-validator`).

---

## 11. Giám sát & ứng cứu sự cố — **P1/P2**

- **Logging:** backend ghi JSON structured → pipe vào Loki. Mask PII trước khi
  log (không log `req.body.cccd`, `password`).
- **Metrics:** Prometheus `/metrics` endpoint (auth: internal only), dashboard
  Grafana: login failure rate, 4xx/5xx, request latency, DB connection pool.
- **Alerting:** Alertmanager → email IT team khi:
  - Login failure > 50/5p toàn hệ thống.
  - HTTP 5xx > 1% trong 5p.
  - Disk < 20%, DB replication lag > 30s.
- **Incident runbook** (SKIPPED_FLOWS.md hiện chưa có): tạo
  `docs/INCIDENT_RESPONSE.md` với playbook: leak JWT, DB breach, ransomware,
  DDoS, phishing cán bộ.
- **Backup:** PostgreSQL base backup hằng đêm (pgBackRest / WAL-G), retention 30
  ngày, test restore hằng tháng. Backup mã hóa GPG.

---

## 12. Tuân thủ pháp luật Việt Nam — **P0**

- **Nghị định 13/2023/NĐ-CP về BVDL cá nhân:**
  - Có "Thông báo xử lý dữ liệu cá nhân" hiển thị cho subject khi `/auth/activate`.
  - Có chức năng xuất dữ liệu cá nhân của subject (`GET /subjects/me/export`).
  - Có flow yêu cầu xóa dữ liệu + phê duyệt leader.
- **Chữ ký CSCA CCCD:** phải verify bằng CSCA của Bộ Công An (xem §9.3).

---

## 13. Testing kế hoạch trước go-live

| Test | Loại | Deliverable |
|------|------|-------------|
| Internal pentest | Black-box / grey-box | Report + fix-list |
| OWASP ASVS L2 checklist | Self-assessment | Bảng đối chiếu 40+ control |
| Load test với k6 | Performance + rate limit | 500 concurrent check-in ổn định |
| Chaos: kill face-service | Resilience | Checkin fail graceful, không lộ stack trace |
| Privacy review (DPO) | Compliance | Ký duyệt DPIA |

---

## 14. Timeline đề xuất

```
Tuần 1-2  (P0 phần 1) : TLS + Helmet + CORS strict + secrets hardening
Tuần 3-4  (P0 phần 2) : CCCD encryption migration + file access guard
Tuần 5-6  (P0 phần 3) : Refresh token cookie + CSRF + rotation detection
Tuần 7-8  (P1 phần 1) : Audit log interceptor + area scope guard phủ hết
Tuần 9-10 (P1 phần 2) : Biometric encryption + mobile pinning + SafetyNet
Tuần 11   : Pentest nội bộ + fix critical
Tuần 12   : Load test + final review
           → go-live
```

---

## 15. Checklist ra quyết định (cho người duyệt)

Trước khi approve, xác nhận các điểm sau:

- [ ] Domain public + SSL cert đã sẵn sàng (Let's Encrypt hoặc internal CA)?
- [ ] Chọn giải pháp KMS: Vault, AWS KMS, hay env + Docker secret?
- [ ] Ngân sách cho pentest bên thứ ba hay tự làm nội bộ?
- [ ] Chấp nhận thời gian downtime ~30p cho migration mã hóa CCCD?
- [ ] Mobile app update bắt buộc (force-update) cho phiên bản có cert pinning?
- [ ] DPO / pháp chế đã review nội dung thông báo xử lý dữ liệu cá nhân?
- [ ] Có sẵn runbook incident + danh sách liên lạc khẩn?

---

## 16. Risks khi KHÔNG nâng cấp

Để tham khảo khi ra quyết định:

1. **JWT + CCCD bay plaintext qua WiFi công cộng** → chặn bởi MITM, lộ dữ liệu
   công dân (rủi ro hành chính + pháp lý).
2. **XSS nhỏ = chiếm phiên IT_ADMIN** → kẻ tấn công xóa/chỉnh mọi case, alert.
3. **Leak database dump** = lộ CCCD 12 số của hàng nghìn đối tượng (hiện là
   plaintext) → khả năng bị khởi tố theo NĐ 13/2023.
4. **Refresh token không rotation** = một lần lộ là kéo dài vô hạn (7 ngày × N).
5. **File uploads public** = khai thác bằng enum UUID, lộ ảnh CCCD + selfie.

---
