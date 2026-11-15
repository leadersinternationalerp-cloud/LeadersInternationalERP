# BACKUP, DISASTER RECOVERY & DATA INTEGRITY GUIDE
**System:** Leaders International School ERP  
**Workstream:** Workstream F4 (Reliability & Disaster Recovery)  
**Date:** November 2026  

---

## 1. Backup Architecture Overview

The Leaders International School ERP stores all relational academic, financial, admission, and authentication records in **Supabase Cloud PostgreSQL (`zqcjnfcwxkeapwzhifsy`)**, with uploaded binary assets (student photos, admission attachments) stored in **Supabase Storage**.

To guarantee zero loss of critical academic marks or financial ledger entries, a three-layer backup strategy is defined:
1. **Layer 1 — Supabase Automated Daily Snapshots & Point-in-Time Recovery (PITR):**
   - Continuous WAL (Write-Ahead Log) archiving on Supabase Pro/Team plans enables recovery to any second within the retention window (RPO `< 1 minute`).
   - Automated daily logical/physical snapshots retained for 7–30 days.
2. **Layer 2 — Scheduled Off-Site Encrypted Logical Backups (`pg_dump`):**
   - Nightly automated `pg_dump` of `public` and `auth` schemas stored in encrypted off-site object storage with 90-day retention (end-of-term archives retained for 7 years per academic record regulations).
3. **Layer 3 — Pre-Migration Snapshot Protocol:**
   - Mandatory schema + data snapshot taken immediately prior to applying any new SQL migration in `supabase/migrations/`.

---

## 2. Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

| Failure Scenario | Target RPO | Target RTO | Primary Recovery Mechanism |
| :--- | :---: | :---: | :--- |
| Accidental row deletion or bad batch update | `< 5 minutes` | `< 30 minutes` | Supabase PITR or selective table restore from nightly `pg_dump` into staging table |
| Bad application deployment / regression | `0 (No data loss)` | `< 5 minutes` | Git revert + PM2/Container rollback (`DEPLOYMENT_AND_ROLLBACK_GUIDE.md`) |
| Complete regional database outage | `< 24 hours` (`< 1 min` with PITR) | `< 60 minutes` | Restore latest Supabase snapshot or `pg_dump` archive to standby Supabase project |

---

## 3. Nightly Off-Site Logical Backup Procedure

Run the following command from a secure backup runner (or cron job on the management host) using the read-only/backup connection string:

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_DIR="/var/backups/lis-erp"
mkdir -p "${BACKUP_DIR}"

# 1. Dump schema and data in custom compressed format (-Fc)
pg_dump "${SUPABASE_DB_DIRECT_URL}" \
  --schema=public \
  --schema=auth \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_DIR}/lis_erp_${TIMESTAMP}.dump"

# 2. Verify archive integrity immediately
pg_restore --list "${BACKUP_DIR}/lis_erp_${TIMESTAMP}.dump" > /dev/null

# 3. Encrypt archive with AES-256 before off-site upload
gpg --batch --yes --symmetric --cipher-algo AES256 \
  --passphrase-file /etc/lis-erp/backup.pass \
  "${BACKUP_DIR}/lis_erp_${TIMESTAMP}.dump"

rm -f "${BACKUP_DIR}/lis_erp_${TIMESTAMP}.dump"
```

---

## 4. Quarterly Restore Drill Procedure

Backups must be tested quarterly into an isolated **Staging / Restore Verification Database** (never overwrite production during a drill):

1. **Provision Isolated Staging Database:** Create a temporary Supabase branch or local `supabase start` PostgreSQL 15 instance.
2. **Decrypt & Restore Archive:**
   ```bash
   gpg --decrypt --passphrase-file /etc/lis-erp/backup.pass \
     lis_erp_YYYYMMDDTHHMMSSZ.dump.gpg > /tmp/restore.dump

   pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname="${STAGING_DATABASE_URL}" /tmp/restore.dump
   ```
3. **Run Post-Restore Integrity Verification SQL:**
   ```sql
   -- Verify core table row counts and financial balance integrity
   SELECT
     (SELECT COUNT(*) FROM public.profiles) AS profiles_count,
     (SELECT COUNT(*) FROM public.students) AS students_count,
     (SELECT COUNT(*) FROM public.marks) AS marks_count,
     (SELECT COUNT(*) FROM public.invoices) AS invoices_count,
     (SELECT COUNT(*) FROM public.payments) AS payments_count,
     (SELECT COALESCE(SUM(total_outstanding), 0) FROM public.get_ar_aging_summary('all')) AS total_ar_tzs;
   ```
4. **Sign Off:** Record the restore duration, row counts, and checksum verification in the school IT operations log and destroy the temporary `/tmp/restore.dump` file.
