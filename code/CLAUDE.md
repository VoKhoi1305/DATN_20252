# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SMTTS** (Subject Management, Tracking & Tracing System) — A system for managing, tracking, and tracing subjects under supervision. Graduation thesis project (DATN 2025.2).

The system has three main components:
1. **Mobile App** (Android/Kotlin) — Used by supervised subjects for online check-ins via NFC (CCCD/national ID card) + Face Recognition + GPS
2. **Web Dashboard** (React + Tailwind) — Responsive web for officers: full management on desktop, field notes/photos on mobile browser
3. **Backend API** (NestJS/Node.js) — RESTful API, Scenario Engine, Biometric processing, Event/Alert/Case pipeline

## Architecture

### Core Business Flow
```
Event (auto-logged) → Alert Rule Engine → Alert → Case (auto-escalate or manual)
```
- **Events**: Raw logs of all occurrences (check-ins, failures, overdue, etc.)
- **Alerts**: Generated when Events match Alert Rules (default rules always present + custom rules)
- **Cases**: Serious violations — created by auto-escalation (SYSTEM) or manual officer action
- **Scenario Engine**: Officers build Management Scenarios (check-in rules, geofence, curfew) + Alert Scenarios (which events trigger alerts, auto-escalation thresholds)

### Tech Stack
| Component | Technology |
|-----------|-----------|
| Backend | Node.js with NestJS |
| Frontend Web | React + Tailwind CSS |
| Mobile App | Android native (Kotlin) |
| Database | PostgreSQL (main) + separate PostgreSQL for biometric data |
| Cache | Redis (sessions, scenarios, geofence, dashboard) |
| Maps | Google Maps API (fallback: OpenStreetMap + Leaflet) |
| Search | Custom query engine with AND/OR operators, full-text (`=`), fuzzy (`~`), negation (`!=`, `!~`) |
| Auth | JWT + refresh tokens; TOTP (Google Authenticator) for all officers |
| Face Recognition | Lightweight on-device model (TensorFlow Lite) |
| Deployment | Docker containers on self-hosted server |

### Data Scope & RBAC
- Dashboard is **scoped by jurisdiction** — officers see only their assigned area by default
- Extended search across system requires elevated permissions
- Hierarchy: Ward/Commune → District → Province/City
- Roles: IT Admin, Leader, Management Officer, Field Officer, Viewer
- Subjects can only see their own data

### Key Design Principles
1. Officers build scenarios → assign to subjects → system runs autonomously
2. Subjects self-comply: online check-in via NFC + Face (GPS captured at check-in time only, no background tracking)
3. Every occurrence becomes an Event → Alert Rules (default + custom) decide which become Alerts → Alerts may auto-escalate to Cases
4. Officers use responsive web (no separate mobile app for officers)
5. Biometric data is encrypted and stored in a **separate database** (SBR-18)
6. Soft delete only across the entire system (SBR-16)
7. Append-only audit trail for all changes and escalations (SBR-17)

### 4-Factor Authentication for Check-ins
1. NFC chip (real card) — Passive Authentication with digital signature
2. Face (correct person) — Liveness detection + matching
3. GPS (location) — Only captured during check-in
4. Timestamp (moment)

## Analysis Documentation

Detailed business analysis is at `../docs/analysis/deep-dive-analysis.md`. It contains:
- Feature matrix with IDs: SA-01→SA-22 (mobile app), W-01→W-57 (web), B-01→B-21 (backend), SE-01→SE-10 (scenario engine)
- Scenario Engine structure (Management Scenarios + Alert Scenarios with default/custom rules)
- Business flows (enrollment, check-in, alert/case pipeline, approval queue, field work)
- Edge cases and risk analysis
- System business rules (SBR-01→SBR-20)

### MVP Must-Have Features
- SA-01→SA-10: Enrollment + online check-in
- W-01, W-05, W-14, W-18, W-22, W-34, W-36, W-40, W-48: Dashboard, profiles, events, alerts, cases, approvals, timeline, map, admin
- SE-01→SE-07: Scenario Builder basics
- B-01→B-15: All backend services

## Important Business Rules to Enforce in Code

- Every Management Scenario automatically gets 4 default Alert Rules (overdue, face mismatch streak, NFC CCCD mismatch, severe overdue). Officers can adjust parameters but **cannot delete** defaults.
- Auto-escalation levels: HIGH and above auto-create Cases (configurable per scenario). Record escalation source (SYSTEM vs officer name).
- Closing a Case requires: closing note + officer identity + timestamp. Closed Cases are read-only; reopening creates a new linked Case.
- Check-in outside geofence is logged as an Event but does **not** block the check-in (SBR-06).
- Password reset for subjects requires in-person officer verification.
- Device binding: 1 device per subject. Device change requires officer approval.
- CCCD numbers are encrypted at rest; passwords use bcrypt/argon2.

## Language

- The system UI and business logic use **Vietnamese** terminology
- Code, comments, API endpoints, and variable names should be in **English**
- Documentation for the thesis is in Vietnamese
