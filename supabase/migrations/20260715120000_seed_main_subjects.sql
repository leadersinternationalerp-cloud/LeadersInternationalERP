-- 1. Insert the 8 main subjects that should be in the system entirely
-- We use a DO NOTHING conflict handling just in case, but subjects may not have a unique constraint on name.
INSERT INTO public.subjects (name, created_at, updated_at)
VALUES 
    ('Art & Craft', NOW(), NOW()),
    ('Computing', NOW(), NOW()),
    ('Digital Literacy', NOW(), NOW()),
    ('English Language', NOW(), NOW()),
    ('Global Perspectives', NOW(), NOW()),
    ('Mathematics', NOW(), NOW()),
    ('Music', NOW(), NOW()),
    ('Science', NOW(), NOW());

-- 2. Clean up any other old subjects (like 'Kiswahili' or dummy data)
-- Only delete if they are NOT in the approved list. 
-- NOTE: If existing classes/activities reference these old subjects, this deletion will CASCADE or fail depending on the foreign key constraints set on those tables.
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
