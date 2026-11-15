# DEPLOYMENT & ROLLBACK GUIDE
**System:** Leaders International School ERP  
**Phase:** Phase 2 – Performance, Infrastructure Optimisation & Reliability  
**Date:** November 2026  

---

## 1. Pre-Deployment Checklist

Before deploying Phase 2 to production:
1. **Verify Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` (Required)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Required)
   - `SUPABASE_SERVICE_ROLE_KEY` (Required, server-only)
   - `BIOMETRIC_API_KEY` (Required if biometric attendance devices are active)
   - `BIOMETRIC_WEBHOOK_SECRET` (Optional, recommended for HMAC-SHA256 signing)
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Optional; automatically falls back to bounded L1 in-memory cache if unset)
2. **Run Pre-Deployment Verification Suite:**
   ```bash
   npm run typecheck
   npm run test:unit
   npm run build
   ```
3. **Take Pre-Migration Database Backup:**
   - Trigger a manual snapshot in the Supabase Dashboard (or run the `pg_dump` script in `BACKUP_AND_RECOVERY_GUIDE.md`).

---

## 2. Step-by-Step Deployment Procedure

### Step 1: Apply Additive Database Migration
Apply `supabase/migrations/20261115183000_phase2_performance_indexes_and_views.sql` via the Supabase CLI or SQL Editor:

```bash
npx supabase db push
```
- All statements in this migration use `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, `CREATE OR REPLACE FUNCTION`, and `CREATE TABLE IF NOT EXISTS`.
- **Zero-Downtime Note for Large Tables:** If applying manually during peak school hours on tables exceeding 1,000,000 rows, run the index statements in the Supabase SQL Editor using `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...`.

### Step 2: Build & Start the Next.js Application
On the existing production server (preserving existing hosting, Nginx/Cloudflare, and process manager):

```bash
git pull origin master
npm ci
npm run build
```

Reload the application server gracefully:
```bash
# If managed by PM2:
pm2 reload leaders-erp --update-env

# Or if managed by systemd:
sudo systemctl restart leaders-erp
```

### Step 3: Post-Deployment Smoke Checks
1. **Health Endpoint:**
   ```bash
   curl -i https://<your-domain>/api/health
   ```
2. **Unauthenticated API Protection Check:**
   - Verify `GET /api/admin/go-live-setup` returns `401 UNAUTHENTICATED` JSON (confirming the stale middleware exemption is closed).
3. **Cambridge & NECTA Wing Isolation Check:**
   - Sign in as a Cambridge-assigned teacher and verify `/dashboard/teacher/marks` only lists Cambridge classes.
   - Sign in as Director/Accountant and toggle the header Wing Filter (`All Wings` / `Cambridge` / `NECTA`) on `/dashboard/accountant/fee-balances`.

---

## 3. Rollback Procedure

### 3.1 Application Code Rollback (< 2 Minutes)
Because all Phase 2 SQL changes are strictly additive (no columns or tables were dropped or renamed), rolling back the Next.js application requires **zero database changes**:

```bash
git checkout 986414d
npm run build
pm2 reload leaders-erp
```

### 3.2 Database Migration Rollback (If Ever Needed)
If you wish to remove the Phase 2 views, RPC functions, or indexes without affecting any production data:

```sql
DROP FUNCTION IF EXISTS public.get_ar_aging_summary(TEXT);
DROP VIEW IF EXISTS public.vw_invoice_balances_and_aging;
DROP FUNCTION IF EXISTS public.get_class_marks_summary(UUID, TEXT);
DROP TABLE IF EXISTS public.background_jobs;

DROP INDEX IF EXISTS public.idx_marks_class_subject_term_assessment;
DROP INDEX IF EXISTS public.idx_marks_student_term_released;
DROP INDEX IF EXISTS public.idx_invoices_student_year_term_status;
DROP INDEX IF EXISTS public.idx_invoices_unpaid_due_date;
DROP INDEX IF EXISTS public.idx_payments_invoice_id;
DROP INDEX IF EXISTS public.idx_payments_payment_date_desc;
DROP INDEX IF EXISTS public.idx_attendance_class_date;
DROP INDEX IF EXISTS public.idx_students_class_grade;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at_desc;
```
