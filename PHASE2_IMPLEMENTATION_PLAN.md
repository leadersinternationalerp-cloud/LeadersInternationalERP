# PHASE 2 IMPLEMENTATION PLAN — Leaders International School ERP

## 1. Overview & Objectives

This implementation plan governs **Phase 2: Performance, Infrastructure Optimisation & Reliability** for the Leaders International School ERP (`Next.js 16.4.3`, `React 19.2.4`, `TypeScript 5`, `Supabase PostgreSQL 15+`).

All changes strictly preserve:
- Single-school architecture for **Leaders International School** (no multi-tenancy or `tenant_id`).
- Symmetric **Cambridge** and **NECTA** wing isolation and cross-wing filtering.
- Existing hosting arrangement, domain, DNS, Cloudflare, and Supabase Cloud backend.
- All existing academic, financial, administrative, and reporting business logic and data.

---

## 2. Workstream Breakdown

### Workstream A: Authentication and Request Optimisation (Priority: CRITICAL)

- **Existing Implementation**:
  - `src/utils/supabase/middleware.ts` calls `supabase.auth.getUser()` and queries `profiles(role, roles)` on every `/dashboard/*` request.
  - `src/app/dashboard/layout.tsx` calls `supabase.auth.getUser()`, queries `profiles(*)`, and invokes `getWingContext(user.id, profile)`.
  - Individual dashboard pages (`src/app/dashboard/page.tsx`, `director/page.tsx`, `accountant/page.tsx`, `teacher/marks/page.tsx`, `dean/marks-overview/page.tsx`, `hos/marks/page.tsx`, `principal/report-cards/page.tsx`, etc.) create a new Supabase server client and call `supabase.auth.getUser()`, `profiles`, and `getWingContext()` again.
  - **Baseline Measurement**: A single `/dashboard/*` page render triggers **3 `auth.getUser()` calls**, **3 `profiles` table queries**, and **2 `getWingContext()` executions** (6–8 redundant round trips per navigation).
- **Identified Problems**:
  - `getSessionUser()` in `src/lib/auth/session.ts` uses `React.cache()`, but `src/app/dashboard/layout.tsx`, `src/lib/wingServer.ts`, and individual pages bypass `getSessionUser()` and issue raw `supabase.auth.getUser()` + `supabase.from('profiles')` calls.
  - `getWingContext()` is not wrapped in `React.cache()` and does not share the cached session from `getSessionUser()`.
- **Proposed Modifications**:
  1. Enhance `src/lib/auth/session.ts` with a request-scoped `React.cache()` unified context (`getSessionUser()` and `getRequestAuthContext()`) that resolves `user`, `profile`, `roles`, `wing` (`assignedWing`), `activeWingFilter`, and `canSwitchWing` in **1 auth check + 1 profile query per RSC request tree**, plus a short-TTL (30s) per-user server cache for profile/wing resolution invalidated on user/role updates.
  2. Refactor `src/lib/wingServer.ts` so `getWingContext()` reuses `getSessionUser()` when `userId`/`profileObj` are omitted or matches the current user, and memoizes per `(userId, wingCookie)` within the request via `React.cache()`.
  3. Refactor `src/app/dashboard/layout.tsx` and high-traffic dashboard pages (`dashboard/page.tsx`, `director/page.tsx`, `accountant/page.tsx`, `accountant/payments/page.tsx`, `accountant/fee-balances/page.tsx`, `teacher/marks/page.tsx`, `dean/marks-overview/page.tsx`, `hos/marks/page.tsx`, `principal/report-cards/page.tsx`, `dean/report-cards/page.tsx`, `teacher/report-cards/page.tsx`) to consume the unified request-scoped `getSessionUser()` / `getWingContext()`.
  4. Optimize `src/utils/supabase/middleware.ts` to pass verified user identity headers (`x-lis-user-id`, `x-lis-user-email`, `x-lis-user-roles`, `x-lis-user-active` signed with an internal per-request HMAC using `SUPABASE_SERVICE_ROLE_KEY` or `NEXTAUTH_SECRET`) so downstream RSC `getSessionUser()` can avoid re-querying `profiles` during the same HTTP request while maintaining cryptographic integrity.
- **Files Affected**:
  - `src/utils/supabase/middleware.ts`
  - `src/lib/auth/session.ts`
  - `src/lib/wingServer.ts`
  - `src/app/dashboard/layout.tsx`
  - `src/app/dashboard/page.tsx`, `src/app/dashboard/director/page.tsx`, `src/app/dashboard/accountant/page.tsx`, `src/app/dashboard/accountant/payments/page.tsx`, `src/app/dashboard/accountant/fee-balances/page.tsx`, `src/app/dashboard/teacher/marks/page.tsx`, `src/app/dashboard/dean/marks-overview/page.tsx`, `src/app/dashboard/hos/marks/page.tsx`, `src/app/dashboard/principal/report-cards/page.tsx`, `src/app/dashboard/dean/report-cards/page.tsx`, `src/app/dashboard/teacher/report-cards/page.tsx`

