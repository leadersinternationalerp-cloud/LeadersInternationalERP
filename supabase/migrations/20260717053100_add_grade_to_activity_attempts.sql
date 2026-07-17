-- Add grade column to activity_attempts table
ALTER TABLE public.activity_attempts ADD COLUMN IF NOT EXISTS grade text;
