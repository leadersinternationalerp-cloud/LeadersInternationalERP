import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ClassActivitiesClient from './ClassActivitiesClient';

export const revalidate = 0; // Disable static rendering

export default async function TeacherClassActivitiesPage() {
  const supabase = await createClient();

  // 1. Verify access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single();

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []);

  const isTeacher = userRoles.includes('Teacher') || userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Director');

  if (!isTeacher) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>Only teachers and staff can access this page.</p>
      </div>
    );
  }

  // 2. Fetch assigned classes and subjects
  let classes: { id: string; name: string; section: string }[] = [];
  let subjects: { id: string; name: string }[] = [];

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Director');

  if (isAdmin) {
    // Admins see all classes & subjects
    const { data: allClasses } = await supabase
      .from('classes')
      .select('id, name, section')
      .order('name', { ascending: true });
    classes = allClasses || [];

    const { data: allSubjects } = await supabase
      .from('subjects')
      .select('id, name')
      .order('name', { ascending: true });
    subjects = allSubjects || [];
  } else {
    // Normal teachers see only their assigned classes & subjects via class_subjects
    const { data: assignments } = await supabase
      .from('class_subjects')
      .select(`
        class_id,
        classes (
          id,
          name,
          section
        ),
        subject_id,
        subjects (
          id,
          name
        )
      `)
      .eq('teacher_id', user.id);

    // Extract unique classes and subjects
    const uniqueClassMap = new Map();
    const uniqueSubjectMap = new Map();

    (assignments || []).forEach((assignment: any) => {
      if (assignment.classes) {
        uniqueClassMap.set(assignment.classes.id, assignment.classes);
      }
      if (assignment.subjects) {
        uniqueSubjectMap.set(assignment.subjects.id, assignment.subjects);
      }
    });

    classes = Array.from(uniqueClassMap.values());
    subjects = Array.from(uniqueSubjectMap.values());
  }

  // Fallbacks if no assignments exist
  if (classes.length === 0) {
    const { data: fallbackClasses } = await supabase.from('classes').select('id, name, section').limit(5);
    classes = fallbackClasses || [];
  }
  if (subjects.length === 0) {
    const { data: fallbackSubjects } = await supabase.from('subjects').select('id, name').limit(5);
    subjects = fallbackSubjects || [];
  }

  // 3. Fetch all class activities
  const { data: dbActivities } = await supabase
    .from('class_activities')
    .select(`
      id,
      class_id,
      title,
      subject,
      topic,
      grade_level,
      activity_type,
      description,
      date,
      questions,
      time_limit_minutes,
      max_attempts,
      is_published,
      total_questions,
      classes (
        name,
        section
      )
    `)
    .order('date', { ascending: false });

  // Map to flatten classes join response
  const activities = (dbActivities || []).map((act: any) => ({
    id: act.id,
    class_id: act.class_id,
    title: act.title,
    subject: act.subject,
    topic: act.topic || '',
    grade_level: act.grade_level || '',
    activity_type: act.activity_type || 'classwork',
    description: act.description,
    date: act.date,
    questions: act.questions || [],
    time_limit_minutes: act.time_limit_minutes || 0,
    max_attempts: act.max_attempts || 1,
    is_published: act.is_published || false,
    total_questions: act.total_questions || 0,
    classes: act.classes || { name: 'Unknown Class', section: '' }
  }));

  return (
    <ClassActivitiesClient
      initialActivities={activities}
      classes={classes}
      subjects={subjects}
    />
  );
}
