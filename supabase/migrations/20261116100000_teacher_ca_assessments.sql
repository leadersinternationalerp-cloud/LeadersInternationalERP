-- Migration: Teacher-Created C.A. / Unit Tests & Scores
-- Allows teachers to create named C.A. assessments (title, date, max_mark) per class/subject/term
-- and enter individual scores that automatically roll up into marks (assessment_type = 'CA').

CREATE TABLE IF NOT EXISTS public.ca_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  term text NOT NULL,
  title text NOT NULL,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  max_mark numeric(6,2) NOT NULL DEFAULT 100 CHECK (max_mark > 0),
  is_locked boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_assessments_lookup
  ON public.ca_assessments (class_id, subject_id, term, assessment_date DESC);

CREATE TABLE IF NOT EXISTS public.ca_assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.ca_assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  raw_score numeric(6,2) NOT NULL CHECK (raw_score >= 0),
  percentage numeric(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  remarks text NOT NULL DEFAULT '',
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_ca_assessment_scores_student
  ON public.ca_assessment_scores (student_id, assessment_id);

ALTER TABLE public.ca_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ca_assessment_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ca_assessments" ON public.ca_assessments;
CREATE POLICY "Authenticated users can view ca_assessments"
  ON public.ca_assessments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Teachers and leadership can manage ca_assessments" ON public.ca_assessments;
CREATE POLICY "Teachers and leadership can manage ca_assessments"
  ON public.ca_assessments FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  );

DROP POLICY IF EXISTS "Staff can manage ca_assessment_scores" ON public.ca_assessment_scores;
CREATE POLICY "Staff can manage ca_assessment_scores"
  ON public.ca_assessment_scores FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  );

DROP POLICY IF EXISTS "Students and parents can view own ca_assessment_scores" ON public.ca_assessment_scores;
CREATE POLICY "Students and parents can view own ca_assessment_scores"
  ON public.ca_assessment_scores FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.student_id = ca_assessment_scores.student_id
        AND sp.parent_id = auth.uid()
    )
  );
