-- Migration: Seed Cambridge syllabus (stages, subjects, units, topics) from schemes of work JSON
-- Generated from src/lib/data/curriculum/all_subjects.json (schemes use 'Stage N'; the UI 'Grade N' maps to 'Stage N').
-- Idempotent: safe to re-run.

-- 1. Stages
INSERT INTO public.cambridge_stages (stage_name, description)
VALUES
  ('Stage 1', 'Cambridge syllabus content for Stage 1'),
  ('Stage 2', 'Cambridge syllabus content for Stage 2'),
  ('Stage 3', 'Cambridge syllabus content for Stage 3'),
  ('Stage 4', 'Cambridge syllabus content for Stage 4'),
  ('Stage 5', 'Cambridge syllabus content for Stage 5'),
  ('Stage 6', 'Cambridge syllabus content for Stage 6')
ON CONFLICT (stage_name) DO NOTHING;

-- 2. Subjects per stage
INSERT INTO public.cambridge_subjects (stage_id, subject_name, name, subject_code, code)
  SELECT s.id, 'Art and Craft', 'Art and Craft', 'ART', 'ART' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Art and Craft', 'Art and Craft', 'ART', 'ART' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Art and Craft', 'Art and Craft', 'ART', 'ART' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Art and Craft', 'Art and Craft', 'ART', 'ART' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Art and Craft', 'Art and Craft', 'ART', 'ART' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Art and Craft', 'Art and Craft', 'ART', 'ART' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'Computing', 'Computing', 'COMP', 'COMP' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Computing', 'Computing', 'COMP', 'COMP' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Computing', 'Computing', 'COMP', 'COMP' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Computing', 'Computing', 'COMP', 'COMP' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Computing', 'Computing', 'COMP', 'COMP' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Computing', 'Computing', 'COMP', 'COMP' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Digital Literacy', 'Digital Literacy', 'DIGI', 'DIGI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'English Language', 'English Language', 'ENG', 'ENG' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'English Language', 'English Language', 'ENG', 'ENG' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'English Language', 'English Language', 'ENG', 'ENG' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'English Language', 'English Language', 'ENG', 'ENG' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'English Language', 'English Language', 'ENG', 'ENG' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'English Language', 'English Language', 'ENG', 'ENG' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Global Perspectives', 'Global Perspectives', 'GLOB', 'GLOB' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'Mathematics', 'Mathematics', 'MATH', 'MATH' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Mathematics', 'Mathematics', 'MATH', 'MATH' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Mathematics', 'Mathematics', 'MATH', 'MATH' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Mathematics', 'Mathematics', 'MATH', 'MATH' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Mathematics', 'Mathematics', 'MATH', 'MATH' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Mathematics', 'Mathematics', 'MATH', 'MATH' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'Music', 'Music', 'MUS', 'MUS' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Music', 'Music', 'MUS', 'MUS' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Music', 'Music', 'MUS', 'MUS' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Music', 'Music', 'MUS', 'MUS' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Music', 'Music', 'MUS', 'MUS' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Music', 'Music', 'MUS', 'MUS' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
  UNION ALL
  SELECT s.id, 'Science', 'Science', 'SCI', 'SCI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 1'
  UNION ALL
  SELECT s.id, 'Science', 'Science', 'SCI', 'SCI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 2'
  UNION ALL
  SELECT s.id, 'Science', 'Science', 'SCI', 'SCI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 3'
  UNION ALL
  SELECT s.id, 'Science', 'Science', 'SCI', 'SCI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 4'
  UNION ALL
  SELECT s.id, 'Science', 'Science', 'SCI', 'SCI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 5'
  UNION ALL
  SELECT s.id, 'Science', 'Science', 'SCI', 'SCI' FROM public.cambridge_stages s WHERE s.stage_name = 'Stage 6'
ON CONFLICT (stage_id, subject_name) DO UPDATE SET name = EXCLUDED.name, subject_code = EXCLUDED.subject_code, code = EXCLUDED.code;

-- 3. Units (one per subject/stage) and Topics
-- Art and Craft / Stage 1 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Art and Craft Stage 1'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Art and Craft'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Sculpting with clay'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Sculpting with clay'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Drawing with purpose'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Drawing with purpose'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Introduction to printing'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Introduction to printing'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Painting: Processes and movements'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Painting: Processes and movements'
  );

-- Art and Craft / Stage 3 (5 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Art and Craft Stage 3'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Art and Craft'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Drawing from encounter'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Drawing from encounter'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Mosiac'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Mosiac'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Painting from encounter'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Painting from encounter'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Exploring structure'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Exploring structure'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Mosaic'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Mosaic'
  );

