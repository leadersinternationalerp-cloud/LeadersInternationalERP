-- Migration: 20261030000000_admission_applications.sql
-- Creates public.admission_applications table for website submissions & ERP admission management

CREATE SEQUENCE IF NOT EXISTS public.admission_application_seq START 1;

CREATE TABLE IF NOT EXISTS public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected', 'enrolled', 'cancelled')),
  
  -- Student Information
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  date_of_birth date,
  gender text,
  place_of_birth text,
  nationality text DEFAULT 'Tanzanian',
  id_number text,
  curriculum text DEFAULT 'Cambridge',
  class_applied_for text NOT NULL,
  academic_year text DEFAULT '2026/2027',
  start_term text,
  previous_school text,

  -- Primary Parent / Guardian Information
  parent_name text NOT NULL,
  parent_relationship text DEFAULT 'Parent',
  parent_occupation text,
  parent_employer text,
  parent_email text NOT NULL,
  parent_phone text NOT NULL,
  parent_whatsapp text,
  parent_address text,

  -- Secondary Parent / Guardian (optional)
  guardian2_name text,
  guardian2_relationship text,
  guardian2_occupation text,
  guardian2_employer text,
  guardian2_phone text,
  guardian2_email text,
  guardian2_address text,

  -- Services & Options
  transport_required boolean DEFAULT false,
  transport_route text,
  fee_plan text,
  clubs text[] DEFAULT ARRAY[]::text[],
  medical_conditions text,
  special_talents_interests text,
  additional_notes text,
  source text DEFAULT 'website',

  -- Processing & Communication Metadata
  pdf_sent_to_school boolean DEFAULT false,
  pdf_sent_to_parent boolean DEFAULT false,
  email_sent_at timestamptz,
  notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for search & filtering
CREATE INDEX IF NOT EXISTS idx_admission_apps_status ON public.admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_apps_created_at ON public.admission_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admission_apps_email ON public.admission_applications(parent_email);
CREATE INDEX IF NOT EXISTS idx_admission_apps_class ON public.admission_applications(class_applied_for);

-- RLS
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view admission applications" ON public.admission_applications;
CREATE POLICY "Staff can view admission applications" ON public.admission_applications
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'HOS', 'Accountant'])
);

DROP POLICY IF EXISTS "Management can update admission applications" ON public.admission_applications;
CREATE POLICY "Management can update admission applications" ON public.admission_applications
FOR UPDATE TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal'])
)
WITH CHECK (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal'])
);

DROP POLICY IF EXISTS "Management can delete admission applications" ON public.admission_applications;
CREATE POLICY "Management can delete admission applications" ON public.admission_applications
FOR DELETE TO authenticated
USING (
  public.has_any_role(ARRAY['System Admin', 'Director', 'Principal'])
);
