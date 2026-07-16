import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
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
    const isAuthorized = roles.some((r: string) => 
      ['System Admin', 'Director', 'Principal', 'Teacher', 'Head of Section', 'Dean'].includes(r)
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Only teachers and staff can view quiz scoreboards' }, { status: 403 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');

    if (!activityId) {
      return NextResponse.json({ error: 'Missing required query parameter: activity_id' }, { status: 400 });
    }

    // 3. Fetch attempts with student profile names
    const { data: attempts, error: fetchError } = await supabase
      .from('activity_attempts')
      .select(`
        id,
        activity_id,
        student_id,
        score,
        max_score,
        percentage,
        time_taken_seconds,
        submitted_at,
        answers,
        profiles (
          first_name,
          last_name,
          email
        )
      `)
      .eq('activity_id', activityId)
      .order('submitted_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    // Map profile join response to flatten student details
    const formattedAttempts = (attempts || []).map((attempt: any) => {
      const studentProfile = attempt.profiles || {};
      return {
        id: attempt.id,
        studentId: attempt.student_id,
        studentName: `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim() || 'Unknown Student',
        studentEmail: studentProfile.email || 'N/A',
        score: attempt.score,
        maxScore: attempt.max_score,
        percentage: attempt.percentage,
        timeTakenSeconds: attempt.time_taken_seconds,
        submittedAt: attempt.submitted_at,
        answers: attempt.answers
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedAttempts
    });

  } catch (error: any) {
    console.error('Quiz Results Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
