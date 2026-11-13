-- Migration: 20261113000000_admission_fee_invoices.sql
-- Persists TZS 20,000 admission application form invoices for tracking and payment reconciliation

CREATE TABLE IF NOT EXISTS public.admission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  invoice_no text NOT NULL UNIQUE,
  amount numeric(12, 2) NOT NULL DEFAULT 20000,
  currency text NOT NULL DEFAULT 'TZS',
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'waived')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admission_invoices_status ON public.admission_invoices(status);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_created_at ON public.admission_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_application_id ON public.admission_invoices(application_id);

-- Backfill invoices for existing applications
INSERT INTO public.admission_invoices (application_id, invoice_no, amount, currency, status)
SELECT
  a.id,
  'INV-' || a.application_no,
  20000,
  'TZS',
  'unpaid'
FROM public.admission_applications a
ON CONFLICT (application_id) DO NOTHING;

-- RLS
ALTER TABLE public.admission_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view admission invoices" ON public.admission_invoices;
CREATE POLICY "Staff can view admission invoices" ON public.admission_invoices
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Accountant', 'Receptionist', 'Dean', 'Head of Section', 'HOS'])
  OR EXISTS (
    SELECT 1 FROM public.admission_applications a
    WHERE a.id = admission_invoices.application_id
      AND a.registered_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Finance and reception can manage admission invoices" ON public.admission_invoices;
CREATE POLICY "Finance and reception can manage admission invoices" ON public.admission_invoices
FOR ALL TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Accountant', 'Receptionist'])
)
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Accountant', 'Receptionist'])
);
