# SMTTS — Subject Management, Tracking & Tracing System

Graduation thesis project (DATN 2025.2). A system for managing, tracking, and tracing subjects under supervision with online check-in via NFC + Face Recognition + GPS.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Demo Accounts](#demo-accounts)
- [Auth Flow](#auth-flow)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | v18+ |
| Docker Desktop | Running |
| Git Bash (Windows) | Or any Unix-compatible shell |

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd code

# Install root dependencies (if applicable)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd web
npm install
cd ..
```

### 2. Start infrastructure (Docker)

```bash
cd docker
docker compose up -d
```

Wait until all 3 containers are healthy:

```bash
docker compose ps
```

| Container | Service | Port |
|---|---|---|
| `smtts-postgres-main` | PostgreSQL (main DB) | `localhost:5434` |
| `smtts-postgres-biometric` | PostgreSQL (biometric DB) | `localhost:5433` |
| `smtts-redis` | Redis (cache & sessions) | `localhost:6379` |

> **Note:** Main DB uses port **5434** (not 5432) to avoid conflict with local PostgreSQL installations.

Docker automatically runs the migration and seed SQL scripts on first startup — no manual database setup needed.

### 3. Configure environment

Create `backend/.env` (or use the existing one):

```env
APP_PORT=3001
APP_ENV=development

DB_HOST=localhost
DB_PORT=5434
DB_NAME=smtts_main
DB_USER=smtts_user
DB_PASS=smtts_secret_2026

JWT_SECRET=<generate-a-random-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_TEMP_EXPIRY=5m

OTP_ISSUER=SMTTS

THROTTLE_TTL=60000
THROTTLE_LIMIT=20
```

### 4. Start backend (NestJS)

```bash
cd backend
npx nest build
node dist/main.js
```

Backend runs at: **http://localhost:3001/api/v1**

> **Windows note:** If `npx nest build` fails with `'"node"' is not recognized`, use the full path:
> ```bash
> node node_modules/.bin/nest build
> # or
> node ../node_modules/@nestjs/cli/bin/nest.js build
> ```

### 5. Start frontend (React + Vite)

Open a **new terminal**:

```bash
cd web
npx vite --host
```

Frontend runs at: **http://localhost:5173**

> Vite proxies all `/api/*` requests to `http://localhost:3001` automatically (configured in `vite.config.ts`).

### 6. Open in browser

Navigate to **http://localhost:5173** and log in with a [demo account](#demo-accounts).

## Project Structure

```
code/
├── backend/                NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/       Login, OTP (TOTP), JWT, refresh tokens
│   │   │   ├── users/      User entity, service, RBAC
│   │   │   ├── dashboard/  Dashboard summary, recent events, open alerts
│   │   │   ├── subjects/   Subject entity (managed individuals)
│   │   │   ├── events/     Event entity (check-ins, violations)
│   │   │   ├── alerts/     Alert entity (triggered by alert rules)
│   │   │   ├── cases/      Case entity (escalated alerts)
│   │   │   └── areas/      Area hierarchy (Province → District → Ward)
│   │   ├── common/         Filters, interceptors, decorators, constants
│   │   └── config/         Database & app configuration
│   └── .env                Environment variables
│
├── web/                    React + Tailwind CSS frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OtpVerifyPage.tsx
│   │   │   ├── SetupOtpPage.tsx
│   │   │   └── dashboard/DashboardPage.tsx
│   │   ├── components/
│   │   │   ├── ui/         Button, Input, Modal, OtpInput, Badge, Skeleton, Toast
│   │   │   ├── domain/     ComplianceChart
│   │   │   ├── navigation/ Breadcrumb, PageHeader
│   │   │   └── data-display/ StatCard, DataCard, EmptyState
│   │   ├── layouts/        AuthLayout, AppLayout, Sidebar, Topbar
│   │   ├── api/            Axios instance, API functions
│   │   ├── stores/         Auth token store
│   │   ├── guards/         Route guards (auth protection)
│   │   ├── providers/      Context providers
│   │   ├── types/          TypeScript interfaces
│   │   └── utils/          Helper utilities
│   └── vite.config.ts      Vite config (proxy, aliases)
│
├── docker/                 docker-compose.yml
├── scripts/
│   └── migrations/         SQL schema + seed data
│       ├── 001_smtts_main_init.sql       Main DB schema (21 tables)
│       ├── 002_smtts_biometric_init.sql  Biometric DB schema (3 tables)
│       ├── 003_seed_data.sql             Areas, users, system configs
│       └── 004_seed_dashboard_data.sql   Subjects, events, alerts, cases
└── shared/                 Shared types (future use)
```

## Architecture

### Tech Stack

| Component | Technology |
|---|---|
| Backend | Node.js + NestJS |
| Frontend | React 19 + Tailwind CSS 4 + Vite 6 |
| Mobile App | Android native (Kotlin) — separate repo |
| Main Database | PostgreSQL 16 |
| Biometric Database | PostgreSQL 16 (isolated, per SBR-18) |
| Cache | Redis 7 |
| Auth | JWT + TOTP (Google Authenticator) |
| Charts | Recharts |

### Core Business Flow

```
Event (auto-logged) → Alert Rule Engine → Alert → Case (auto-escalate or manual)
```

- **Events** — Raw logs: check-ins, failures, overdue, violations
- **Alerts** — Generated when events match alert rules (default + custom)
- **Cases** — Serious violations, created by auto-escalation or manual officer action

### 4-Factor Check-in Authentication

1. **NFC** — CCCD/national ID card chip (passive authentication)
2. **Face** — Liveness detection + face matching
3. **GPS** — Location captured at check-in time only
4. **Timestamp** — Moment of check-in

### Data Scope & RBAC

Officers see data scoped to their jurisdiction:

| Role | Vietnamese | Scope |
|---|---|---|
| IT Admin | Quản trị hệ thống | System-wide |
| Leader | Lãnh đạo | Province/City |
| Management Officer | Cán bộ quản lý | District |
| Field Officer | Cán bộ cơ sở | Ward/Commune |

## Demo Accounts

All accounts use password: **`Admin@123`**

| Username | Role | Scope | OTP Setup |
|---|---|---|---|
| `admin` | IT Admin | System-wide | Required on first login |
| `lanhdao.hcm` | Leader | TP.HCM (Province) | Required on first login |
| `canbo.quanly.q1` | Management Officer | Quan 1 (District) | Required on first login |
| `canbo.coso.bn` | Field Officer | Phuong Ben Nghe (Ward) | Required on first login |

### Seed Data Summary

| Entity | Count | Details |
|---|---|---|
| Users | 4 | One per role |
| Subjects | 8 | Various compliance rates (75-100%) |
| Events | 20 | Spread over 7 days |
| Alerts | 8 | 5 open, 3 resolved |
| Cases | 4 | 2 open, 2 closed |

## Auth Flow

```
Login (/login)
  │
  ├── Officer without OTP setup → /setup-otp (scan QR with Google Authenticator)
  │     └── Verify code → Save backup codes → /dashboard
  │
  ├── Officer with OTP enabled → /login/otp (enter 6-digit code or backup code)
  │     └── Verify → /dashboard
  │
  └── Subject (no OTP needed) → /dashboard
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_PORT` | `3001` | Backend server port |
| `APP_ENV` | `development` | Environment mode |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5434` | PostgreSQL port |
| `DB_NAME` | `smtts_main` | Main database name |
| `DB_USER` | `smtts_user` | Database username |
| `DB_PASS` | — | Database password |
| `JWT_SECRET` | — | Secret key for JWT signing |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
| `JWT_TEMP_EXPIRY` | `5m` | Temp token expiry (pre-OTP) |
| `OTP_ISSUER` | `SMTTS` | TOTP issuer name |
| `THROTTLE_TTL` | `60000` | Rate limit window (ms) |
| `THROTTLE_LIMIT` | `20` | Max requests per window |

## Database

### Main Database (`smtts_main` — port 5434)

21 tables including: `users`, `subjects`, `events`, `alerts`, `cases`, `management_scenarios`, `alert_rules`, `scenario_assignments`, `areas`, `audit_logs`, `devices`, `geofences`, and more.

### Biometric Database (`smtts_biometric` — port 5433)

3 tables: `face_templates`, `nfc_records`, `biometric_logs` — isolated per security requirement SBR-18.

### Resetting the Database

To start fresh with clean seed data:

```bash
cd docker
docker compose down -v    # -v removes all data volumes
docker compose up -d      # Containers re-run init SQL scripts
```

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login with username/password |
| POST | `/auth/verify-otp` | Verify TOTP code |
| POST | `/auth/setup-otp` | Get QR code for OTP setup |
| POST | `/auth/confirm-otp-setup` | Confirm OTP setup with code |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout (invalidate refresh token) |
| POST | `/auth/change-password` | Change password |

### Dashboard (requires authentication)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/summary` | Dashboard stats, compliance trend, scope info |
| GET | `/events/recent?limit=5` | Recent events (max 50) |
| GET | `/alerts/open?limit=5` | Open alerts (max 50) |

## Troubleshooting

### `EADDRINUSE: address already in use :::3001`

A previous backend process is still running. Kill it:

```bash
# Find the process
netstat -ano | grep 3001 | grep LISTEN

# Kill it (replace <PID> with the actual PID)
taskkill //PID <PID> //F
```

### `'"node"' is not recognized` on Windows

The `npx` command can't find Node.js. Either:
- Use Git Bash (not CMD/PowerShell)
- Add Node.js to your system PATH
- Use the full path: `node node_modules/.bin/nest build`

### Docker containers not starting

```bash
# Check container logs
docker logs smtts-postgres-main
docker logs smtts-redis

# Restart from scratch
cd docker
docker compose down -v
docker compose up -d
```

### Database connection refused

Ensure Docker containers are healthy:

```bash
docker compose ps
```

All 3 containers should show `(healthy)` status. If not, wait a few seconds and check again.

## Stopping Everything

```bash
# Stop frontend/backend: Ctrl+C in their terminals

# Stop Docker containers:
cd docker
docker compose down        # Keeps data
docker compose down -v     # Removes all data (fresh start)
```

## License

This project is part of a graduation thesis and is not licensed for commercial use.
