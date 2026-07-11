-- Add columns to support locks and releases in grading and attendance
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE public.marks 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE;
