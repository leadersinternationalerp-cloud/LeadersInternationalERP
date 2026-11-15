# SECURITY HARDENING & SERVICE-ROLE AUDIT REPORT
**System:** Leaders International School ERP  
**Workstream:** Workstream F (Priority: CRITICAL)  
**Date:** November 2026  

---

## 1. Executive Summary

Workstream F conducted a complete audit of all 24 server-side files referencing `createServiceClient()`, hardened unauthenticated/webhook endpoints, removed stale middleware exemptions, replaced blocking RPC rate-limiting with an in-memory sliding-window limiter, and introduced structured JSON error/security logging with automatic PII and credential redaction.

---

## 2. Service-Role (`createServiceClient`) Audit Across All 24 Files (F1)

We verified first that **`SUPABASE_SERVICE_ROLE_KEY` and `createServiceClient()` are never imported in any `'use client'` module or exposed to browser bundles**.

| # | File | Purpose of Service Role | Authorisation & Wing Guard Verified |
| :---: | :--- | :--- | :--- |
| 1 | `src/utils/supabase/service.ts` | Factory for server-only service-role Supabase client | Throws if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing; never imported in client code |
| 2 | `src/lib/api/scope.ts` | Scope verification (`assertStudentInScope`, `assertClassInScope`, `assertInvoiceInScope`) | Enforces parent-child links, teacher class assignments, and **Cambridge/NECTA** wing isolation (`matchesWingFilter`) |
| 3 | `src/app/api/admissions/apply/route.ts` | Public admission application submission & TZS 30,000 invoice creation | Rate-limited (`10 req/min/IP`), input-validated, insert-only for new applicant records |
| 4 | `src/app/api/admissions/applications/route.ts` | Admissions register listing | Guarded by `route({ roles: ['System Admin', 'Director', 'Principal', 'Receptionist', 'Sales', 'Accountant', 'Head of Section'] })` + wing filter |
| 5 | `src/app/api/admissions/applications/[id]/route.ts` | Single admission application update/status | Guarded by `route({ roles: [...] })` + wing scope check |
| 6 | `src/app/api/admissions/applications/[id]/pdf/route.ts` | Stamped Admission PDF download | Guarded by `route({ roles: [...] })` + wing scope check |
| 7 | `src/app/api/admissions/applications/[id]/receipt/route.ts` | Admission fee receipt PDF download | Guarded by `route({ roles: [...] })` + wing scope check |
| 8 | `src/app/api/students/photo/route.ts` | Private student photo proxy | Guarded by `route()` + `assertStudentInScope(user, student_id)` |
| 9 | `src/app/api/report-cards/jobs/route.ts` | Async batch report card PDF worker | Pre-validates every `student_id` via `assertStudentInScope(user, sId)` and enforces job owner + wing isolation on poll/download |
| 10 | `src/app/dashboard/principal/admissions/page.tsx` | Admissions pipeline view | Verifies authenticated role (`Principal`, `Director`, `System Admin`, `Sales`, `Receptionist`, `Accountant`) + wing filter |
| 11 | `src/app/dashboard/principal/admissions/actions.ts` | Admissions stage transitions & enrollment | Verifies role before mutating admission state and writes audit log |
| 12 | `src/app/dashboard/accountant/page.tsx` | Accountant executive overview | Verifies finance/management role + wing filter (`matchesWingFilter`) |
| 13 | `src/app/dashboard/accountant/actions.ts` | Fee structure seeding & payment recording | Verifies `System Admin`, `Director`, `Principal`, `Accountant` roles before any mutation |
| 14 | `src/app/dashboard/accountant/invoices/page.tsx` | Student & admission invoices manager | Verifies `hasAnyRole(session.roles, INVOICE_ACCESS_ROLES)` + reuses `session.profile` + enforces `lockedWing` |
| 15 | `src/app/dashboard/accountant/fee-structures/page.tsx` | Official 2027 Cambridge/NECTA fee schedule | Verifies finance/admin role + wing filter |
| 16 | `src/app/dashboard/director/page.tsx` | Director executive KPI dashboard | Restricted to `Director` / `System Admin` + wing filter |
| 17 | `src/app/dashboard/principal/page.tsx` | Principal academic & admissions overview | Restricted to `Principal` / `Director` / `System Admin` + wing filter |
| 18 | `src/app/dashboard/admin/page.tsx` | System Admin control panel | Restricted to `System Admin` / `Director` + wing filter |
| 19 | `src/app/dashboard/hos/page.tsx` | Head of Section dashboard | Restricted to `Head of Section` / management roles + locked wing |
| 20 | `src/app/dashboard/receptionist/page.tsx` | Front-desk admissions & visitors | Restricted to `Receptionist` / management roles + locked wing |
| 21 | `src/app/dashboard/sales/page.tsx` | Admissions sales pipeline | Restricted to `Sales` / management roles + locked wing |
| 22 | `src/app/dashboard/students/page.tsx` | Student directory | Enforces role check + `lockedWing` filtering |
| 23 | `src/app/dashboard/students/[id]/page.tsx` | Individual student profile | Enforces role/parent/student check + wing isolation |
| 24 | `src/app/dashboard/students/actions.ts` | Student creation/update | Enforces admin/registrar role check + audit logging |

