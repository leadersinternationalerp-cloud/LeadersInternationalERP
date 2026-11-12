-- Migration: 20261112010000_student_enrollment_documents.sql
-- Adds student admission documents storage bucket and JSONB metadata columns

-- 1. Add documents JSONB column to students and admission_applications
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- 2. Create student-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for student-documents
DROP POLICY IF EXISTS "Public read access on student-documents" ON storage.objects;
CREATE POLICY "Public read access on student-documents" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'student-documents');

DROP POLICY IF EXISTS "Authenticated write access on student-documents" ON storage.objects;
CREATE POLICY "Authenticated write access on student-documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-documents');

DROP POLICY IF EXISTS "Authenticated update access on student-documents" ON storage.objects;
CREATE POLICY "Authenticated update access on student-documents" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'student-documents') WITH CHECK (bucket_id = 'student-documents');

DROP POLICY IF EXISTS "Authenticated delete access on student-documents" ON storage.objects;
CREATE POLICY "Authenticated delete access on student-documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'student-documents');
