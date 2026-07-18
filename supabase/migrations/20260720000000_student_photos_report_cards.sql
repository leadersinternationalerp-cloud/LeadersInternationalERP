-- Migration: Student Photos and Report Cards Enhancement
-- Date: 2026-07-20

-- 1. Alter Students Table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS admission_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS parent_contact TEXT;

-- 2. Alter Report Cards Table
ALTER TABLE public.report_cards 
ADD COLUMN IF NOT EXISTS class_teacher_comment TEXT,
ADD COLUMN IF NOT EXISTS conduct_grade TEXT,
ADD COLUMN IF NOT EXISTS attendance_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS total_present INT,
ADD COLUMN IF NOT EXISTS total_sessions INT;

-- 3. Setup Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('student-photos', 'student-photos', true),
  ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS and Setup Policies on Storage Objects for student-photos
DROP POLICY IF EXISTS "Public read access on student-photos" ON storage.objects;
CREATE POLICY "Public read access on student-photos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Authenticated write access on student-photos" ON storage.objects;
CREATE POLICY "Authenticated write access on student-photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Authenticated update access on student-photos" ON storage.objects;
CREATE POLICY "Authenticated update access on student-photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'student-photos') WITH CHECK (bucket_id = 'student-photos');

DROP POLICY IF EXISTS "Authenticated delete access on student-photos" ON storage.objects;
CREATE POLICY "Authenticated delete access on student-photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'student-photos');

-- 5. Enable RLS and Setup Policies on Storage Objects for logos
DROP POLICY IF EXISTS "Public read access on logos" ON storage.objects;
CREATE POLICY "Public read access on logos" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated write access on logos" ON storage.objects;
CREATE POLICY "Authenticated write access on logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated update access on logos" ON storage.objects;
CREATE POLICY "Authenticated update access on logos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'logos') WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated delete access on logos" ON storage.objects;
CREATE POLICY "Authenticated delete access on logos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'logos');

-- 6. Principal Comments Seeding
CREATE TABLE IF NOT EXISTS public.principal_grade_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on public.principal_grade_comments
ALTER TABLE public.principal_grade_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on principal comments" ON public.principal_grade_comments;
CREATE POLICY "Allow authenticated read on principal comments" 
  ON public.principal_grade_comments FOR SELECT TO authenticated USING (true);

-- Clear existing comments to prevent duplicates
DELETE FROM public.principal_grade_comments;