---

### Workstream B: Database and Query Optimisation (Priority: CRITICAL)

- **Existing Implementation**:
  - Unbounded `SELECT *` queries in `dean/marks-overview/page.tsx`, `hos/marks/page.tsx`, `accountant/invoices/page.tsx`, `accountant/payments/page.tsx`, `accountant/fee-balances/page.tsx`, and `students/page.tsx`.
  - Synchronous `await autoGenerateMissingInvoices()` called during `GET` page render in `accountant/payments/page.tsx` and `accountant/fee-balances/page.tsx`.
  - Application-side JavaScript loops calculating invoice totals, A/R aging buckets, and student counts.
- **Proposed Modifications**:
  1. **Additive SQL Migration (`supabase/migrations/20261115183000_phase2_performance_indexes_and_views.sql`)**:
     - Create composite B-tree indexes (`IF NOT EXISTS`) on hot lookup paths:
       - `idx_marks_class_subject_term_assessment` on `public.marks(class_id, subject_id, term, assessment_type)`
       - `idx_marks_student_term_released` on `public.marks(student_id, term, is_released)`
       - `idx_invoices_student_year_term_status` on `public.invoices(student_id, academic_year, term, status)`
       - `idx_invoices_due_date_status` on `public.invoices(due_date, status)`
       - `idx_payments_invoice_date` on `public.payments(invoice_id, payment_date DESC)`
       - `idx_payments_student_date` on `public.payments(student_id, payment_date DESC)`
       - `idx_attendance_class_date` on `public.attendance(class_id, date)`
       - `idx_students_class_wing_status` on `public.students(class_id, wing, status)`
       - `idx_audit_logs_created_at` on `public.audit_logs(created_at DESC)`
     - Create database RPC / views for server-side financial and academic summaries (`public.get_financial_kpi_summary(p_wing text)`, `public.get_ar_aging_summary(p_wing text)`).
     - Add unique index `idx_invoices_student_year_term_uniq` (where not cancelled) or idempotent conflict guard for invoice generation.
  2. **Replace Unbounded Queries & Add Server-Side Pagination / Explicit Column Projection**:
     - Replace `SELECT *` with explicit column lists and bounded limits / pagination in `dean/marks-overview`, `hos/marks`, `accountant/invoices`, `accountant/payments`, and `accountant/fee-balances`.
- **Files Affected**:
  - `supabase/migrations/20261115183000_phase2_performance_indexes_and_views.sql`
  - `src/app/dashboard/dean/marks-overview/page.tsx`
  - `src/app/dashboard/hos/marks/page.tsx`
  - `src/app/dashboard/accountant/invoices/page.tsx`
  - `src/app/dashboard/accountant/payments/page.tsx`
  - `src/app/dashboard/accountant/fee-balances/page.tsx`

---

### Workstream C: Background Processing and Asynchronous Operations (Priority: HIGH)

- **Existing Implementation**:
  - `src/app/api/report-cards/download/route.ts` generates 30–50 PDFs synchronously in a single HTTP request.
  - `src/app/dashboard/accountant/payments/page.tsx` and `src/app/dashboard/accountant/fee-balances/page.tsx` run `await autoGenerateMissingInvoices()` synchronously on every page load.
- **Proposed Modifications**:
  1. **Background Job Queue Engine (`src/lib/jobs/queue.ts`)**:
     - Build a resilient, zero-external-infrastructure-lock-in job queue supporting optional Redis/BullMQ-compatible persistence and PostgreSQL-backed `background_jobs` table + asynchronous non-blocking Node worker execution with retry with exponential backoff, idempotency keys, progress tracking (`0–100%`), and user/wing ownership verification.
  2. **Asynchronous Bulk Report Card Job API (`/api/report-cards/jobs` & `/api/report-cards/download`)**:
     - Add `POST /api/report-cards/jobs` and `GET /api/report-cards/jobs?job_id=...` to enqueue, track progress, and download bulk report card PDFs asynchronously while keeping single-student preview fast and backward-compatible.
     - Enforce strict user & wing ownership on job status and artifact retrieval so no user can access another user's generated report cards.
  3. **Remove Synchronous Invoice Auto-Generation from Page Renders**:
     - Remove `await autoGenerateMissingInvoices()` from `accountant/payments/page.tsx` and `accountant/fee-balances/page.tsx`.
     - Expose it as an explicit, idempotent background job / action (`/api/accountant/invoices/sync` or button in Invoices & Fee Balances) with duplicate prevention.
- **Files Affected**:
  - `src/lib/jobs/queue.ts`
  - `src/app/api/report-cards/jobs/route.ts`
  - `src/app/api/report-cards/download/route.ts`
  - `src/app/dashboard/accountant/payments/page.tsx`
  - `src/app/dashboard/accountant/fee-balances/page.tsx`
  - `src/app/dashboard/accountant/actions.ts`

---

