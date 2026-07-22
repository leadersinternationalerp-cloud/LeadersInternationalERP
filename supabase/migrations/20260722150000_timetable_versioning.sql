-- Migration: Timetable Versioning and Archiving Support
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true NOT NULL;

-- Drop old constraints that would prevent keeping older timetables
ALTER TABLE public.timetable_entries DROP CONSTRAINT IF EXISTS unique_class_day_slot;

-- Create unique index only for active/current entries, allowing history archiving
CREATE UNIQUE INDEX IF NOT EXISTS unique_current_class_day_slot 
ON public.timetable_entries(class_id, day_of_week, slot_id) 
WHERE (is_current = true);
