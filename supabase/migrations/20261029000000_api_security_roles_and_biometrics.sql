-- Migration: 20261029000000_api_security_roles_and_biometrics.sql
-- 1. Canonical role evaluation helpers (Union of roles[] and role)
CREATE OR REPLACE FUNCTION public.has_role(candidate text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      candidate = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role])
      OR (candidate = 'Head of Section' AND 'HOS' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role]))
      OR (candidate = 'HOS' AND 'Head of Section' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role]))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(candidates text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      (COALESCE(roles, ARRAY[]::text[]) || ARRAY[role]) && candidates
      OR ('Head of Section' = ANY(candidates) AND 'HOS' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role]))
      OR ('HOS' = ANY(candidates) AND 'Head of Section' = ANY(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role]))
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(user_id uuid)
RETURNS text[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT ARRAY(
    SELECT DISTINCT r FROM (
      SELECT unnest(COALESCE(roles, ARRAY[]::text[]) || ARRAY[role]) AS r
      FROM public.profiles
      WHERE id = user_id
    ) t WHERE r IS NOT NULL AND r != ''
  );
$$;

-- 2. Scoped RLS on learning_area_progress
ALTER TABLE public.learning_area_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated users read access" ON public.learning_area_progress;
DROP POLICY IF EXISTS "Scoped read on learning_area_progress" ON public.learning_area_progress;
CREATE POLICY "Scoped read on learning_area_progress" ON public.learning_area_progress
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS'])
  OR (public.has_role('Teacher') AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = learning_area_progress.student_id
    AND (c.class_teacher_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.class_subjects cs WHERE cs.class_id = c.id AND cs.teacher_id = auth.uid()
    ))
  ))
  OR (public.has_role('Parent') AND EXISTS (
    SELECT 1 FROM public.student_parents sp WHERE sp.student_id = learning_area_progress.student_id AND sp.parent_id = auth.uid()
  ))
  OR (public.has_role('Student') AND student_id = auth.uid())
);

-- 3. Biometric devices table updates
ALTER TABLE IF EXISTS public.biometric_devices
  ADD COLUMN IF NOT EXISTS api_key_hash text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. Rate limiting table and atomic increment RPC
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_key text, p_window_start timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.api_rate_limits(key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key) DO UPDATE
    SET count = public.api_rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- 5. Activity Quiz Marks FK and unique constraint
ALTER TABLE public.marks ADD COLUMN IF NOT EXISTS class_activity_id uuid REFERENCES public.class_activities(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_marks_student_quiz ON public.marks(student_id, class_activity_id) WHERE class_activity_id IS NOT NULL;
