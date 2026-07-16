import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .single();

    const roles = profile?.roles || (profile?.role ? [profile.role] : []);
    const isTeacher = roles.some((r: string) => 
      ['System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean'].includes(r)
    );

    if (!isTeacher) {
      return NextResponse.json({ error: 'Forbidden: Only teachers and staff can publish activities' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      class_id,
      title,
      subject,
      topic,
      grade_level,
      activity_type = 'quiz',
      description = '',
      questions = [],
      time_limit_minutes = 15,
      max_attempts = 1,
      due_date = null
    } = body;

    if (!class_id || !title || !subject || !topic || !grade_level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Insert activity into the database
    const { data, error } = await supabase
      .from('class_activities')
      .insert({
        class_id,
        title,
        subject,
        date: new Date().toISOString(), // Standard date column
        description,
        topic,
        grade_level,
        activity_type,
        questions,
        time_limit_minutes,
        max_attempts,
        is_published: true,
        due_date,
        total_questions: questions.length,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Class activity published successfully',
      data
    });

  } catch (error: any) {
    console.error('Publish Activity Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
