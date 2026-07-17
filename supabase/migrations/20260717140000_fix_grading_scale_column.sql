-- Fix: grading_scale was turned into an ENUM in production
ALTER TABLE public.marks 
  ALTER COLUMN grading_scale TYPE TEXT 
  USING grading_scale::text;

ALTER TABLE public.marks 
  DROP CONSTRAINT IF EXISTS marks_grading_scale_check;

-- Clean up any invalid grading scale rows first to prevent constraint violations
UPDATE public.marks
SET grading_scale = 'Standard'
WHERE grading_scale IS NOT NULL
  AND grading_scale NOT LIKE 'Out of %'
  AND grading_scale <> 'Standard';

ALTER TABLE public.marks 
  ADD CONSTRAINT marks_grading_scale_check 
  CHECK (
    grading_scale IS NULL 
    OR grading_scale LIKE 'Out of %' 
    OR grading_scale = 'Standard'
  );
