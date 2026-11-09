-- Migration: 20261109000000_delete_test_admissions_and_sales_support.sql
-- 1. Delete requested test admission submissions
-- 2. Add sales attribution columns to admission_applications and students
-- 3. Extend RLS policies and staff checks for Sales role

BEGIN;

-- 1. Purge the specified test submissions
DELETE FROM public.admission_applications
WHERE application_no IN ('LIS-2026-960M', 'LIS-2026-YOSZ', 'IS-2026-960M')
   OR parent_email IN ('wawerusamymwangi@gmail.com')
   OR (first_name ILIKE 'Samson' AND last_name ILIKE '%wangi%')
   OR (first_name ILIKE 'Fatima' AND last_name ILIKE 'Shaame%');

-- 2. Add attribution columns to public.admission_applications
ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_agent_name text,
  ADD COLUMN IF NOT EXISTS enrolled_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admission_apps_source ON public.admission_applications(source);
CREATE INDEX IF NOT EXISTS idx_admission_apps_registered_by ON public.admission_applications(registered_by);

-- 3. Add attribution & admission linkage columns to public.students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_agent_name text,
  ADD COLUMN IF NOT EXISTS admission_id uuid REFERENCES public.admission_applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_source ON public.students(source);
CREATE INDEX IF NOT EXISTS idx_students_registered_by ON public.students(registered_by);
CREATE INDEX IF NOT EXISTS idx_students_admission_id ON public.students(admission_id);

-- 4. Update public.is_staff() to include 'Sales'
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role IN ('System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher', 'Sales')
      OR roles && ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher', 'Sales']
    )
  );
$$;

-- 5. Extend RLS on admission_applications for Sales
DROP POLICY IF EXISTS "Staff can view admission applications" ON public.admission_applications;
CREATE POLICY "Staff can view admission applications" ON public.admission_applications
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant', 'Sales'])
);

DROP POLICY IF EXISTS "Staff can insert admission applications" ON public.admission_applications;
CREATE POLICY "Staff can insert admission applications" ON public.admission_applications
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant', 'Sales'])
);

DROP POLICY IF EXISTS "Management and sales can update admission applications" ON public.admission_applications;
CREATE POLICY "Management and sales can update admission applications" ON public.admission_applications
FOR UPDATE TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  OR (public.has_role('Sales') AND registered_by = auth.uid())
)
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  OR (public.has_role('Sales') AND registered_by = auth.uid())
);

DROP POLICY IF EXISTS "Management can delete admission applications" ON public.admission_applications;
CREATE POLICY "Management can delete admission applications" ON public.admission_applications
FOR DELETE TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal'])
);

COMMIT;
