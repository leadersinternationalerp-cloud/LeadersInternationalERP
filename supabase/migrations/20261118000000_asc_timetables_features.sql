-- Migration: aSc TimeTables Full Feature Set
-- Adds buildings, classrooms, class divisions/groups, teacher/class/subject constraints,
-- card relationships, substitutions, supervisions, timetable versions, settings,
-- card locking, multi-period cards, and group-aware scheduling.

-- 1. Buildings
CREATE TABLE IF NOT EXISTS public.timetable_buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    short_name VARCHAR(20),
    travel_periods INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Classrooms / Rooms
CREATE TABLE IF NOT EXISTS public.timetable_classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    short_name VARCHAR(20),
    capacity INTEGER DEFAULT 40 NOT NULL,
    building_id UUID REFERENCES public.timetable_buildings(id) ON DELETE SET NULL,
    is_shared BOOLEAN DEFAULT false NOT NULL,
    home_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    time_off JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Class Divisions & Groups (e.g., Division "Language" -> Group "French", Group "Swahili")
CREATE TABLE IF NOT EXISTS public.timetable_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    division_name VARCHAR(80) NOT NULL DEFAULT 'Default',
    group_name VARCHAR(80) NOT NULL,
    student_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Teacher Constraints & Time-Off
CREATE TABLE IF NOT EXISTS public.timetable_teacher_constraints (
    teacher_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    max_windows_per_day INTEGER,
    max_windows_per_week INTEGER,
    max_consecutive_periods INTEGER,
    min_periods_per_day INTEGER,
    max_periods_per_day INTEGER,
    max_days_per_week INTEGER,
    max_building_transits_per_day INTEGER,
    can_substitute BOOLEAN DEFAULT true NOT NULL,
    color VARCHAR(20),
    time_off JSONB DEFAULT '{}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Class Constraints & Time-Off
CREATE TABLE IF NOT EXISTS public.timetable_class_constraints (
    class_id UUID PRIMARY KEY REFERENCES public.classes(id) ON DELETE CASCADE,
    home_classroom_id UUID REFERENCES public.timetable_classrooms(id) ON DELETE SET NULL,
    max_periods_per_day INTEGER,
    min_periods_per_day INTEGER,
    allow_gaps BOOLEAN DEFAULT false NOT NULL,
    lunch_min_period INTEGER,
    lunch_max_period INTEGER,
    forbid_after_lunch_if_last BOOLEAN DEFAULT false NOT NULL,
    time_off JSONB DEFAULT '{}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Subject Constraints & Time-Off
CREATE TABLE IF NOT EXISTS public.timetable_subject_constraints (
    subject_id UUID PRIMARY KEY REFERENCES public.subjects(id) ON DELETE CASCADE,
    preferred_classroom_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL,
    color VARCHAR(20),
    max_per_day INTEGER DEFAULT 1 NOT NULL,
    time_off JSONB DEFAULT '{}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Card Relationships
CREATE TABLE IF NOT EXISTS public.timetable_card_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relation_type VARCHAR(50) NOT NULL,
    -- 'not_same_day' | 'cannot_follow' | 'must_follow' | 'must_be_same_day' | 'even_distribution' | 'simultaneous' | 'max_per_day' | 'min_gap_days'
    importance VARCHAR(20) DEFAULT 'strict' NOT NULL, -- 'strict' | 'normal' | 'relaxed'
    subject_id_a UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_id_b UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    lesson_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL,
    params JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Daily Substitutions
CREATE TABLE IF NOT EXISTS public.timetable_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_date DATE NOT NULL,
    entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE CASCADE NOT NULL,
    original_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    substitute_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    classroom_id UUID REFERENCES public.timetable_classrooms(id) ON DELETE SET NULL,
    room VARCHAR(100),
    status VARCHAR(30) DEFAULT 'assigned' NOT NULL, -- 'pending' | 'assigned' | 'cancelled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Break / Lunch Supervisions
CREATE TABLE IF NOT EXISTS public.timetable_supervisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week VARCHAR(20) NOT NULL,
    slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    area_name VARCHAR(120) NOT NULL,
    classroom_id UUID REFERENCES public.timetable_classrooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Timetable Versions / Snapshots
CREATE TABLE IF NOT EXISTS public.timetable_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    snapshot JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Global Timetable Settings
CREATE TABLE IF NOT EXISTS public.timetable_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    days_of_week TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] NOT NULL,
    periods_per_day INTEGER DEFAULT 8 NOT NULL,
    multi_week_enabled BOOLEAN DEFAULT false NOT NULL,
    weeks_count INTEGER DEFAULT 1 NOT NULL,
    lunch_enabled BOOLEAN DEFAULT false NOT NULL,
    lunch_min_period INTEGER DEFAULT 4 NOT NULL,
    lunch_max_period INTEGER DEFAULT 6 NOT NULL,
    auto_relax_constraints BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_timetable_settings_row CHECK (id = 1)
);

INSERT INTO public.timetable_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 12. Extend class_subjects for aSc lesson properties
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS periods_per_card INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.timetable_groups(id) ON DELETE SET NULL;
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS allowed_classroom_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL;
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS joint_class_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL;
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS co_teacher_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL;
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS color VARCHAR(20);

-- 13. Extend timetable_entries for classroom, group, lock, week, and multi-period card grouping
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.timetable_classrooms(id) ON DELETE SET NULL;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.timetable_groups(id) ON DELETE SET NULL;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS week_code VARCHAR(10) DEFAULT 'ALL' NOT NULL;
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS card_group_id UUID;

-- Update unique index to support divided groups & multi-week cycles
DROP INDEX IF EXISTS public.unique_current_class_day_slot;
CREATE UNIQUE INDEX IF NOT EXISTS unique_current_class_group_day_slot_week
ON public.timetable_entries (
    class_id,
    COALESCE(group_id, '00000000-0000-0000-0000-000000000000'::uuid),
    day_of_week,
    slot_id,
    week_code
)
WHERE (is_current = true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timetable_entries_classroom ON public.timetable_entries(classroom_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_timetable_entries_slot_day ON public.timetable_entries(day_of_week, slot_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_timetable_groups_class ON public.timetable_groups(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_substitutions_date ON public.timetable_substitutions(sub_date);
CREATE INDEX IF NOT EXISTS idx_timetable_supervisions_day_slot ON public.timetable_supervisions(day_of_week, slot_id);

-- 14. Enable RLS on all new tables
ALTER TABLE public.timetable_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_teacher_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_class_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_subject_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_card_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_supervisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;

-- Helper DO block to apply consistent read (authenticated) + write (admin) policies
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'timetable_buildings',
        'timetable_classrooms',
        'timetable_groups',
        'timetable_teacher_constraints',
        'timetable_class_constraints',
        'timetable_subject_constraints',
        'timetable_card_relationships',
        'timetable_substitutions',
        'timetable_supervisions',
        'timetable_versions',
        'timetable_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for administrators" ON public.%I', tbl);

        EXECUTE format(
            'CREATE POLICY "Enable read access for all authenticated users" ON public.%I FOR SELECT TO authenticated USING (true)',
            tbl
        );

        EXECUTE format(
            'CREATE POLICY "Enable all access for administrators" ON public.%I FOR ALL TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                      AND (
                        role::text ILIKE ''%%System Admin%%'' OR
                        role::text ILIKE ''%%Director%%'' OR
                        role::text ILIKE ''%%Principal%%'' OR
                        role::text ILIKE ''%%Dean%%'' OR
                        role::text ILIKE ''%%HOS%%'' OR
                        role::text ILIKE ''%%Head of Section%%''
                      )
                )
            ) WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE id = auth.uid()
                      AND (
                        role::text ILIKE ''%%System Admin%%'' OR
                        role::text ILIKE ''%%Director%%'' OR
                        role::text ILIKE ''%%Principal%%'' OR
                        role::text ILIKE ''%%Dean%%'' OR
                        role::text ILIKE ''%%HOS%%'' OR
                        role::text ILIKE ''%%Head of Section%%''
                      )
                )
            )',
            tbl
        );
    END LOOP;
END $$;
