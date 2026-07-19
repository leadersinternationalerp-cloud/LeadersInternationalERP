-- Migration: Early Years Foundation Stage (EYFS) Database Enhancements

-- 1. Alter classes table
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS is_early_years boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS class_teacher_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS age_group text;

CREATE INDEX IF NOT EXISTS idx_classes_class_teacher_id ON public.classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_early_years ON public.classes(is_early_years);

-- Update existing early years classes based on names
UPDATE public.classes 
SET is_early_years = true 
WHERE 
  lower(name) LIKE '%nursery%' OR 
  lower(name) LIKE '%reception%' OR 
  lower(name) LIKE '%kg%' OR 
  lower(name) LIKE '%baby%' OR 
  lower(name) LIKE '%playgroup%' OR 
  lower(name) LIKE '%pre-primary%';

-- Seed default early years classes if they do not exist
INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'Baby Class A', 'A', true, '1-2y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'Baby Class A');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'Playgroup A', 'A', true, '2-3y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'Playgroup A');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'Nursery A', 'A', true, '3-4y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'Nursery A');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'Nursery B', 'B', true, '3-4y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'Nursery B');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'Reception A', 'A', true, '4-5y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'Reception A');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'Reception B', 'B', true, '4-5y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'Reception B');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'KG1 A', 'A', true, '5-6y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'KG1 A');

INSERT INTO public.classes (name, section, is_early_years, age_group)
SELECT 'KG2 A', 'A', true, '5-6y'
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE name = 'KG2 A');


-- 2. Alter students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS medical_info text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS language_at_home text,
  ADD COLUMN IF NOT EXISTS previous_school text,
  ADD COLUMN IF NOT EXISTS emergency_contact text;


-- 3. Alter learning_area_progress table
ALTER TABLE public.learning_area_progress
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id),
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS next_steps text,
  ADD COLUMN IF NOT EXISTS age_band text,
  ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS characteristics text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personal_social text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_update_timestamp_learning_area()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_learning_area_updated_at ON public.learning_area_progress;
CREATE TRIGGER update_learning_area_updated_at
BEFORE UPDATE ON public.learning_area_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_update_timestamp_learning_area();

-- Create UNIQUE INDEX for final observations
DROP INDEX IF EXISTS public.uniq_final_learning_area;
CREATE UNIQUE INDEX uniq_final_learning_area 
ON public.learning_area_progress (student_id, term_id, learning_area) 
WHERE (is_final = true);

CREATE INDEX IF NOT EXISTS idx_lap_student_id ON public.learning_area_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_lap_term_id ON public.learning_area_progress(term_id);
CREATE INDEX IF NOT EXISTS idx_lap_class_id ON public.learning_area_progress(class_id);
CREATE INDEX IF NOT EXISTS idx_lap_learning_area ON public.learning_area_progress(learning_area);


-- 4. Storage Bucket for EY Evidence
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ey-evidence',
  'ey-evidence',
  true,
  8388608, -- 8MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE 
SET public = true, file_size_limit = 8388608;

-- Storage Policies
DROP POLICY IF EXISTS "Public read access on ey-evidence" ON storage.objects;
CREATE POLICY "Public read access on ey-evidence" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'ey-evidence');

DROP POLICY IF EXISTS "Authenticated write access on ey-evidence" ON storage.objects;
CREATE POLICY "Authenticated write access on ey-evidence" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'ey-evidence');

DROP POLICY IF EXISTS "Authenticated update access on ey-evidence" ON storage.objects;
CREATE POLICY "Authenticated update access on ey-evidence" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'ey-evidence');

DROP POLICY IF EXISTS "Authenticated delete access on ey-evidence" ON storage.objects;
CREATE POLICY "Authenticated delete access on ey-evidence" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'ey-evidence');


-- 5. Alter report_card_releases table
ALTER TABLE public.report_card_releases
  ADD COLUMN IF NOT EXISTS is_early_years boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS learning_areas_included text[];


-- 6. RLS Policies on learning_area_progress
ALTER TABLE public.learning_area_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on learning_area_progress" ON public.learning_area_progress;
CREATE POLICY "Allow authenticated read on learning_area_progress"
ON public.learning_area_progress FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow teachers write on learning_area_progress" ON public.learning_area_progress;
CREATE POLICY "Allow teachers write on learning_area_progress"
ON public.learning_area_progress FOR ALL TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('Teacher', 'Principal', 'Dean', 'HOS', 'System Admin', 'Director')
)
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('Teacher', 'Principal', 'Dean', 'HOS', 'System Admin', 'Director')
);