-- Art and Craft / Stage 4 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Art and Craft Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Art and Craft'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Printing for a purpose'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Printing for a purpose'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Approaches to painting'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Approaches to painting'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Drawing with perspective and dynamism'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Drawing with perspective and dynamism'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Exploring architecture through 3D art'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Exploring architecture through 3D art'
  );

-- Art and Craft / Stage 5 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Art and Craft Stage 5'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Art and Craft'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Exploring drawing processes'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Exploring drawing processes'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Sculpting animals'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Sculpting animals'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Exploring fabric and other crafts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Exploring fabric and other crafts'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Painting for purpose and expression'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Painting for purpose and expression'
  );

-- Art and Craft / Stage 6 (5 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Art and Craft Stage 6'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Art and Craft'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Combining printing approaches'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Combining printing approaches'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Drawing humour and perspective'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Drawing humour and perspective'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Painting creatively from encounters'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Painting creatively from encounters'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'a Sculpting with wire (optional)'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'a Sculpting with wire (optional)'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'b Project: Concept to final outcome (optional)'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Art and Craft' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'b Project: Concept to final outcome (optional)'
  );

-- Computing / Stage 1 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Computing Stage 1'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Have you ever wondered…?'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Have you ever wondered…?'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Let’s create'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Let’s create'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Party time'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Party time'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Dance like a dinosaur'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Dance like a dinosaur'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Let’s investigate'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Let’s investigate'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'End of stage projects'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'End of stage projects'
  );

-- Computing / Stage 3 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Computing Stage 3'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Computational thinking'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Computational thinking'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'What is a computer?'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'What is a computer?'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Secret codes'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Secret codes'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Data café'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Data café'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Further coding'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Further coding'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'End of stage projects'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'End of stage projects'
  );

-- Computing / Stage 4 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Computing Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Input, process, output'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Input, process, output'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Data handling'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Data handling'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Programming loops'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Programming loops'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Let’s get physical!'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Let’s get physical!'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Networks and communication'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Networks and communication'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'End of stage projects'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'End of stage projects'
  );

-- Computing / Stage 5 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Computing Stage 5'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Binary decision making'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Binary decision making'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Coding with numbers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Coding with numbers'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Data collection and analysis'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Data collection and analysis'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Networking'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Networking'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Internet of smart things'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Internet of smart things'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'End of Stage Projects'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'End of Stage Projects'
  );

-- Computing / Stage 6 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Computing Stage 6'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Comical coding'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Comical coding'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Humans think, computers obey'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Humans think, computers obey'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Quiz time'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Quiz time'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Weather data management system'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Weather data management system'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Seeing through the clouds'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Seeing through the clouds'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'End of stage projects'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Computing' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'End of stage projects'
  );

-- Digital Literacy / Stage 1 (3 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Digital Literacy Stage 1'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Digital Literacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Safe and secure'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Safe and secure'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'What is a computer?'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'What is a computer?'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'How a computer can help us'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'How a computer can help us'
  );

-- Digital Literacy / Stage 2 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Digital Literacy Stage 2'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Digital Literacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Research and create'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Research and create'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Who are you?'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Who are you?'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'The digital world'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The digital world'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Animation'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Animation'
  );

-- Digital Literacy / Stage 3 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Digital Literacy Stage 3'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Digital Literacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Document creation'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Document creation'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Written online communication'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Written online communication'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Safe digital research'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Safe digital research'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'The history of computers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The history of computers'
  );

-- Digital Literacy / Stage 4 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Digital Literacy Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Digital Literacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Presenting information on screen'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Presenting information on screen'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Documentary makers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Documentary makers'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Critical internet research'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Critical internet research'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Online communities'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Online communities'
  );

-- Digital Literacy / Stage 5 (8 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Digital Literacy Stage 5'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', '– The podcast revival'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = '– The podcast revival'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', '– Our changing digital world'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = '– Our changing digital world'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', '– My digital presence'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = '– My digital presence'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', '– Robot designers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = '– Robot designers'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'The podcast revival'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The podcast revival'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Our changing digital world'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Our changing digital world'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'My digital presence'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'My digital presence'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Robot designers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Robot designers'
  );

-- Digital Literacy / Stage 6 (4 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Digital Literacy Stage 6'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Digital Literacy'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Malware'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Malware'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Intellectual property'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Intellectual property'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Disruptive technologies'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Disruptive technologies'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Digital resilience'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Digital Literacy' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Digital resilience'
  );

