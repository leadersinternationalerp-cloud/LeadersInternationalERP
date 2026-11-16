-- Migration: 20261116170000_standardize_all_admission_invoices_to_30000.sql
-- Updates ALL admission application / registration form invoices (both paid and unpaid) to TZS 30,000,
-- and syncs any linked general ledger journal entries and lines where amount was recorded as 20,000.

-- 1. Ensure table column default is 30,000
ALTER TABLE IF EXISTS public.admission_invoices
  ALTER COLUMN amount SET DEFAULT 30000;

-- 2. Update all admission invoices to 30,000 regardless of status
UPDATE public.admission_invoices
SET
  amount = 30000,
  updated_at = now()
  WHERE amount != 30000;

-- 3. Sync journal entry line items linked to admission fees
UPDATE public.journal_lines jl
SET
  debit = CASE WHEN debit > 0 THEN 30000 ELSE 0 END,
  credit = CASE WHEN credit > 0 THEN 30000 ELSE 0 END
FROM public.journal_entries je
WHERE jl.journal_entry_id = je.id
  AND je.entry_type = 'ADMISSION_FEE'
  AND (jl.debit = 20000 OR jl.credit = 20000);
