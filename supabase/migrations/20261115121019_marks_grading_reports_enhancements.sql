-- Migration: 20261115121019_marks_grading_reports_enhancements.sql
-- Enhances marks, grading, assessment weights, and report card schemas & RLS policies

-- 1. Enhance public.marks with raw_score and out_of columns, and remove rigid assessment_type check constraint
ALTER TABLE public.marks
  ADD COLUMN IF NOT EXISTS raw_score NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS out_of NUMERIC(6,2) DEFAULT 100;

ALTER TABLE public.marks
  DROP CONSTRAINT IF EXISTS marks_assessment_type_check;

ALTER TABLE public.marks
  ADD CONSTRAINT marks_assessment_type_check
  CHECK (assessment_type IS NOT NULL AND length(trim(assessment_type)) > 0);

ALTER TABLE public.marks
  DROP CONSTRAINT IF EXISTS marks_grading_scale_check;

-- Backfill out_of and raw_score from existing grading_scale ("Out of X ...") where raw_score is null
UPDATE public.marks
SET
  out_of = COALESCE(
    NULLIF((regexp_match(grading_scale, 'Out of\s+(\d+(?:\.\d+)?)', 'i'))[1]::numeric, 0),
    100
  ),
  raw_score = CASE
    WHEN grading_scale ~* 'Raw:\s*\d+' THEN (regexp_match(grading_scale, 'Raw:\s*(\d+(?:\.\d+)?)', 'i'))[1]::numeric
    ELSE score
  END
WHERE raw_score IS NULL AND score IS NOT NULL;

-- Normalize legacy scores where out_of <> 100 and grading_scale did not yet record "Raw:"
UPDATE public.marks
SET
  score = ROUND((raw_score / out_of) * 100.0, 2),
  grading_scale = 'Out of ' || trim(trailing '.' from trim(trailing '0' from out_of::text)) || ' (Raw: ' || trim(trailing '.' from trim(trailing '0' from raw_score::text)) || ')'
WHERE out_of IS NOT NULL
  AND out_of > 0
  AND out_of <> 100
  AND raw_score IS NOT NULL
  AND (grading_scale IS NULL OR grading_scale !~* 'Raw:\s*\d+');

-- Update RLS policies on public.marks
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers and staff can manage marks" ON public.marks;
CREATE POLICY "Teachers and staff can manage marks"
  ON public.marks FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  );

DROP POLICY IF EXISTS "Students can view own marks" ON public.marks;
CREATE POLICY "Students can view own marks"
  ON public.marks FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = student_id);

DROP POLICY IF EXISTS "Parents can view child marks" ON public.marks;
CREATE POLICY "Parents can view child marks"
  ON public.marks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_parents
      WHERE student_parents.parent_id = (SELECT auth.uid())
        AND student_parents.student_id = public.marks.student_id
    )
  );

-- 2. Enhance public.report_cards with full metadata, conduct, remarks, and unique (student_id, term_id) constraint
ALTER TABLE public.report_cards
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS term TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS conduct_grade TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS conduct_remark TEXT,
  ADD COLUMN IF NOT EXISTS class_teacher_comment TEXT,
  ADD COLUMN IF NOT EXISTS principal_comment TEXT,
  ADD COLUMN IF NOT EXISTS principal_comments TEXT,
  ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS total_present INT,
  ADD COLUMN IF NOT EXISTS total_sessions INT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS included_assessments JSONB;

-- Remove duplicate (student_id, term_id) rows before adding unique constraint
DELETE FROM public.report_cards a
USING public.report_cards b
WHERE a.student_id = b.student_id
  AND a.term_id = b.term_id
  AND a.ctid < b.ctid;

ALTER TABLE public.report_cards
  DROP CONSTRAINT IF EXISTS report_cards_student_term_unique;

ALTER TABLE public.report_cards
  ADD CONSTRAINT report_cards_student_term_unique UNIQUE (student_id, term_id);

ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated on report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Allow all for admin/principal on report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Staff can manage report_cards" ON public.report_cards;
DROP POLICY IF EXISTS "Students and parents can view report_cards" ON public.report_cards;

CREATE POLICY "Staff can manage report_cards"
  ON public.report_cards FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Teacher'])
  );

CREATE POLICY "Students and parents can view report_cards"
  ON public.report_cards FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = student_id
    OR EXISTS (
      SELECT 1 FROM public.student_parents sp
      WHERE sp.parent_id = (SELECT auth.uid())
        AND sp.student_id = public.report_cards.student_id
    )
  );

-- 3. Enhance public.report_card_releases with included_assessments and unique (class_id, term_id)
ALTER TABLE public.report_card_releases
  ADD COLUMN IF NOT EXISTS included_assessments JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DELETE FROM public.report_card_releases a
USING public.report_card_releases b
WHERE a.class_id = b.class_id
  AND a.term_id = b.term_id
  AND a.ctid < b.ctid;

ALTER TABLE public.report_card_releases
  DROP CONSTRAINT IF EXISTS report_card_releases_class_term_unique;

ALTER TABLE public.report_card_releases
  ADD CONSTRAINT report_card_releases_class_term_unique UNIQUE (class_id, term_id);

ALTER TABLE public.report_card_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow principal to publish report cards" ON public.report_card_releases;
DROP POLICY IF EXISTS "Management can manage report_card_releases" ON public.report_card_releases;

CREATE POLICY "Management can manage report_card_releases"
  ON public.report_card_releases FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS'])
  );

-- 4. Update assessment_weights RLS to allow Dean as well as Admin/Director/Principal
DROP POLICY IF EXISTS "Allow admin all access on assessment_weights" ON public.assessment_weights;
CREATE POLICY "Allow admin all access on assessment_weights"
  ON public.assessment_weights FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  )
  WITH CHECK (
    public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean'])
  );
