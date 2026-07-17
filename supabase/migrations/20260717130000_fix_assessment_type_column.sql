-- Fix: assessment_type was changed to ENUM in production
-- Revert to flexible TEXT + safe constraint

ALTER TABLE public.marks 
  ALTER COLUMN assessment_type TYPE TEXT 
  USING assessment_type::text;

ALTER TABLE public.marks 
  DROP CONSTRAINT IF EXISTS marks_assessment_type_check;

ALTER TABLE public.marks 
  ADD CONSTRAINT marks_assessment_type_check 
  CHECK (assessment_type IN ('Test 1', 'Test 2', 'Mid-Term', 'Terminal', 'CA'));
