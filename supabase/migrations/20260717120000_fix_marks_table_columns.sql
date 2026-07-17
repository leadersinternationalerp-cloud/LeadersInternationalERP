-- Antigravity marks fix - 2026-07-17
ALTER TABLE public.marks 
  ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
ALTER TABLE public.marks 
  ADD COLUMN IF NOT EXISTS grading_scale TEXT;
ALTER TABLE public.marks 
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES auth.users(id);
ALTER TABLE public.marks 
  ALTER COLUMN is_locked SET DEFAULT false,
  ALTER COLUMN is_released SET DEFAULT false;
ALTER TABLE public.marks 
  DROP CONSTRAINT IF EXISTS marks_unique_student_subject_assessment;
ALTER TABLE public.marks 
  ADD CONSTRAINT marks_unique_student_subject_assessment 
  UNIQUE (student_id, class_id, subject_id, assessment_type, term);
CREATE INDEX IF NOT EXISTS idx_marks_teacher_lookup 
  ON public.marks (class_id, subject_id, assessment_type, term);
