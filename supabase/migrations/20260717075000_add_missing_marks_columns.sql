-- Add missing columns to marks table
ALTER TABLE public.marks
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026',
ADD COLUMN IF NOT EXISTS grading_scale TEXT,
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES auth.users(id);

-- Add unique constraint to marks table
ALTER TABLE public.marks
DROP CONSTRAINT IF EXISTS marks_unique_student_subject_assessment;

ALTER TABLE public.marks
ADD CONSTRAINT marks_unique_student_subject_assessment UNIQUE (student_id, class_id, subject_id, assessment_type, term);
