-- Seed Migration: Cambridge Grades A* to G - 2026-07-17
-- Re-seeds subject_grade_comments with A* to G comments (70 unique comments per subject per grade, total 4,480 comments).

-- 1. Setup unique constraint
ALTER TABLE public.subject_grade_comments DROP CONSTRAINT IF EXISTS subject_grade_comments_unique_comment;
ALTER TABLE public.subject_grade_comments ADD CONSTRAINT subject_grade_comments_unique_comment UNIQUE (subject_id, grade, comment);

-- 2. Clear old comments to prevent overlaps
DELETE FROM public.subject_grade_comments;

-- 3. Seed comments dynamically using PL/pgSQL
DO $$
DECLARE
  sub_rec RECORD;
  g TEXT;
  grades TEXT[] := ARRAY['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
  
  -- Starters
  starters_t1 TEXT[] := ARRAY[
    'Exhibits exceptional mastery and insight.',
    'Demonstrates outstanding analytical capability.',
    'Consistently performs at an exemplary level.',
    'Shows a profound understanding of core concepts.',
    'Approaches advanced challenges with confidence.',
    'Displays highly developed problem-solving skills.',
    'Produces work of an exceptionally high standard.',
    'Exerts commendable effort and focus on tasks.',
    'Maintains a brilliant track record of engagement.'
  ];
  
  starters_t2 TEXT[] := ARRAY[
    'Demonstrates a solid understanding of the concepts.',
    'Consistently produces high-quality work.',
    'Shows good progress in learning core skills.',
    'Approaches assignments with a positive attitude.',
    'Maintains a steady level of performance.',
    'Displays good comprehension and analytical skills.',
    'Contributes actively during classroom lessons.',
    'Exhibits reliable effort in all assignments.',
    'Shows a strong interest in academic growth.'
  ];

  starters_t3 TEXT[] := ARRAY[
    'Is developing a basic understanding of core concepts.',
    'Shows progress in completing assigned tasks.',
    'Demonstrates satisfactory effort in classroom activities.',
    'Is working on improving accuracy and detail.',
    'Attempts tasks with a positive and willing attitude.',
    'Displays basic comprehension in standard topics.',
    'Participates when prompted in class discussions.',
    'Shows gradual growth in fundamental skills.',
    'Is building confidence in handling core assignments.'
  ];

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

  -- Ends
  ends_t1 TEXT[] := ARRAY[
    'Shows great potential for future success.',
    'Sets a wonderful example for peers.',
    'Keep up the excellent work!',
    'Exemplary attitude and focus.',
    'Highly commendable performance throughout.',
    'Continues to impress with high dedication.',
    'An outstanding academic performance.',
    'Demonstrates superb dedication to learning.',
    'Shows a real passion for the discipline.'
  ];

  ends_t2 TEXT[] := ARRAY[
    'Keep working hard to build on this success.',
    'A very good performance this term.',
    'Shows great promise for the future.',
    'Well done on your steady effort.',
    'Keep up the good progress.',
    'A solid contribution to class activities.',
    'Demonstrates a focused approach to tasks.',
    'Proud of the diligence shown here.',
    'An encouraging outcome for the term.'
  ];

  ends_t3 TEXT[] := ARRAY[
    'Focus on consistent effort to make further progress.',
    'With continued practice, performance will improve.',
    'Aim for greater precision in upcoming tasks.',
    'Good effort; strive for more consistency.',
    'Keep up the work to strengthen these skills.',
    'Encouraged to seek help when tackling new material.',
    'Reviewing core notes regularly will build confidence.',
    'Focus on detail to reach the next level.',
    'Steady progress is being made; keep trying.'
  ];

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

  -- Middles
  middles TEXT[];
  cur_starters TEXT[];
  cur_ends TEXT[];
  
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
    -- Iterate over each grade
    FOREACH g IN ARRAY grades LOOP
      -- Determine tiers and fetch appropriate arrays
      IF g IN ('A*', 'A') THEN
        cur_starters := starters_t1;
        cur_ends := ends_t1;
        
        CASE sub_rec.name
          WHEN 'Art & Craft' THEN
            middles := ARRAY[
              'Integrates sophisticated visual investigations and shows stunning creative expression.',
              'Shows exemplary control over media and explores diverse artistic processes.',
              'Takes bold creative risks while maintaining high aesthetic awareness.',
              'Refines visual concepts with meticulous attention to detail and technique.',
              'Exhibits a highly creative approach to experimenting with forms and materials.',
              'Translates complex ideas into compelling visual statements effortlessly.',
              'Applies innovative textures and shapes to enhance aesthetic value.',
              'Displays refined control when manipulating tools and mixed media.',
              'Develops original concepts through thorough visual exploration.'
            ];
          WHEN 'Computing' THEN
            middles := ARRAY[
              'Displays brilliant computational thinking and designs highly efficient algorithms.',
              'Demonstrates systematic logic in debugging and structuring programs.',
              'Solves complex technological problems with structured and clean solutions.',
              'Writes highly readable code and models logic pathways effectively.',
              'Applies core programming principles to build robust digital solutions.',
              'Shows advanced capability in system design and database relationships.',
              'Exhibits clear logic and structural integrity in code development.',
              'Resolves coding anomalies quickly through methodical debugging.',
              'Deconstructs complex processes into elegant computational steps.'
            ];
          WHEN 'Digital Literacy' THEN
            middles := ARRAY[
              'Demonstrates a sophisticated understanding of online safety and digital citizenship.',
              'Evaluates media sources critically and performs high-level information searches.',
              'Leverages collaborative digital tools to produce high-quality collaborative output.',
              'Uses technology responsibly and models exemplary digital etiquette.',
              'Synthesizes information from diverse online platforms with great accuracy.',
              'Creates highly polished digital artifacts showcasing strong media skills.',
              'Navigates complex digital platforms safely and with high proficiency.',
              'Applies advanced techniques to filter and organize online resources.',
              'Promotes positive online discourse and safe internet practices.'
            ];
          WHEN 'English Language' THEN
            middles := ARRAY[
              'Formulates sophisticated literary analysis and writes with high grammatical precision.',
              'Employs diverse rhetorical strategies to enrich narrative structure.',
              'Exhibits a wide and sophisticated vocabulary in written and verbal expression.',
              'Constructs compelling arguments with excellent textual evidence support.',
              'Demonstrates exceptional fluency and deep comprehension of complex texts.',
              'Maintains a highly engaging style in both creative and formal writing.',
              'Analyzes linguistic nuances and stylistic choices with great depth.',
              'Structures written arguments with flawless coherence and flow.',
              'Expresses nuanced perspectives with clarity and stylistic flair.'
            ];
          WHEN 'Global Perspectives' THEN
            middles := ARRAY[
              'Applies rigorous research methodology and evaluates multiple perspectives critically.',
              'Analyzes complex global issues with deep insight and evidence-based arguments.',
              'Demonstrates exceptional leadership and engagement in collaborative inquiry.',
              'Deconstructs diverse viewpoints with objectivity and high intellectual maturity.',
              'Synthesizes varied sources of evidence to formulate strong conclusions.',
              'Proposes creative and realistic solutions to contemporary challenges.',
              'Explores local-global connections with impressive analytical depth.',
              'Reflects critically on personal assumptions and cultural viewpoints.',
              'Engages in peer discussions with respect, empathy, and clarity.'
            ];
          WHEN 'Mathematics' THEN
            middles := ARRAY[
              'Displays exceptional mathematical reasoning and problem-solving logic.',
              'Maintains outstanding numerical fluency and precision in calculation.',
              'Applies algebraic thinking and geometric analysis to complex problems.',
              'Formulates clear step-by-step proofs and models equations accurately.',
              'Deconstructs abstract mathematical problems with ease and speed.',
              'Presents neat, logical, and structured mathematical solutions.',
              'Discovers elegant methods to solve non-routine quantitative challenges.',
              'Demonstrates superb accuracy under pressure and in advanced topics.',
              'Connects distinct mathematical areas to solve multi-step problems.'
            ];
          WHEN 'Music' THEN
            middles := ARRAY[
              'Exhibits exceptional musicality and flawless rhythmic precision.',
              'Demonstrates advanced harmonic understanding and melodic composition.',
              'Maintains outstanding instrumental control and performance expression.',
              'Analyzes musical structures and historical genres with deep insight.',
              'Performs solo and ensemble pieces with stunning artistic interpretation.',
              'Shows excellent pitch accuracy and expressive dynamics in performance.',
              'Improvises creatively using a rich vocabulary of scales and modes.',
              'Reads and writes complex musical notation with high fluency.',
              'Collaborates harmoniously, blending tone and volume perfectly.'
            ];
          WHEN 'Science' THEN
            middles := ARRAY[
              'Designs rigorous scientific investigations and interprets data accurately.',
              'Formulates clear hypotheses and shows high experimental precision.',
              'Applies scientific theories to interpret complex natural phenomena.',
              'Exhibits commendable accuracy in measurements and lab procedures.',
              'Evaluates experimental sources of error with impressive criticality.',
              'Communicates scientific findings with precise terminology and charts.',
              'Synthesizes observations to draw logical, evidence-based conclusions.',
              'Shows advanced understanding of biological, chemical, and physical laws.',
              'Maintains an exemplary safety record and methodical lab notes.'
            ];
        END CASE;
        
      ELSIF g IN ('B', 'C') THEN
        cur_starters := starters_t2;
        cur_ends := ends_t2;
        
        CASE sub_rec.name
          WHEN 'Art & Craft' THEN
            middles := ARRAY[
              'Applies visual investigations and shows good creative expression.',
              'Demonstrates good control over media and participates in artistic processes.',
              'Takes some creative risks while keeping aesthetic awareness in mind.',
              'Refines visual concepts with steady attention to technique.',
              'Exhibits a solid approach to experimenting with forms and materials.',
              'Translates ideas into visual formats with growing confidence.',
              'Uses textures and shapes well to enhance aesthetic properties.',
              'Displays good control when handling tools and basic media.',
              'Develops clear concepts through active visual exploration.'
            ];
          WHEN 'Computing' THEN
            middles := ARRAY[
              'Displays competent computational thinking and designs working algorithms.',
              'Demonstrates structured logic in debugging and building code.',
              'Solves technological problems with logical and organized solutions.',
              'Writes clear code and understands basic logic pathways.',
              'Applies core programming concepts to construct functional digital solutions.',
              'Shows good capability in basic system design and logic rules.',
              'Exhibits clear logic and good structure in code writing.',
              'Resolves coding errors systematically with some assistance.',
              'Deconstructs processes into functional computational steps.'
            ];
          WHEN 'Digital Literacy' THEN
            middles := ARRAY[
              'Demonstrates a good understanding of online safety and digital citizenship.',
              'Evaluates media sources and performs reliable information searches.',
              'Uses collaborative digital tools to produce good collaborative output.',
              'Uses technology responsibly and observes good digital etiquette.',
              'Synthesizes information from online platforms with good accuracy.',
              'Creates neat digital artifacts showcasing solid media skills.',
              'Navigates digital platforms safely and with good proficiency.',
              'Applies appropriate techniques to find and organize online resources.',
              'Practices positive online behavior and safe internet habits.'
            ];
          WHEN 'English Language' THEN
            middles := ARRAY[
              'Formulates clear literary analysis and writes with good grammatical precision.',
              'Employs varied rhetorical strategies to support narrative structure.',
              'Exhibits a good range of vocabulary in written and verbal tasks.',
              'Constructs structured arguments supported by text evidence.',
              'Demonstrates good fluency and comprehension of diverse texts.',
              'Maintains a clear and readable style in creative and formal tasks.',
              'Analyzes linguistic patterns and stylistic devices with good clarity.',
              'Structures written paragraphs with logical coherence and flow.',
              'Expresses clear ideas with good vocabulary and structure.'
            ];
          WHEN 'Global Perspectives' THEN
            middles := ARRAY[
              'Applies sound research methodology and evaluates perspectives clearly.',
              'Analyzes global issues with good insight and structured arguments.',
              'Demonstrates good engagement in collaborative inquiry tasks.',
              'Deconstructs viewpoints with objectivity and constructive thinking.',
              'Synthesizes multiple sources of evidence to formulate conclusions.',
              'Proposes practical and sensible solutions to local challenges.',
              'Explores local-global connections with good analytical reasoning.',
              'Reflects on personal assumptions and other cultural points of view.',
              'Participates in peer discussions with respect and clarity.'
            ];
          WHEN 'Mathematics' THEN
            middles := ARRAY[
              'Displays good mathematical reasoning and problem-solving logic.',
              'Maintains good numerical fluency and precision in calculations.',
              'Applies algebraic thinking and geometric analysis to problems.',
              'Formulates step-by-step solutions and works out equations correctly.',
              'Deconstructs mathematical problems with steady concentration.',
              'Presents neat and well-structured mathematical workings.',
              'Utilizes appropriate methods to solve standard quantitative challenges.',
              'Demonstrates good accuracy on assignments and timed assessments.',
              'Connects algebraic and geometric tools to solve multi-step problems.'
            ];
          WHEN 'Music' THEN
            middles := ARRAY[
              'Exhibits good musicality and steady rhythmic precision.',
              'Demonstrates good harmonic understanding and melodic structure.',
              'Maintains good instrumental control and performance expression.',
              'Reads and understands musical notation with growing confidence.',
              'Performs solo and ensemble pieces with appropriate interpretation.',
              'Shows good pitch accuracy and appropriate dynamics in performance.',
              'Improvises with some confidence using basic musical patterns.',
              'Follows tempos and expressive signs with reliable precision.',
              'Collaborates well with peers, balancing volume and tone.'
            ];
          WHEN 'Science' THEN
            middles := ARRAY[
              'Designs simple scientific investigations and interprets data correctly.',
              'Formulates working hypotheses and shows good experimental accuracy.',
              'Applies scientific theories to explain natural phenomena clearly.',
              'Exhibits good accuracy in measurements and basic lab procedures.',
              'Identifies experimental sources of error with sound reasoning.',
              'Communicates scientific results with clear terminology and charts.',
              'Draws logical, evidence-based conclusions from observations.',
              'Shows good understanding of main biological and physical concepts.',
              'Maintains safety rules and keeps organized experiment records.'
            ];
        END CASE;
        
      ELSIF g IN ('D', 'E') THEN
        cur_starters := starters_t3;
        cur_ends := ends_t3;
        
        CASE sub_rec.name
          WHEN 'Art & Craft' THEN
            middles := ARRAY[
              'Practices visual investigations and works on creative expression.',
              'Needs guidance on media control but shows interest in artistic processes.',
              'Is learning to take creative risks while improving aesthetic awareness.',
              'Works on refining visual concepts with growing attention to technique.',
              'Is exploring different ways to experiment with forms and materials.',
              'Attempts to translate ideas into visual formats with support.',
              'Is developing control of textures and shapes in project work.',
              'Is learning to handle tools and media with greater care.',
              'Shows some visual exploration when developing creative work.'
            ];
          WHEN 'Computing' THEN
            middles := ARRAY[
              'Is developing computational thinking and attempts basic algorithm design.',
              'Works on logic when debugging and structuring programs.',
              'Attempts to solve technological problems with structured assistance.',
              'Learns to write clear code and follow simple logic pathways.',
              'Applies basic programming concepts to complete digital assignments.',
              'Is building capability in understanding system design and rules.',
              'Works on code structure and basic syntax rules.',
              'Is learning to debug simple programming errors with guidance.',
              'Is learning to break down processes into smaller steps.'
            ];
          WHEN 'Digital Literacy' THEN
            middles := ARRAY[
              'Is developing a basic understanding of online safety and digital citizenship.',
              'Learns to evaluate media sources and perform basic web searches.',
              'Attempts to use collaborative digital tools in class activities.',
              'Is learning to use technology responsibly and follow digital etiquette.',
              'Works on extracting information from online platforms accurately.',
              'Attempts to create digital artifacts using media tools.',
              'Is learning to navigate digital platforms safely and step-by-step.',
              'Is building skills to find and organize online resources.',
              'Is learning to practice positive and safe online habits.'
            ];
          WHEN 'English Language' THEN
            middles := ARRAY[
              'Is developing basic literary analysis and works on grammatical precision.',
              'Is learning to use rhetorical strategies to support writing.',
              'Works on expanding vocabulary in written and verbal tasks.',
              'Attempts to support written arguments with some textual evidence.',
              'Is building reading fluency and comprehension of standard texts.',
              'Works on maintaining a clear and coherent writing style.',
              'Is developing skills to analyze basic linguistic structures.',
              'Learns to organize sentences into cohesive paragraphs.',
              'Works on expressing thoughts with clearer language.'
            ];
          WHEN 'Global Perspectives' THEN
            middles := ARRAY[
              'Is developing basic research skills and learning to compare perspectives.',
              'Analyzes simple global issues with guided support and reasoning.',
              'Participates in collaborative inquiry projects with guidance.',
              'Is learning to evaluate viewpoints with greater objectivity.',
              'Works on combining evidence to formulate simple conclusions.',
              'Proposes simple and practical solutions to local problems.',
              'Is learning to connect local and global issues logically.',
              'Reflects with support on personal assumptions and viewpoints.',
              'Is working on participating actively in group discussions.'
            ];
          WHEN 'Mathematics' THEN
            middles := ARRAY[
              'Is developing mathematical reasoning and basic problem-solving skills.',
              'Works on numerical fluency and avoiding simple calculation errors.',
              'Attempts algebraic thinking and basic geometric assignments.',
              'Follows step-by-step solutions to solve standard equations.',
              'Is learning to analyze quantitative problems systematically.',
              'Works on presenting mathematical workings clearly and neatly.',
              'Learns to apply standard methods to solve math exercises.',
              'Is building confidence in timed activities and quizzes.',
              'Attempts to use algebraic and geometric tools together.'
            ];
          WHEN 'Music' THEN
            middles := ARRAY[
              'Is developing musicality and working on rhythmic precision.',
              'Is building a basic understanding of harmony and melody.',
              'Attempts to control instruments and express dynamics during practice.',
              'Is learning to read and interpret musical notation.',
              'Participates in solo and ensemble performances with support.',
              'Works on pitch accuracy and maintaining steady tempo.',
              'Attempts simple musical patterns when improvising.',
              'Is learning to follow dynamic signs and director cues.',
              'Works on coordinating with peers during group rehearsals.'
            ];
          WHEN 'Science' THEN
            middles := ARRAY[
              'Attempts simple scientific investigations with guided support.',
              'Is learning to formulate hypotheses and record experimental observations.',
              'Works on applying basic scientific concepts to natural events.',
              'Is building accuracy in measurements and handling lab tools.',
              'Is learning to identify sources of error in lab work.',
              'Works on communicating results using basic charts and terms.',
              'Attempts to draw simple conclusions from experiment results.',
              'Is developing a basic knowledge of biology, chemistry, and physics.',
              'Is learning to maintain standard safety and lab records.'
            ];
        END CASE;
        
      ELSE -- F, G (Needs Improvement)
        cur_starters := starters_t4;
        cur_ends := ends_t4;
        
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
      END IF;

      -- Generate exactly 70 unique comments per subject and grade (8 grades total)
      FOR i IN 1..70 LOOP
        st_idx := ((i - 1) % 9) + 1;
        mid_idx := ((((i - 1) / 9)) % 9) + 1;
        end_idx := ((((i - 1) / 81)) % 9) + 1;
        
        comment_str := cur_starters[st_idx] || ' ' || middles[mid_idx] || ' ' || cur_ends[end_idx];
        
        INSERT INTO public.subject_grade_comments (subject_id, grade, comment)
        VALUES (sub_rec.id, g, comment_str)
        ON CONFLICT (subject_id, grade, comment) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 4. Verification Notice
DO $$
DECLARE
  comments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO comments_count FROM public.subject_grade_comments;
  RAISE NOTICE 'SUCCESSFULLY SEEDED % GRADE COMMENTS (A* TO G) IN DATABASE!', comments_count;
END $$;

-- 5. Seed default system_settings grading scale configuration for A* to G
INSERT INTO public.system_settings (key, value)
VALUES (
  'grading_scale',
  '[{"grade":"A*","min":90,"max":100},{"grade":"A","min":80,"max":90},{"grade":"B","min":70,"max":80},{"grade":"C","min":60,"max":70},{"grade":"D","min":50,"max":60},{"grade":"E","min":40,"max":50},{"grade":"F","min":30,"max":40},{"grade":"G","min":0,"max":30}]'::jsonb
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
