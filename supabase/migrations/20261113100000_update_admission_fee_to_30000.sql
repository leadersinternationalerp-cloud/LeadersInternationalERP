-- Migration: 20261113100000_update_admission_fee_to_30000.sql
-- Updates the admission application / registration form fee from TZS 20,000 to TZS 30,000

ALTER TABLE IF EXISTS public.admission_invoices
  ALTER COLUMN amount SET DEFAULT 30000;

UPDATE public.admission_invoices
SET
  amount = 30000,
  updated_at = now()
WHERE status = 'unpaid'
  AND amount = 20000;
