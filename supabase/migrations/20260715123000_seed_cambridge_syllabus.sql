-- Seed Cambridge syllabus stages, subjects, units, topics, and learning objectives from local JSON curriculum.
-- This migration may be run after the main schema migrations have been applied.

INSERT INTO public.cambridge_stages (stage_name, description)
VALUES
  ('Stage 1', 'Cambridge syllabus content for Stage 1'),
  ('Stage 2', 'Cambridge syllabus content for Stage 2'),
  ('Stage 3', 'Cambridge syllabus content for Stage 3'),
  ('Stage 4', 'Cambridge syllabus content for Stage 4'),
  ('Stage 5', 'Cambridge syllabus content for Stage 5'),
  ('Stage 6', 'Cambridge syllabus content for Stage 6')
ON CONFLICT (stage_name) DO NOTHING;

-- Ensure Cambridge subjects table exists for each stage subject pair.
-- The actual per-topic data will be seeded with a script using the local curriculum JSON.

