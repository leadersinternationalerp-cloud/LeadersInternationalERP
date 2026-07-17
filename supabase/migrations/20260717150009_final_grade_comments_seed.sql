-- Final Grade Comments Seed Migration - 2026-07-17
-- Creates and populates public.subject_grade_comments with >=65 unique comments per subject and grade.

-- 1. Ensure the table exists with correct schema
CREATE TABLE IF NOT EXISTS public.subject_grade_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade text NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS and setup policies idempotently
ALTER TABLE public.subject_grade_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on grade comments" ON public.subject_grade_comments;
CREATE POLICY "Allow authenticated read on grade comments" 
  ON public.subject_grade_comments FOR SELECT TO authenticated USING (true);

-- 3. Drop/recreate unique constraint to prevent duplicates during seeding
ALTER TABLE public.subject_grade_comments DROP CONSTRAINT IF EXISTS subject_grade_comments_unique_comment;
ALTER TABLE public.subject_grade_comments ADD CONSTRAINT subject_grade_comments_unique_comment UNIQUE (subject_id, grade, comment);

-- 4. Delete existing comments to start fresh (idempotent)
DELETE FROM public.subject_grade_comments;

-- 5. Seed comments dynamically using a PL/pgSQL block
DO $$
DECLARE
  sub_rec RECORD;
  g TEXT;
  grades TEXT[] := ARRAY['A*', 'A', 'B', 'C', 'D', 'E', 'F'];
  
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
    'Requires significant support to grasp core concepts.',
    'Struggles to complete classroom assignments independently.',
    'Needs to demonstrate more effort and focus in class.',
    'Must work on improving accuracy and attention to detail.',
    'Needs to approach tasks with a more positive attitude.',
    'Struggles with basic comprehension in standard topics.',
    'Rarely participates in class activities and discussions.',
    'Needs to build fundamental skills from the ground up.',
    'Struggles with confidence when tackling core tasks.'
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
    'Focus on daily review and practice is highly recommended.',
    'Seek extra help to clarify misunderstandings.',
    'Ensure all homework and tasks are completed on time.',
    'Needs to pay closer attention to instructions.',
    'Consistent attendance and participation are crucial.',
    'A structured study plan would benefit progress.',
    'Must ask questions when confused about topics.',
    'Dedicating more time to study is essential.',
    'Focus on the basics to build a stronger foundation.'
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
        
      ELSE -- F (Needs Improvement)
        cur_starters := starters_t4;
        cur_ends := ends_t4;
        
        CASE sub_rec.name
          WHEN 'Art & Craft' THEN
            middles := ARRAY[
              'Struggles with visual investigations and creative expression.',
              'Requires assistance in media control and understanding artistic processes.',
              'Needs to take more creative risks and improve aesthetic awareness.',
              'Struggles with refining visual concepts and basic techniques.',
              'Needs to experiment more with different forms and materials.',
              'Finds it difficult to translate ideas into visual formats.',
              'Struggles with controlling textures and shapes in projects.',
              'Needs close supervision when handling tools and media.',
              'Shows minimal visual exploration in creative assignments.'
            ];
          WHEN 'Computing' THEN
            middles := ARRAY[
              'Struggles with computational thinking and basic algorithm design.',
              'Has difficulty with logic and debugging code structures.',
              'Requires step-by-step assistance to solve technological problems.',
              'Struggles to write readable code and follow logic pathways.',
              'Needs help applying basic programming concepts to assignments.',
              'Struggles to understand simple system designs and logic rules.',
              'Requires remedial work on code syntax and structures.',
              'Finds it difficult to debug even simple programming errors.',
              'Struggles to break down processes into computational steps.'
            ];
          WHEN 'Digital Literacy' THEN
            middles := ARRAY[
              'Struggles to understand online safety and digital citizenship.',
              'Has difficulty evaluating media sources and performing searches.',
              'Struggles to use collaborative digital tools in class.',
              'Needs to learn responsible use of technology and digital etiquette.',
              'Struggles to find and organize information from online platforms.',
              'Has difficulty creating digital artifacts using media tools.',
              'Requires close guidance to navigate digital platforms safely.',
              'Needs to build basic skills to locate online resources.',
              'Must focus on learning positive and safe online habits.'
            ];
          WHEN 'English Language' THEN
            middles := ARRAY[
              'Struggles with basic literary analysis and grammatical precision.',
              'Has difficulty using rhetorical strategies to support writing.',
              'Requires support to expand vocabulary in reading and writing.',
              'Struggles to support arguments with textual evidence.',
              'Needs to work on reading fluency and comprehension of simple texts.',
              'Finds it difficult to maintain a coherent writing style.',
              'Struggles with basic sentence structure and spelling rules.',
              'Needs to work on organizing ideas into paragraphs.',
              'Struggles to express clear thoughts in writing.'
            ];
          WHEN 'Global Perspectives' THEN
            middles := ARRAY[
              'Struggles with basic research skills and comparing perspectives.',
              'Has difficulty analyzing global issues and forming arguments.',
              'Struggles to engage in collaborative inquiry tasks with peers.',
              'Needs to evaluate viewpoints with greater objectivity.',
              'Struggles to synthesize evidence and draw conclusions.',
              'Finds it difficult to propose solutions to local issues.',
              'Struggles to link local and global topics logically.',
              'Needs support to reflect on personal assumptions.',
              'Must work on participating constructively in group work.'
            ];
          WHEN 'Mathematics' THEN
            middles := ARRAY[
              'Struggles with mathematical reasoning and problem-solving.',
              'Makes frequent calculation errors and lacks numerical fluency.',
              'Has difficulty with algebraic thinking and geometric tasks.',
              'Struggles to follow step-by-step solutions for equations.',
              'Finds it difficult to analyze quantitative problems.',
              'Needs to work on presenting workings clearly and neatly.',
              'Struggles to apply standard formulas and math rules.',
              'Requires extra practice in preparation for timed quizzes.',
              'Struggles to connect algebraic and geometric tools.'
            ];
          WHEN 'Music' THEN
            middles := ARRAY[
              'Struggles with musicality and maintaining rhythmic precision.',
              'Has difficulty understanding harmony and melodic structure.',
              'Struggles to control instruments and express performance dynamics.',
              'Requires support to read and write musical notation.',
              'Finds it difficult to perform solo or in ensemble pieces.',
              'Needs to improve pitch accuracy and tempo maintenance.',
              'Struggles to play simple patterns during improvisation.',
              'Has difficulty following dynamic signs and conductor cues.',
              'Struggles to synchronize with peers during rehearsals.'
            ];
          WHEN 'Science' THEN
            middles := ARRAY[
              'Struggles with basic scientific investigations and lab work.',
              'Has difficulty formulating hypotheses and recording data.',
              'Struggles to apply scientific concepts to explain events.',
              'Lacks accuracy in measurements and handling lab tools.',
              'Struggles to identify simple experimental sources of error.',
              'Needs help communicating results with charts or terms.',
              'Struggles to draw simple conclusions from observations.',
              'Needs to review basic biology, chemistry, and physics topics.',
              'Must pay closer attention to lab safety rules and records.'
            ];
        END CASE;
      END IF;

      -- Generate exactly 70 unique comments per subject and grade
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

-- 6. Verification Notice
DO $$
DECLARE
  comments_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO comments_count FROM public.subject_grade_comments;
  RAISE NOTICE 'SUCCESSFULLY SEEDED % GRADE COMMENTS IN DATABASE!', comments_count;
END $$;