-- Seed 20 unique comments per grade
INSERT INTO public.principal_grade_comments (grade, comment) VALUES
  ('A*', 'Exceptional academic performance! Keep maintaining this exemplary standard.'),
  ('A*', 'Outstanding results! Your dedication and focus are truly commendable.'),
  ('A*', 'An exemplary term. Your commitment to excellence is highly praised.'),
  ('A*', 'Brilliant performance! You continue to show outstanding potential.'),
  ('A*', 'Superb achievements! Your hard work is reflected in these stellar results.'),
  ('A*', 'Exemplary attitude and outstanding work ethic. Well done!'),
  ('A*', 'A magnificent effort! Your academic performance is top-tier.'),
  ('A*', 'Outstanding dedication. Keep shining and aiming high.'),
  ('A*', 'Stellar academic performance. You set a wonderful standard for others.'),
  ('A*', 'A highly successful term. Your performance is absolutely commendable.'),
  ('A*', 'Incredible results! Keep up the marvelous work.'),
  ('A*', 'You have demonstrated exceptional understanding and mastery of all subjects.'),
  ('A*', 'Superb results! You should be very proud of your academic achievements.'),
  ('A*', 'An excellent display of intellect and diligence. Outstanding!'),
  ('A*', 'Your performance is exemplary. Continue to challenge yourself.'),
  ('A*', 'Stunning performance! Your academic focus is incredibly strong.'),
  ('A*', 'A remarkable academic record this term. Keep up the high standard.'),
  ('A*', 'Outstanding comprehension and dedication. You have excelled.'),
  ('A*', 'Fabulous results! Your commitment to learning is outstanding.'),
  ('A*', 'Exemplary work across the board. You are a true role model.'),

  ('A', 'Excellent performance this term. Your consistency is impressive.'),
  ('A', 'A very strong academic showing. Well done on your hard work.'),
  ('A', 'Great progress and strong results. Continue to strive for excellence.'),
  ('A', 'Highly commendable effort. You have shown great dedication to your studies.'),
  ('A', 'An impressive set of results. Keep up the good work.'),
  ('A', 'Very good comprehension and participation. Well deserved success!'),
  ('A', 'You have performed very well. Maintain this focus next term.'),
  ('A', 'Strong academic capability. Keep up the diligent work.'),
  ('A', 'An excellent term. Your commitment has yielded great progress.'),
  ('A', 'Very good results. You are capable of maintaining this high standard.'),
  ('A', 'Great work! You have shown a deep interest in learning.'),
  ('A', 'A solid academic achievement. Keep setting high goals.'),
  ('A', 'Strong analytical skills and great dedication. Well done!'),
  ('A', 'A highly successful term. Continue working with this determination.'),
  ('A', 'You have made excellent progress. Continue to push your limits.'),
  ('A', 'Great performance. Your positive attitude towards learning is commendable.'),
  ('A', 'A very good standard of work. Keep up the momentum.'),
  ('A', 'Solid results across all subjects. Well done on your effort.'),
  ('A', 'Excellent engagement and results. Keep striving for the top.'),
  ('A', 'You have demonstrated great aptitude and capability. Commendable!'),

  ('B', 'A good academic performance. Keep working hard to reach the top.'),
  ('B', 'Very satisfactory results. With a bit more effort, you can achieve A grades.'),
  ('B', 'Good progress this term. Maintain this momentum.'),
  ('B', 'You have shown good capability and understanding. Well done.'),
  ('B', 'A solid term of work. Keep aiming for higher results.'),
  ('B', 'Good effort and consistency. Continue to participate actively.'),
  ('B', 'Very good progress. Focus on refining details next term.'),
  ('B', 'A successful term. You have shown reliable dedication.'),
  ('B', 'Good results. You are capable of even higher performance with extra focus.'),
  ('B', 'Well done on your steady academic growth. Keep pushing.'),
  ('B', 'Satisfactory standard of work. Keep building on this foundation.'),
  ('B', 'Good understanding shown. Continue to review key concepts regularly.'),
  ('B', 'You have had a productive term. Well done on your results.'),
  ('B', 'A solid performance. Work on improving detail in assignments.'),
  ('B', 'Good comprehension and active participation. Keep it up.'),
  ('B', 'Good progress made this term. Maintain a structured study routine.'),
  ('B', 'A very respectable performance. Strive for higher accuracy.'),
  ('B', 'You have shown steady commitment. Continue to challenge yourself.'),
  ('B', 'Good results. Your dedication will pay off in future terms.'),
  ('B', 'Well done! You have shown positive growth in your understanding.'),

  ('C', 'A satisfactory performance. Focus on active review to boost grades.'),
  ('C', 'You have achieved a fair standard. Regular revision is recommended.'),
  ('C', 'Satisfactory progress this term. Strive for more consistency.'),
  ('C', 'A fair term of work. Dedicate more time to practicing core concepts.'),
  ('C', 'You have shown basic understanding. Work on reinforcing your skills.'),
  ('C', 'Satisfactory results. Increased class participation will help you.'),
  ('C', 'Fair effort shown. Aim to review lessons daily for better retention.'),
  ('C', 'You are making steady progress. Work on being more thorough.'),
  ('C', 'A reasonable standard. Regular completion of homework will assist growth.'),
  ('C', 'Satisfactory standard. With extra focus, you can achieve higher.'),
  ('C', 'You have met the basic requirements. Strive for higher quality work.'),
  ('C', 'Fair comprehension. Regular study will build stronger confidence.'),
  ('C', 'A productive term. Continue working on your weak areas.'),
  ('C', 'Satisfactory outcomes. Put in more effort to reach your full potential.'),
  ('C', 'You have shown steady performance. Focus on class discussions.'),
  ('C', 'A fair result. Make sure to seek help whenever confused.'),
  ('C', 'Satisfactory results. Keep practicing and reviewing assignments.'),
  ('C', 'You have done reasonably well. Push yourself harder next term.'),
  ('C', 'Good base level. Build on this with focused revision.'),
  ('C', 'Fair academic standard. Aim for greater accuracy in your work.'),

  ('D', 'You are making progress but need to focus more on core areas.'),
  ('D', 'Requires more diligence and structured revision to improve.'),
  ('D', 'A fair standard, but closer attention to assignments is needed.'),
  ('D', 'You need to show more focus and effort in your daily studies.'),
  ('D', 'With structured practice, you can improve your understanding.'),
  ('D', 'Needs to participate more actively and seek guidance early.'),
  ('D', 'A dedicated effort is required to strengthen your academic foundation.'),
  ('D', 'Focus on regular review of key topics to gain confidence.'),
  ('D', 'You must dedicate more time to independent study and homework.'),
  ('D', 'Needs to work on accuracy and follow classroom instructions closely.'),
  ('D', 'Basic progress made, but more consistent work is necessary.'),
  ('D', 'You are capable of better results with a more positive attitude.'),
  ('D', 'Strive to complete all assignments on time to avoid falling behind.'),
  ('D', 'Requires regular practice in weak subjects to boost performance.'),
  ('D', 'You have shown potential; focus and self-discipline will help you.'),
  ('D', 'Aim to revise classwork daily to improve your grades.'),
  ('D', 'More active engagement during lessons is highly recommended.'),
  ('D', 'With focused attention, you can make significant progress.'),
  ('D', 'You must review core materials regularly to build confidence.'),
  ('D', 'A more serious approach to studies is needed next term.'),

  ('E', 'Requires substantial effort and closer attention to improve grades.'),
  ('E', 'Needs to establish a structured study routine to grasp basic concepts.'),
  ('E', 'Active revision and regular practice are crucial for your progress.'),
  ('E', 'You must seek extra help and participate more in class.'),
  ('E', 'Close attention to classroom instructions will benefit your learning.'),
  ('E', 'You need to focus on building fundamental skills step-by-step.'),
  ('E', 'Consistent completion of homework is necessary for understanding.'),
  ('E', 'Requires daily review of key lessons to overcome difficulties.'),
  ('E', 'You must show greater commitment and seriousness in class.'),
  ('E', 'Needs to work on concentration and ask questions when confused.'),
  ('E', 'A more focused effort is essential to strengthen your skills.'),
  ('E', 'You need to dedicate regular time to revision and practice.'),
  ('E', 'Seek clarification on difficult topics early to avoid gaps.'),
  ('E', 'With determination and hard work, you can improve your standard.'),
  ('E', 'Requires a more proactive attitude towards your studies.'),
  ('E', 'You must make regular study a priority next term.'),
  ('E', 'More focus on core subjects is needed to progress.'),
  ('E', 'Active participation in class discussions will help you.'),
  ('E', 'With guided support, you can make valuable progress.'),
  ('E', 'A significant turnaround in effort is needed to achieve success.'),

  ('F', 'Significant support is needed to build basic understanding.'),
  ('F', 'Must establish a structured study routine immediately.'),
  ('F', 'Daily practice and regular revision are critical for improvement.'),
  ('F', 'You must show a much higher level of focus and engagement.'),
  ('F', 'Requires persistent effort and extra tutoring in key subjects.'),
  ('F', 'You need to complete and submit all classroom tasks on time.'),
  ('F', 'A serious commitment to learning is required to make progress.'),
  ('F', 'Must work on concentration and follow instructions closely.'),
  ('F', 'Seeking help early is essential to resolve key misunderstandings.'),
  ('F', 'A major improvement in attendance and attitude is required.'),
  ('F', 'You need to focus on learning fundamental skills from the start.'),
  ('F', 'Requires focused attention and hard work in all subjects.'),
  ('F', 'You must review basic concepts regularly to build confidence.'),
  ('F', 'A structured approach to study is crucial for your success.'),
  ('F', 'You are encouraged to put in far more effort next term.'),
  ('F', 'Close cooperation with teachers will help guide your progress.'),
  ('F', 'Requires dedication and continuous revision to move forward.'),
  ('F', 'A significant shift in focus and attitude is highly necessary.'),
  ('F', 'You must work diligently to build a firmer foundation.'),
  ('F', 'With focused support and hard work, you can improve.'),

  ('G', 'Urgent attention and substantial effort are required to improve.'),
  ('G', 'Must focus on basic concepts and build skills from the ground up.'),
  ('G', 'Regular attendance and active study are critical to progress.'),
  ('G', 'You need to seek intensive support to grasp fundamental topics.'),
  ('G', 'A serious shift in academic focus and attitude is essential.'),
  ('G', 'Must complete core tasks and participate actively in class.'),
  ('G', 'Daily practice and guided review are highly necessary.'),
  ('G', 'Requires a major increase in commitment and focus.'),
  ('G', 'You must establish a structured revision plan immediately.'),
  ('G', 'Seeking clarification on basic topics is vital to your growth.'),
  ('G', 'You are capable of growth, but it requires diligent work.'),
  ('G', 'Must cooperate closely with academic support programs.'),
  ('G', 'Concentration and hard work must be prioritized next term.'),
  ('G', 'A significant change in study habits is urgently needed.'),
  ('G', 'You need to build confidence by practicing basic exercises.'),
  ('G', 'Regular submission of homework is crucial for your progress.'),
  ('G', 'Requires persistent effort and structured study schedules.'),
  ('G', 'You must make your academic progress a top priority.'),
  ('G', 'A focused turnaround in attitude is necessary to succeed.'),
  ('G', 'With guided help and strong determination, improvement is possible.');
