-- Migration: Add periods_per_week to class_subjects
ALTER TABLE public.class_subjects ADD COLUMN IF NOT EXISTS periods_per_week INTEGER DEFAULT 4 NOT NULL;