-- English Language / Stage 1 (9 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'English Language Stage 1'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Stories with repetitive language'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories with repetitive language'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Recounts of personal experiences'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Recounts of personal experiences'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Traditional rhymes'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Traditional rhymes'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Instructions'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Instructions'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Simple rhyming poems'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Simple rhyming poems'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Traditional tales'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Traditional tales'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'Poems on similar themes'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems on similar themes'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Stories with familiar settings'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories with familiar settings'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Information texts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Information texts'
  );

-- English Language / Stage 2 (9 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'English Language Stage 2'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Information texts: personal information'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Information texts: personal information'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Traditional tales from different cultures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Traditional tales from different cultures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Poems with patterns in sounds'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems with patterns in sounds'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Stories with familiar themes'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories with familiar themes'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Poems with patterns in structure'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems with patterns in structure'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Explanations'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Explanations'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'Poems to perform'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems to perform'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Stories by well-known writers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories by well-known writers'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Information texts: reports about a subject'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Information texts: reports about a subject'
  );

-- English Language / Stage 3 (9 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'English Language Stage 3'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Different stories by the same writer'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Different stories by the same writer'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Formal and informal letters'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Formal and informal letters'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Poems from different cultures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems from different cultures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Information texts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Information texts'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Myths and legends: narratives'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Myths and legends: narratives'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Myths and legends: playscripts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Myths and legends: playscripts'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'Poems with different structures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems with different structures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Adventure stories'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Adventure stories'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Instructions'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Instructions'
  );

-- English Language / Stage 4 (9 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'English Language Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Historical stories'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Historical stories'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Recounts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Recounts'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Poems from different times and cultures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems from different times and cultures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Explanations'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Explanations'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Fantasy stories'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Fantasy stories'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Playscripts that show a range of dramatic conventions'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Playscripts that show a range of dramatic conventions'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'A range of poetry, including free verse, on a common theme'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'A range of poetry, including free verse, on a common theme'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Stories about issues and dilemmas'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories about issues and dilemmas'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Persuasive texts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Persuasive texts'
  );

-- English Language / Stage 5 (9 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'English Language Stage 5'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Stories from different cultures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories from different cultures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Recounts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Recounts'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Narrative poetry'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Narrative poetry'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Explain it to me'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Explain it to me'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Poems by significant poets'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poems by significant poets'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Classic literature'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Classic literature'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'A playscript, book and film of the same story'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'A playscript, book and film of the same story'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Stories developed into films'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories developed into films'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Persuasive texts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Persuasive texts'
  );

-- English Language / Stage 6 (9 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'English Language Stage 6'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Stories with flashbacks'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories with flashbacks'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Historical recounts'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Historical recounts'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Poetic language'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Poetic language'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'The environment'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The environment'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Nature poetry'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Nature poetry'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Science fiction'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Science fiction'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'Plays by a significant writer'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Plays by a significant writer'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Stories by significant children’s writers'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Stories by significant children’s writers'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Advertising'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'English Language' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Advertising'
  );

-- Mathematics / Stage 4 (26 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Mathematics Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Number'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Number'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'The number system'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The number system'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Number patterns'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Number patterns'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', '2D and 3D shape'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = '2D and 3D shape'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Quadrilaterals, circles and area'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Quadrilaterals, circles and area'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Angles'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Angles'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', '3D shapes, volume and capacity'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = '3D shapes, volume and capacity'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T8', 'Calculation'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Calculation'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T9', 'Addition and subtraction'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Addition and subtraction'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T10', 'Multiplication and division'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Multiplication and division'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T11', 'Statistical methods'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Statistical methods'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T12', 'Designing the enquiry'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Designing the enquiry'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T13', 'Presenting and explaining results'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Presenting and explaining results'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T14', 'Using statistical measures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Using statistical measures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T15', 'The statistical cycle'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The statistical cycle'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T16', 'Fractions, percentages, decimals and proportion'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Fractions, percentages, decimals and proportion'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T17', 'Comparing fractions'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Comparing fractions'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T18', 'Calculating with fractions'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Calculating with fractions'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T19', 'Understanding percentage and equivalence'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Understanding percentage and equivalence'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T20', 'Ratio and proportion'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Ratio and proportion'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T21', 'The coordinate grid'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The coordinate grid'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T22', 'Using coordinates'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Using coordinates'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T23', 'Reflection and rotation'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Reflection and rotation'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T24', 'Probability'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Probability'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T25', 'Describing possibilities'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Describing possibilities'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T26', 'Conducting tests'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Mathematics' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Conducting tests'
  );

-- Music / Stage 1 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Music Stage 1'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'We can sing'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'We can sing'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Fun with sound'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Fun with sound'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Musical journeys'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Musical journeys'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Travel'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Travel'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Celebration'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Celebration'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Units include some additional activities and teaching notes to support teachers and learners.'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 1' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Units include some additional activities and teaching notes to support teachers and learners.'
  );

