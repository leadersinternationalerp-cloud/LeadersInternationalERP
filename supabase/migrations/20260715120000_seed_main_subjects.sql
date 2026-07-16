-- Migration: Seed 8 Main Subjects & Synchronize Subject Columns Across System
-- Ensures both `name` and `subject_name` columns exist and are populated across `subjects` and `cambridge_subjects`.

-- 1. Ensure `public.subjects` table exists with comprehensive columns
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE,
    subject_name TEXT,
    code TEXT,
    subject_code TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created earlier with partial schema
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and setup policies idempotently
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users read access to subjects" ON public.subjects;
CREATE POLICY "Allow all authenticated users read access to subjects" ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins to manage subjects" ON public.subjects;
CREATE POLICY "Allow admins to manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

-- Sync any existing records where one name field is populated and the other is not
UPDATE public.subjects SET name = subject_name WHERE name IS NULL AND subject_name IS NOT NULL;
UPDATE public.subjects SET subject_name = name WHERE subject_name IS NULL AND name IS NOT NULL;
UPDATE public.subjects SET code = subject_code WHERE code IS NULL AND subject_code IS NOT NULL;
UPDATE public.subjects SET subject_code = code WHERE subject_code IS NULL AND code IS NOT NULL;

-- Ensure unique constraint on `name` for safe ON CONFLICT handling
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_name_key;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_name_key UNIQUE (name);

-- 2. Insert or update the 8 main subjects required across the entire system
INSERT INTO public.subjects (name, subject_name, code, subject_code, department, created_at, updated_at)
VALUES 
    ('Art & Craft', 'Art & Craft', 'ART', 'ART', 'Arts', NOW(), NOW()),
    ('Computing', 'Computing', 'COMP', 'COMP', 'Sciences', NOW(), NOW()),
    ('Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI', 'Sciences', NOW(), NOW()),
    ('English Language', 'English Language', 'ENG', 'ENG', 'Languages', NOW(), NOW()),
    ('Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB', 'Humanities', NOW(), NOW()),
    ('Mathematics', 'Mathematics', 'MATH', 'MATH', 'Mathematics', NOW(), NOW()),
    ('Music', 'Music', 'MUS', 'MUS', 'Arts', NOW(), NOW()),
    ('Science', 'Science', 'SCI', 'SCI', 'Sciences', NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET
    subject_name = EXCLUDED.subject_name,
    code = EXCLUDED.code,
    subject_code = EXCLUDED.subject_code,
    department = EXCLUDED.department,
    updated_at = NOW();

-- 3. Clean up any non-standard subjects outside the 8 approved ones
DELETE FROM public.subjects 
WHERE name NOT IN (
    'Art & Craft',
    'Computing',
    'Digital Literacy',
    'English Language',
    'Global Perspectives',
    'Mathematics',
    'Music',
    'Science'
);

-- 4. Ensure `cambridge_subjects` table also has synchronized name/code columns for syllabus consistency
CREATE TABLE IF NOT EXISTS public.cambridge_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES public.cambridge_stages(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  name text,
  subject_code text,
  code text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(stage_id, subject_name)
);

ALTER TABLE public.cambridge_subjects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.cambridge_subjects ADD COLUMN IF NOT EXISTS code TEXT;

UPDATE public.cambridge_subjects SET name = subject_name WHERE name IS NULL;
UPDATE public.cambridge_subjects SET subject_name = name WHERE subject_name IS NULL AND name IS NOT NULL;
UPDATE public.cambridge_subjects SET code = subject_code WHERE code IS NULL;
UPDATE public.cambridge_subjects SET subject_code = code WHERE subject_code IS NULL AND code IS NOT NULL;
