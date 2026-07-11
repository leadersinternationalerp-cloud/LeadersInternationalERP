-- Migration: Phase 7 Payroll Approval Flow
-- Creates table: payrolls and links it to payslips
-- Sets up RLS and indexes.

-- 1. Create payrolls table
CREATE TABLE IF NOT EXISTS public.payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved_Principal', 'Approved_Director', 'Declined_Principal', 'Declined_Director')),
  accountant_notes text,
  principal_notes text,
  director_notes text,
  submitted_by uuid REFERENCES public.profiles(id),
  reviewed_by_principal uuid REFERENCES public.profiles(id),
  reviewed_by_director uuid REFERENCES public.profiles(id),
  reviewed_at_principal timestamp with time zone,
  reviewed_at_director timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (month, year)
);

-- Enable RLS on payrolls
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON public.payrolls(month, year);
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON public.payrolls(status);

-- 3. RLS Policies
CREATE POLICY "Authorized staff can view payrolls"
  ON public.payrolls FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

CREATE POLICY "Accountants can manage payrolls"
  ON public.payrolls FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Accountant'));

CREATE POLICY "Principal can review payrolls"
  ON public.payrolls FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Principal'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Principal'));

CREATE POLICY "Director can review payrolls"
  ON public.payrolls FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));
