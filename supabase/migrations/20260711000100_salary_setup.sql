-- Migration: Phase 8 Custom Salary Settings Setup
-- Creates table: salary_settings
-- Sets up RLS and indexes.

CREATE TABLE IF NOT EXISTS public.salary_settings (
  employee_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  basic_salary numeric(12, 2) NOT NULL DEFAULT 1500000.00 CHECK (basic_salary >= 0),
  allowances numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (allowances >= 0),
  deductions numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (deductions >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on salary_settings
ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authorized staff can view salary settings"
  ON public.salary_settings FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

CREATE POLICY "Accountants can manage salary settings"
  ON public.salary_settings FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Accountant'));
