-- Migration: 20261111000000_add_sales_to_user_role_enum.sql
-- Self-contained migration that:
-- 1. Adds 'Sales' (and any missing canonical roles) to public.user_role enum
-- 2. Ensures public.admission_applications and attribution columns (registered_by, sales_agent_name, enrolled_student_id) exist
-- 3. Updates role helper functions to safely cast role::text
-- 4. Configures RLS policies on admission_applications so Sales only see and manage their own attributed registrations

-- 1. Ensure 'Sales' and canonical roles exist on public.user_role enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Sales';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Head of Section';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'HOS';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Dean';
  END IF;
END $$;

-- 2. Ensure public.admission_applications table exists
CREATE SEQUENCE IF NOT EXISTS public.admission_application_seq START 1;

CREATE TABLE IF NOT EXISTS public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected', 'enrolled', 'cancelled')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  date_of_birth date,
  gender text,
  place_of_birth text,
  nationality text DEFAULT 'Tanzanian',
  id_number text,
  curriculum text DEFAULT 'Cambridge',
  class_applied_for text NOT NULL,
  academic_year text DEFAULT '2026/2027',
  start_term text,
  previous_school text,
  parent_name text NOT NULL,
  parent_relationship text DEFAULT 'Parent',
  parent_occupation text,
  parent_employer text,
  parent_email text NOT NULL,
  parent_phone text NOT NULL,
  parent_whatsapp text,
  parent_address text,
  guardian2_name text,
  guardian2_relationship text,
  guardian2_occupation text,
  guardian2_employer text,
  guardian2_phone text,
  guardian2_email text,
  guardian2_address text,
  transport_required boolean DEFAULT false,
  transport_route text,
  fee_plan text,
  clubs text[] DEFAULT ARRAY[]::text[],
  medical_conditions text,
  special_talents_interests text,
  additional_notes text,
  source text DEFAULT 'website',
  pdf_sent_to_school boolean DEFAULT false,
  pdf_sent_to_parent boolean DEFAULT false,
  email_sent_at timestamptz,
  notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Add attribution columns to public.admission_applications & public.students (if not already present)
ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_agent_name text,
  ADD COLUMN IF NOT EXISTS enrolled_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admission_apps_source ON public.admission_applications(source);
CREATE INDEX IF NOT EXISTS idx_admission_apps_registered_by ON public.admission_applications(registered_by);

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS registered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sales_agent_name text,
  ADD COLUMN IF NOT EXISTS admission_id uuid REFERENCES public.admission_applications(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_source ON public.students(source);
CREATE INDEX IF NOT EXISTS idx_students_registered_by ON public.students(registered_by);
CREATE INDEX IF NOT EXISTS idx_students_admission_id ON public.students(admission_id);

-- 4. Purge any requested test submissions if present
DELETE FROM public.admission_applications
WHERE application_no IN ('LIS-2026-960M', 'LIS-2026-YOSZ', 'IS-2026-960M')
   OR parent_email IN ('wawerusamymwangi@gmail.com')
   OR (first_name ILIKE 'Samson' AND last_name ILIKE '%wangi%')
   OR (first_name ILIKE 'Fatima' AND last_name ILIKE 'Shaame%');

-- 5. Ensure canonical role evaluation helpers cast role::text safely
CREATE OR REPLACE FUNCTION public.has_role(candidate text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      candidate = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text])
      OR (candidate = 'Head of Section' AND 'HOS' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text]))
      OR (candidate = 'HOS' AND 'Head of Section' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text]))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(candidates text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      (COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text]) && candidates
      OR ('Head of Section' = ANY(candidates) AND 'HOS' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text]))
      OR ('HOS' = ANY(candidates) AND 'Head of Section' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text]))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS text[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ARRAY(
    SELECT DISTINCT r FROM (
      SELECT unnest(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role::text]) AS r
      FROM public.profiles
      WHERE id = user_id
    ) t WHERE r IS NOT NULL AND r != ''
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role::text IN ('System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher', 'Sales')
      OR roles && ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'HOS', 'Head of Section', 'Accountant', 'Teacher', 'Sales']
    )
  );
$$;

-- 6. RLS on public.admission_applications (Sales only see and manage their own attributed learners)
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view admission applications" ON public.admission_applications;
CREATE POLICY "Staff can view admission applications" ON public.admission_applications
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant'])
  OR (public.has_role('Sales') AND registered_by = auth.uid())
);

DROP POLICY IF EXISTS "Staff can insert admission applications" ON public.admission_applications;
CREATE POLICY "Staff can insert admission applications" ON public.admission_applications
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant', 'Sales'])
);

DROP POLICY IF EXISTS "Management can update admission applications" ON public.admission_applications;
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
  OR (public.has_role('Sales') AND registered_by = auth.uid())
);
