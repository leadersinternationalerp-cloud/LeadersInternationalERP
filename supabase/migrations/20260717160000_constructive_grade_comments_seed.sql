-- Constructive Grade Comments Seed Migration - 2026-07-17
-- Re-seeds F grade (Tier 4) comments to ensure they are constructive, encouraging, and growth-oriented.

-- 1. Ensure table unique constraint is active
ALTER TABLE public.subject_grade_comments DROP CONSTRAINT IF EXISTS subject_grade_comments_unique_comment;
ALTER TABLE public.subject_grade_comments ADD CONSTRAINT subject_grade_comments_unique_comment UNIQUE (subject_id, grade, comment);

-- 2. Clear old F comments to make room for constructive comments
DELETE FROM public.subject_grade_comments WHERE grade = 'F';

-- 3. Seed constructive comments dynamically
DO $$
DECLARE
  sub_rec RECORD;
  g TEXT := 'F';
  
  -- Constructive Starters for Tier 4 (F)
  starters_t4 TEXT[] := ARRAY[
    'With guided support, is working to grasp core concepts.',
    'Is encouraged to complete classroom assignments more independently.',
    'Has potential to show more active participation in classroom activities.',
    'Is focusing on improving accuracy and attention to detail.',
    'Approaches new challenges with a growing sense of determination.',
    'With focused attention, can strengthen understanding of standard topics.',
    'Is working on participating more actively in classroom discussions.',
    'Is building up fundamental skills step-by-step.',
    'Would benefit from extra encouragement to build confidence in core tasks.'
  ];

  -- Constructive Ends for Tier 4 (F)
  ends_t4 TEXT[] := ARRAY[
    'Consistent review and daily practice will build stronger skills.',
    'Asking questions when confused will help clarify misunderstandings.',
    'Submitting tasks and homework regularly will reinforce learning.',
    'Paying closer attention to classroom instructions will improve outcomes.',
    'Regular attendance and active engagement remain key to progress.',
    'Following a structured study plan will yield positive results.',
    'Seeking clarification on key concepts will boost understanding.',
    'Dedicating regular time to study will build a firmer foundation.',
    'Focusing on the core basics will support future academic growth.'
  ];

  -- Constructive Middles for Tier 4 (F)
  middles TEXT[];
  comment_str TEXT;
  st_idx INT;
  mid_idx INT;
  end_idx INT;