-- Music / Stage 2 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Music Stage 2'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Rhythm and pulse'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Rhythm and pulse'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Soundscapes, layering sounds and rounds'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Soundscapes, layering sounds and rounds'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Ostinato and texture'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Ostinato and texture'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'The hummingbird sings'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The hummingbird sings'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Celebration'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Celebration'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Units include some additional activities and teaching notes to support teachers and learners.'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Units include some additional activities and teaching notes to support teachers and learners.'
  );

-- Music / Stage 4 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Music Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'The power of rhythm'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The power of rhythm'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'The sound of the rainforest'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'The sound of the rainforest'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Creating characters'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Creating characters'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'How does the music tell a story?'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'How does the music tell a story?'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Celebration'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Celebration'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Units include some additional activities and teaching notes to support teachers and learners.'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Units include some additional activities and teaching notes to support teachers and learners.'
  );

-- Music / Stage 5 (7 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Music Stage 5'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Building a pop song'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Building a pop song'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Creating music in response to art'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Creating music in response to art'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Singing to sleep'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Singing to sleep'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Space-scape'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Space-scape'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Celebration'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Celebration'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Units have been reordered to better support progression e.g. Unit 5.3 is now ‘Singing to sleep’ and Unit 5.4 is ‘Space-scape’.'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Units have been reordered to better support progression e.g. Unit 5.3 is now ‘Singing to sleep’ and Unit 5.4 is ‘Space-scape’.'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'Units include some additional activities and teaching notes to support teachers and learners e.g. extension activities added to Unit 5.1 and Unit 5.2.'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Units include some additional activities and teaching notes to support teachers and learners e.g. extension activities added to Unit 5.1 and Unit 5.2.'
  );

-- Music / Stage 6 (5 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Music Stage 6'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Music'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'I’ve got rhythm'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'I’ve got rhythm'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Special occasions'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Special occasions'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'All about the bass'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'All about the bass'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Word variation'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Word variation'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Variety show'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Music' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Variety show'
  );

-- Science / Stage 2 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Science Stage 2'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Materials in our world'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Materials in our world'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Living things in different places'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Living things in different places'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Light from different sources'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Light from different sources'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Growing and keeping healthy'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Growing and keeping healthy'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Make a change'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Make a change'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Polar explorer'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 2' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Polar explorer'
  );

-- Science / Stage 3 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Science Stage 3'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Living things and plants'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Living things and plants'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Forces and magnetism'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Forces and magnetism'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'States of matter'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'States of matter'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Animals'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Animals'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Light and shadows'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Light and shadows'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'On Earth and beyond'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 3' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'On Earth and beyond'
  );

-- Science / Stage 4 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Science Stage 4'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Skeletons'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Skeletons'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'On Earth and beyond'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'On Earth and beyond'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Materials: properties and changes'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Materials: properties and changes'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Energy and Light'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Energy and Light'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Life processes and ecosystems'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Life processes and ecosystems'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Electricity'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 4' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Electricity'
  );

-- Science / Stage 5 (6 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Science Stage 5'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Plants'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Plants'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Materials'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Materials'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Forces'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Forces'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Animals'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Animals'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Waves'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Waves'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Planet Earth'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 5' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Planet Earth'
  );

-- Science / Stage 6 (7 topics)
INSERT INTO public.cambridge_units (cambridge_subject_id, unit_number, unit_title)
SELECT cs.id, 1, 'Science Stage 6'
FROM public.cambridge_subjects cs
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science'
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_units u WHERE u.cambridge_subject_id = cs.id AND u.unit_number = 1
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T1', 'Forces and movement, on Earth and beyond'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Forces and movement, on Earth and beyond'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T2', 'Human health and disease'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Human health and disease'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T3', 'Materials, including rocks, and physical change'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Materials, including rocks, and physical change'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T4', 'Electricity, conductors and light'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Electricity, conductors and light'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T5', 'Chemical changes and mixtures'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Chemical changes and mixtures'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T6', 'Ecosystems'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Ecosystems'
  );
INSERT INTO public.cambridge_topics (unit_id, topic_number, topic_title)
SELECT u.id, 'T7', 'Puberty'
FROM public.cambridge_units u
JOIN public.cambridge_subjects cs ON cs.id = u.cambridge_subject_id
JOIN public.cambridge_stages st ON st.id = cs.stage_id
WHERE st.stage_name = 'Stage 6' AND cs.subject_name = 'Science' AND u.unit_number = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.cambridge_topics tp WHERE tp.unit_id = u.id AND tp.topic_title = 'Puberty'
  );

