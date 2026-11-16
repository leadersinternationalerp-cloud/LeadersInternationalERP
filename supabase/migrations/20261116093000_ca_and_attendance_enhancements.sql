-- Migration: C.A. Assessments & Attendance Tracking Enhancements
-- 1. Attendance: Add mandatory absence reason for 'Absent' status
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '';

UPDATE public.attendance
SET reason = 'Not specified'
WHERE status = 'Absent' AND length(trim(COALESCE(reason, ''))) = 0;

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_absent_reason_required;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_absent_reason_required
  CHECK (status <> 'Absent' OR length(trim(reason)) > 0);

-- 2. Assessment Weights: Add assessment_category ('ca' | 'exam')
ALTER TABLE public.assessment_weights
  ADD COLUMN IF NOT EXISTS assessment_category text NOT NULL DEFAULT 'ca';

ALTER TABLE public.assessment_weights
  DROP CONSTRAINT IF EXISTS assessment_weights_category_check;

ALTER TABLE public.assessment_weights
  ADD CONSTRAINT assessment_weights_category_check
  CHECK (assessment_category IN ('ca', 'exam'));

UPDATE public.assessment_weights
SET assessment_category = CASE
  WHEN upper(assessment_type) IN ('MID-TERM', 'MIDTERM', 'TERMINAL', 'FINAL', 'OPENER', 'MOCK')
    OR upper(assessment_type) LIKE '%EXAM%'
  THEN 'exam'
  ELSE 'ca'
END;

-- 3. Assessment Papers: Optional/tracked PDF question paper per class, subject, assessment_type, term
CREATE TABLE IF NOT EXISTS public.assessment_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  term text NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id, assessment_type, term)
);

ALTER TABLE public.assessment_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view assessment papers" ON public.assessment_papers;
CREATE POLICY "Authenticated users can view assessment papers"
  ON public.assessment_papers FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Teachers and leadership can manage assessment papers" ON public.assessment_papers;
CREATE POLICY "Teachers and leadership can manage assessment papers"
  ON public.assessment_papers FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  );
