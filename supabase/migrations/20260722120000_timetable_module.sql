-- Migration: Timetable Module
-- Creates public.timetable_slots and public.timetable_entries with clean constraint validations, conflict checks and RLS policies.

CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE, -- Optional per-class or global override
    period_number INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    class_subject_id UUID REFERENCES public.class_subjects(id) ON DELETE CASCADE NOT NULL,
    day_of_week VARCHAR(20) NOT NULL, -- 'Monday', 'Tuesday', etc.
    slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE CASCADE NOT NULL,
    room VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_class_day_slot UNIQUE(class_id, day_of_week, slot_id)
);

-- Enable RLS
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.timetable_slots;
DROP POLICY IF EXISTS "Enable all access for administrators" ON public.timetable_slots;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.timetable_entries;
DROP POLICY IF EXISTS "Enable all access for administrators" ON public.timetable_entries;

-- RLS Policies
CREATE POLICY "Enable read access for all authenticated users"
ON public.timetable_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable all access for administrators"
ON public.timetable_slots FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND (
            role::text ILIKE '%System Admin%' OR
            role::text ILIKE '%Director%' OR
            role::text ILIKE '%Principal%' OR
            role::text ILIKE '%Dean%' OR
            role::text ILIKE '%HOS%'
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND (
            role::text ILIKE '%System Admin%' OR
            role::text ILIKE '%Director%' OR
            role::text ILIKE '%Principal%' OR
            role::text ILIKE '%Dean%' OR
            role::text ILIKE '%HOS%'
          )
    )
);

CREATE POLICY "Enable read access for all authenticated users"
ON public.timetable_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable all access for administrators"
ON public.timetable_entries FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND (
            role::text ILIKE '%System Admin%' OR
            role::text ILIKE '%Director%' OR
            role::text ILIKE '%Principal%' OR
            role::text ILIKE '%Dean%' OR
            role::text ILIKE '%HOS%'
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND (
            role::text ILIKE '%System Admin%' OR
            role::text ILIKE '%Director%' OR
            role::text ILIKE '%Principal%' OR
            role::text ILIKE '%Dean%' OR
            role::text ILIKE '%HOS%'
          )
    )
);