### Workstream D: Redis Caching and Performance Optimisation (Priority: HIGH)

- **Existing Implementation**:
  - Reference data (`terms`, `academic_years`, `system_settings` grading scale, `assessment_weights`, `classes`, `subjects`) is queried from Supabase on every page load.
- **Proposed Modifications**:
  1. **Central Cache Layer (`src/lib/cache/redisCache.ts`)**:
     - Implement a unified two-tier cache utility (`Redis` via `REDIS_URL` when configured, with automatic fallback to bounded in-memory LRU+TTL cache when Redis is not provisioned or unreachable).
     - Strict wing-aware and scope-aware cache key builder (`lis:v1:<namespace>:<wing>:<scope>`).
     - Explicit invalidation helpers (`invalidateCachePrefix('settings:grading')`, `invalidateCachePrefix('settings:weights')`, `invalidateCachePrefix('terms')`, `invalidateCachePrefix('classes')`, `invalidateCachePrefix('finance')`) wired into Server Actions and API mutations.
- **Files Affected**:
  - `src/lib/cache/redisCache.ts`
  - `src/app/dashboard/admin/settings/grading/actions.ts`
  - `src/app/dashboard/admin/settings/assessment-weights/actions.ts`
  - `src/app/dashboard/teacher/marks/page.tsx`
  - `src/app/dashboard/dean/marks-overview/page.tsx`
  - `src/app/dashboard/hos/marks/page.tsx`

---

### Workstream E: API and Frontend Performance (Priority: HIGH)

- **Existing Implementation**:
  - `src/lib/api/rate-limit.ts` calls `supabase.rpc('increment_rate_limit')` via `createServiceClient()` over HTTPS on every rate-limited API call before executing the handler (~80–200ms latency overhead per API request).
- **Proposed Modifications**:
  1. Optimize `src/lib/api/rate-limit.ts` to use an ultra-fast sliding-window counter in memory/Redis (<1ms overhead) with asynchronous non-blocking persistence or fallback, preserving exact rate-limit semantics and `X-RateLimit-*` headers without blocking API requests on an HTTPS RPC round trip.
  2. Optimize `next.config.ts` with package import optimizations (`optimizePackageImports: ['lucide-react']`).
- **Files Affected**:
  - `src/lib/api/rate-limit.ts`
  - `next.config.ts`

---

### Workstream F: Security, Reliability and Monitoring (Priority: CRITICAL)

- **Existing Implementation**:
  - `createServiceClient()` is used in 24 files, including read-only server pages (`accountant/invoices/page.tsx`, `principal/admissions/page.tsx`, `students/page.tsx`, `profile/page.tsx`).
  - `/api/admin/go-live-setup` is listed as exempt in `src/utils/supabase/middleware.ts` even though the route does not exist or should never be unauthenticated in production.
  - `/api/attendance/biometric` accepts static API keys without timestamp drift validation, HMAC signature verification, or replay protection.
  - `src/lib/api/handler.ts` logs raw `console.error` without structured monitoring / PII redaction.
- **Proposed Modifications**:
  1. **Service-Role Audit & Remediation**:
     - Remove `/api/admin/go-live-setup` from middleware exemptions in `src/utils/supabase/middleware.ts`.
     - Audit all 24 `createServiceClient()` usages; ensure explicit role & wing authorization checks precede any service-client query, and replace service-client usage with user-scoped `createClient()` where RLS already grants access.
  2. **Biometric Endpoint Hardening (`src/app/api/attendance/biometric/route.ts`)**:
     - Add timestamp drift validation (±5 minutes window) to prevent replay attacks.
     - Add HMAC-SHA256 payload signature verification (`x-signature` over `${deviceId}:${timestamp}:${biometric_id}`) alongside timing-safe key comparison and replay deduplication cache.
     - Record security audit events for rejected/unauthorized device punches.
  3. **Structured Error Monitoring & PII Redaction (`src/lib/monitoring/logger.ts` & `src/lib/api/handler.ts`)**:
     - Add structured JSON logging + optional Sentry webhook/DSN reporting with `requestId` correlation and automatic redaction of tokens, passwords, keys, and sensitive fields.
- **Files Affected**:
  - `src/utils/supabase/middleware.ts`
  - `src/app/api/attendance/biometric/route.ts`
  - `src/lib/monitoring/logger.ts`
  - `src/lib/api/handler.ts`

---

## 3. Security & Rollback Strategy

- **Security**:
  - RLS remains enabled on all tables; no RLS policy is disabled.
  - Service-role credentials remain strictly server-only (`import 'server-only'` guard).
  - Wing isolation (`Cambridge` vs `NECTA`) is enforced at middleware, API scope, cache keys, and SQL RLS layers.
- **Rollback Strategy**:
  - All SQL migrations use additive `IF NOT EXISTS` / `CREATE OR REPLACE` statements; indexes and views can be dropped cleanly without affecting table data.
  - Code changes are modular and backward-compatible; reverting the Git commit restores previous behavior immediately.
