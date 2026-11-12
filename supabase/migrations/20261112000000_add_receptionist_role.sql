-- Migration: 20261112000000_add_receptionist_role.sql
-- 1. Adds 'Receptionist' to public.user_role enum
-- 2. Updates public.is_staff() to include 'Receptionist' for student bio-data and directory access
-- 3. Updates RLS policies on public.admission_applications so Receptionist can view, register (WALK IN), and admit/enroll students

-- 1. Ensure 'Receptionist' exists on public.user_role enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Receptionist';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Sales';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Head of Section';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'HOS';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Dean';
  END IF;
END $$;

-- 2. Update public.is_staff() to include 'Receptionist'
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role::text IN ('System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher', 'Sales', 'Receptionist')
      OR roles && ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher', 'Sales', 'Receptionist']
    )
  );
$$;

-- 3. Extend RLS on public.admission_applications for Receptionist
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view admission applications" ON public.admission_applications;
CREATE POLICY "Staff can view admission applications" ON public.admission_applications
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant', 'Receptionist'])
  OR (public.has_role('Sales') AND registered_by = auth.uid())
);

DROP POLICY IF EXISTS "Staff can insert admission applications" ON public.admission_applications;
CREATE POLICY "Staff can insert admission applications" ON public.admission_applications
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant', 'Sales', 'Receptionist'])
);

DROP POLICY IF EXISTS "Management and sales can update admission applications" ON public.admission_applications;
CREATE POLICY "Management and sales can update admission applications" ON public.admission_applications
FOR UPDATE TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Receptionist'])
  OR (public.has_role('Sales') AND registered_by = auth.uid())
)
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Receptionist'])
  OR (public.has_role('Sales') AND registered_by = auth.uid())
);

DROP POLICY IF EXISTS "Management can delete admission applications" ON public.admission_applications;
CREATE POLICY "Management can delete admission applications" ON public.admission_applications
FOR DELETE TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  OR (public.has_any_role(ARRAY['Sales', 'Receptionist']) AND registered_by = auth.uid())
);
