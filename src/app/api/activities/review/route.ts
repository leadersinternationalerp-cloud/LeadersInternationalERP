import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { markQuiz } from '@/lib/cambridge-syllabus';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activity_id');
    if (!activityId) {
      return NextResponse.json({ error: 'Missing activity_id' }, { status: 400 });
    }

    // Load the student's attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('activity_attempts')
      .select('*')
      .eq('activity_id', activityId)
      .eq('student_id', user.id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'No attempt found' }, { status: 404 });
    }

    // Load quiz questions
    const { data: activity, error: activityError } = await supabase
      .from('class_activities')
      .select('questions')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Re-mark the submitted answers
    const questions = activity.questions || [];
    const answers = attempt.answers || {};
    const evaluation = markQuiz(questions, answers);

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        percentage: evaluation.percentage,
        results: evaluation.results,
        submittedAt: attempt.submitted_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
