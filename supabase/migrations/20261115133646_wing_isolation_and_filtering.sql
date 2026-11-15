-- Migration: 20261115133646_wing_isolation_and_filtering.sql
-- Adds first-class Wing ('Cambridge' vs 'NECTA' vs 'Both') support across profiles, students, classes, and staff
-- and provides helper functions for wing inference and wing-scoped access control.

-- 1. Helper SQL function to infer Wing from class name or grade level
CREATE OR REPLACE FUNCTION public.infer_wing(label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN label IS NULL THEN 'Cambridge'
    WHEN lower(label) LIKE '%necta%'
      OR lower(label) LIKE '%standard%'
      OR lower(label) LIKE '%primary%'
      OR lower(label) LIKE '%grade%'
      OR lower(label) LIKE '%baby%'
      OR lower(label) LIKE '%nursery%'
    THEN 'NECTA'
    WHEN lower(label) LIKE '%cambridge%'
      OR lower(label) LIKE '%igcse%'
      OR lower(label) LIKE '%year%'
      OR lower(label) LIKE '%stage%'
    THEN 'Cambridge'
    ELSE 'NECTA'
  END;
$$;

-- 2. Add wing column to profiles ('Cambridge', 'NECTA', 'Both')
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wing text DEFAULT 'Both';

-- Backfill profiles.wing from roles array if a 'Wing:...' tag is present, or from linked student record
UPDATE public.profiles p
SET wing = CASE
  WHEN 'Wing:Cambridge' = ANY(COALESCE(p.roles, ARRAY[]::text[])) THEN 'Cambridge'
  WHEN 'Wing:NECTA' = ANY(COALESCE(p.roles, ARRAY[]::text[])) THEN 'NECTA'
  WHEN 'Wing:Both' = ANY(COALESCE(p.roles, ARRAY[]::text[])) THEN 'Both'
  ELSE COALESCE(p.wing, 'Both')
END;

CREATE INDEX IF NOT EXISTS idx_profiles_wing ON public.profiles(wing);

-- 3. Add wing column to classes ('Cambridge', 'NECTA')
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS wing text;

UPDATE public.classes
SET wing = public.infer_wing(name)
WHERE wing IS NULL OR wing NOT IN ('Cambridge', 'NECTA');

CREATE INDEX IF NOT EXISTS idx_classes_wing ON public.classes(wing);

-- 4. Add wing column to students ('Cambridge', 'NECTA')
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS wing text;

UPDATE public.students s
SET wing = COALESCE(
  (SELECT CASE WHEN lower(a.curriculum) LIKE '%necta%' THEN 'NECTA' WHEN lower(a.curriculum) LIKE '%cambridge%' THEN 'Cambridge' ELSE NULL END
   FROM public.admission_applications a
   WHERE a.id = s.admission_id OR a.enrolled_student_id = s.id
   LIMIT 1),
  public.infer_wing(s.grade_level)
)
WHERE s.wing IS NULL OR s.wing NOT IN ('Cambridge', 'NECTA');

-- Sync student profile wing with student wing
UPDATE public.profiles p
SET wing = s.wing
FROM public.students s
WHERE p.id = s.id
  AND s.wing IN ('Cambridge', 'NECTA');

CREATE INDEX IF NOT EXISTS idx_students_wing ON public.students(wing);

-- 5. Add wing column to staff
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS wing text DEFAULT 'Both';

-- 6. Helper function to resolve current authenticated user's wing restriction
CREATE OR REPLACE FUNCTION public.get_my_wing()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_wing text;
  v_roles text[];
  v_student_wing text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 'Both';
  END IF;

  SELECT p.wing, COALESCE(p.roles, ARRAY[]::text[]) || ARRAY[COALESCE(p.role::text, '')]
  INTO v_wing, v_roles
  FROM public.profiles p
  WHERE p.id = auth.uid();

  -- Cross-wing management & administrative roles always have access to Both wings
  IF v_roles && ARRAY['System Admin', 'Director', 'Principal', 'Accountant', 'Receptionist'] THEN
    RETURN 'Both';
  END IF;

  -- Check explicit Wing tag in roles array
  IF 'Wing:Cambridge' = ANY(v_roles) THEN
    RETURN 'Cambridge';
  ELSIF 'Wing:NECTA' = ANY(v_roles) THEN
    RETURN 'NECTA';
  END IF;

  -- Check profiles.wing column
  IF v_wing IN ('Cambridge', 'NECTA') THEN
    RETURN v_wing;
  END IF;

  -- If user is a Student, check students table
  IF 'Student' = ANY(v_roles) THEN
    SELECT COALESCE(s.wing, public.infer_wing(s.grade_level))
    INTO v_student_wing
    FROM public.students s
    WHERE s.id = auth.uid();

    IF v_student_wing IN ('Cambridge', 'NECTA') THEN
      RETURN v_student_wing;
    END IF;
  END IF;

  RETURN 'Both';
END;
$$;