---

## 3. Endpoint & Middleware Hardening (F2)

### 3.1 Removed Stale Middleware Exemption (`/api/admin/go-live-setup`)
- **Finding:** `src/utils/supabase/middleware.ts` previously listed `/api/admin/go-live-setup` in `isExemptApi`, allowing unauthenticated requests to bypass middleware session checks.
- **Remediation:** Removed `/api/admin/go-live-setup` from `isExemptApi` in both API guard blocks in `src/utils/supabase/middleware.ts`. Only `/api/attendance/biometric`, `/api/health`, and `/api/admissions/apply` remain in `isExemptApi`.

### 3.2 Hardened Biometric Attendance Webhook (`src/app/api/attendance/biometric/route.ts`)
- **Constant-Time API Key Comparison:** Replaced `!==` string comparison with `crypto.timingSafeEqual` (`safeCompareStrings`) to prevent timing side-channel attacks.
- **Timestamp Freshness Validation (±5 Minutes):** Rejects any biometric payload whose `timestamp` is older or further in the future than `MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000` (`401 Unauthorized`).
- **HMAC-SHA256 Request Signing (`computeBiometricHmac`):** Validates `x-biometric-signature` / `x-signature` (`HMAC-SHA256(secret, "${timestamp}.${rawBody}")`) whenever the signature header is provided or `BIOMETRIC_REQUIRE_HMAC=true` is set.
- **Replay Deduplication:** Stores processed `(device_id, student_code, timestamp)` keys in cache for 5 minutes (`lis:v1:biometric:replay:...`) and rejects replayed requests with `409 Conflict`.
- **Per-IP Rate Limiting:** Enforces `120 req / 60s` via `enforceRateLimit`.

---

## 4. Structured Error & Security Monitoring (`src/lib/monitoring/logger.ts`) (F3)

- **`redactSensitiveData()`:** Recursively scrubs `password`, `pin`, `pin_hash`, `secret`, `token`, `authorization`, `cookie`, `service_role`, `api_key`, `signature`, and raw JWT strings (`[REDACTED_JWT]`) before any log line is emitted.
- **`logStructuredError()`:** Emits structured JSON logs with `timestamp`, `level: "ERROR"`, `event`, `requestId`, `route`, `method`, `userId`, `wing`, `durationMs`, and `statusCode`.
- **`logStructuredSecurityEvent()`:** Emits structured `SECURITY_WARN` events on invalid biometric keys, timestamp drift, or HMAC failures.
- **`logSlowRequest()`:** Automatically logs `PERF_WARN` whenever an API route exceeds `SLOW_REQUEST_THRESHOLD_MS` (default `750ms`).