BEGIN
  -- Iterate over the 8 subjects
  FOR sub_rec IN 
    SELECT id, name FROM public.subjects 
    WHERE name IN (
      'Art & Craft',
      'Computing',
      'Digital Literacy',
      'English Language',
      'Global Perspectives',
      'Mathematics',
      'Music',
      'Science'
    )
  LOOP
    CASE sub_rec.name
      WHEN 'Art & Craft' THEN
        middles := ARRAY[
          'Is developing visual investigation skills and exploring creative expression.',
          'Would benefit from guidance in media control and artistic processes.',
          'Is encouraged to take creative risks and explore aesthetic awareness.',
          'Works on refining visual concepts and learning basic techniques.',
          'Is encouraged to experiment more with different forms and materials.',
          'Is working to translate ideas into visual formats with support.',
          'Is developing skills to control textures and shapes in project work.',
          'Needs guidance when handling tools and various media.',
          'Is encouraged to explore more visual ideas in creative tasks.'
        ];
      WHEN 'Computing' THEN
        middles := ARRAY[
          'Is working to develop computational thinking and basic algorithm design.',
          'Is learning to apply logic when debugging code structures.',
          'Would benefit from step-by-step guidance to solve technological problems.',
          'Is working to write clearer code and follow logic pathways.',
          'Needs guidance when applying basic programming concepts to tasks.',
          'Is working to understand basic system designs and logic rules.',
          'Benefit from reviewing code syntax and structures.',
          'Is developing debugging skills for simple programming errors.',
          'Is learning to break down processes into computational steps.'
        ];
      WHEN 'Digital Literacy' THEN
        middles := ARRAY[
          'Is learning the principles of online safety and digital citizenship.',
          'Would benefit from support in evaluating media sources and performing searches.',
          'Is encouraged to use collaborative digital tools in class tasks.',
          'Is working to use technology responsibly and follow digital etiquette.',
          'Is learning to find and organize information from online platforms.',
          'Works on creating simple digital artifacts using media tools.',
          'Needs guidance to navigate digital platforms safely.',
          'Is building basic skills to locate online resources.',
          'Focuses on developing positive and safe online habits.'
        ];
      WHEN 'English Language' THEN
        middles := ARRAY[
          'Is working on basic literary analysis and grammatical precision.',
          'Is learning to use rhetorical strategies to support writing.',
          'Would benefit from support to expand vocabulary in reading and writing.',
          'Is learning to support arguments with textual evidence.',
          'Is encouraged to work on reading fluency and comprehension of simple texts.',
          'Is working on maintaining a coherent writing style.',
          'Works on basic sentence structure and spelling rules.',
          'Is developing skills to organize ideas into paragraphs.',
          'Is working to express thoughts with clearer language in writing.'
        ];
      WHEN 'Global Perspectives' THEN
        middles := ARRAY[
          'Is developing basic research skills and learning to compare perspectives.',
          'Is working on analyzing global issues and forming arguments.',
          'Is encouraged to engage more in collaborative inquiry tasks with peers.',
          'Is learning to evaluate viewpoints with greater objectivity.',
          'Works on synthesizing evidence and drawing simple conclusions.',
          'Is developing skills to propose practical solutions to local issues.',
          'Is learning to link local and global topics logically.',
          'Benefit from guidance to reflect on personal assumptions.',
          'Is working on participating constructively in group assignments.'
        ];
      WHEN 'Mathematics' THEN
        middles := ARRAY[
          'Is working to build mathematical reasoning and problem-solving skills.',
          'Is encouraged to double-check calculations to improve numerical fluency.',
          'Is developing skills in algebraic thinking and geometric tasks.',
          'Is learning to follow step-by-step solutions for equations.',
          'Is working to analyze quantitative problems systematically.',
          'Would benefit from presenting workings more clearly and neatly.',
          'Is learning to apply standard formulas and math rules.',
          'Benefit from extra practice in preparation for timed quizzes.',
          'Is learning to connect algebraic and geometric tools.'
        ];
      WHEN 'Music' THEN
        middles := ARRAY[
          'Is developing musicality and working on rhythmic precision.',
          'Is learning to understand harmony and melodic structure.',
          'Is working on instrument control and expressing dynamics.',
          'Would benefit from support to read and write musical notation.',
          'Is working on performing solo or in ensemble pieces.',
          'Is encouraged to improve pitch accuracy and tempo maintenance.',
          'Is learning to play simple patterns during improvisation.',
          'Is learning to follow dynamic signs and director cues.',
          'Works on synchronizing with peers during rehearsals.'
        ];
      WHEN 'Science' THEN
        middles := ARRAY[
          'Is developing basic scientific investigation and lab skills.',
          'Is learning to formulate hypotheses and record data.',
          'Is working to apply scientific concepts to explain observations.',
          'Is learning to make accurate measurements and handle lab tools.',
          'Is working to identify simple experimental sources of error.',
          'Works on communicating results using simple charts and terms.',
          'Is learning to draw simple conclusions from observations.',
          'Benefit from reviewing basic biology, chemistry, and physics topics.',
          'Is learning to follow lab safety rules and records.'
        ];
    END CASE;

    -- Generate exactly 70 unique constructive comments for grade F
    FOR i IN 1..70 LOOP
      st_idx := ((i - 1) % 9) + 1;
      mid_idx := ((((i - 1) / 9)) % 9) + 1;
      end_idx := ((((i - 1) / 81)) % 9) + 1;
      
      comment_str := starters_t4[st_idx] || ' ' || middles[mid_idx] || ' ' || ends_t4[end_idx];
      
      INSERT INTO public.subject_grade_comments (subject_id, grade, comment)
      VALUES (sub_rec.id, g, comment_str)
      ON CONFLICT (subject_id, grade, comment) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 4. Verification Notice
DO $$
DECLARE
  comments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO comments_count FROM public.subject_grade_comments WHERE grade = 'F';
  RAISE NOTICE 'SUCCESSFULLY UPDATED % CONSTRUCTIVE F GRADE COMMENTS IN DATABASE!', comments_count;
END $$;
