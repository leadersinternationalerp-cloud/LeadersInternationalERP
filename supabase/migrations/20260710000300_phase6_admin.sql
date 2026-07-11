-- Migration: Phase 6 System Admin & Security
-- Creates tables: audit_logs, system_settings, academic_years, backups
-- Adds indexes and RLS.

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create academic_years table
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT false,
  term_details jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of term periods
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on academic_years
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

-- 4. Create backups table
CREATE TABLE IF NOT EXISTS public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_size_kb integer NOT NULL,
  status text NOT NULL CHECK (status IN ('Pending', 'Completed', 'Failed')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on backups
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;


-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_created ON public.backups(created_at);


-- 6. RLS POLICIES

-- audit_logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));

CREATE POLICY "Allow system audit insertions"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- system_settings
CREATE POLICY "All authenticated users can view system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));

-- academic_years
CREATE POLICY "All authenticated users can view academic years"
  ON public.academic_years FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage academic years"
  ON public.academic_years FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));

-- backups
CREATE POLICY "Admins can view backups"
  ON public.backups FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));

CREATE POLICY "Admins can manage backups"
  ON public.backups FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director'));
