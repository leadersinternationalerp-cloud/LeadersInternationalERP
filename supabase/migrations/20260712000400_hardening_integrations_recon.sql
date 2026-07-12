-- Migration: Pre-CSS Hardening - Integration Config & Bank Recon

DROP TABLE IF EXISTS public.integration_config CASCADE;

CREATE TABLE IF NOT EXISTS public.integration_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type text NOT NULL, -- 'WHATSAPP', 'SMS', 'BANK', 'GEMINI', 'SMTP'
  provider_name text NOT NULL, -- e.g., 'TWILIO', 'AFRICAS_TALKING', 'SELCOM'
  api_key text,
  api_secret text,
  api_url text,
  webhook_secret text,
  is_active boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Ensure only one active provider per type
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_provider_type 
ON public.integration_config (provider_type) 
WHERE is_active = true;

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id text NOT NULL, -- typically mapped to chart_of_accounts or a dedicated bank table
  statement_date date NOT NULL,
  statement_balance numeric(15,2) NOT NULL,
  system_balance numeric(15,2) NOT NULL,
  difference numeric(15,2) GENERATED ALWAYS AS (statement_balance - system_balance) STORED,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'RECONCILED')),
  reconciled_by uuid REFERENCES public.profiles(id),
  reconciled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.integration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access to integrations" ON public.integration_config FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));
CREATE POLICY "Allow accountant access to bank recon" ON public.bank_reconciliations FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('Accountant', 'Director', 'System Admin'));
