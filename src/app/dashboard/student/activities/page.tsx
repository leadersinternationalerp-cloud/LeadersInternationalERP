import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ActivitiesClient from './ActivitiesClient';

export const revalidate = 0; // Disable static rendering

export default async function StudentActivitiesPage() {
  const supabase = await createClient();

  // 1. Verify access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, role')
    .eq('id', user.id)
    .single();
    
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []);

  const isStudent = userRoles.includes('Student') || userRoles.includes('System Admin');

  if (!isStudent) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>Only students can access this page.</p>
      </div>
    );
  }

  // 2. Fetch student class details
  const { data: student } = await supabase
    .from('students')
    .select('grade_level, section')
    .eq('id', user.id)
    .single();

  let activities: any[] = [];
  let attempts: any[] = [];

  if (student) {
    // Get class_id matching student's grade level and section
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('name', student.grade_level)
      .eq('section', student.section)
      .single();

    if (cls) {
      // Fetch published class activities for the class
      const { data: acts } = await supabase
        .from('class_activities')
        .select('*')
        .eq('class_id', cls.id)
        .order('date', { ascending: false });
      
      activities = acts || [];
    }
  }

  // 3. Fetch current student's quiz attempts
  const { data: dbAttempts } = await supabase
    .from('activity_attempts')
    .select('*')
    .eq('student_id', user.id);

  attempts = dbAttempts || [];

  // 4. Map activities to append attempt details
  const activitiesWithAttempts = activities.map((act) => {
    const attempt = attempts.find((att) => att.activity_id === act.id);
    return {
      id: act.id,
      title: act.title,
      subject: act.subject,
      date: act.date,
      description: act.description,
      activity_type: act.activity_type || 'classwork',
      questions: act.questions || [],
      time_limit_minutes: act.time_limit_minutes || 0,
      max_attempts: act.max_attempts || 1,
      is_published: act.is_published || false,
      total_questions: act.total_questions || 0,
      attempt: attempt ? {
        score: attempt.score,
        maxScore: attempt.max_score,
        percentage: attempt.percentage,
        submittedAt: attempt.submitted_at
      } : null
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
          Class Activities & Quizzes
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          View upcoming assignments and take interactive quizzes.
        </p>
      </div>

      <ActivitiesClient activities={activitiesWithAttempts} />
    </div>
  );
}
