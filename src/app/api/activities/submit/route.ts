import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { markQuiz } from '@/lib/cambridge-syllabus';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { activity_id, answers, time_taken_seconds } = body;

    if (!activity_id || !answers) {
      return NextResponse.json({ error: 'Missing required fields: activity_id, answers' }, { status: 400 });
    }

    // 3. Check for existing attempts
    const { data: existingAttempt, error: attemptCheckError } = await supabase
      .from('activity_attempts')
      .select('id')
      .eq('activity_id', activity_id)
      .eq('student_id', user.id)
      .maybeSingle();

    if (attemptCheckError) {
      console.error('Check existing attempts error:', attemptCheckError);
    }

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'You have already submitted an attempt for this quiz.' },
        { status: 409 }
      );
    }

    // 4. Retrieve class activity (the quiz questions and correctness key)
    const { data: activity, error: activityError } = await supabase
      .from('class_activities')
      .select('*')
      .eq('id', activity_id)
      .single();

    if (activityError || !activity) {
      return NextResponse.json({ error: 'Quiz activity not found' }, { status: 404 });
    }

    if (!activity.is_published) {
      return NextResponse.json({ error: 'This quiz is not published yet' }, { status: 400 });
    }

    // 5. Score the quiz server-side
    const questions = activity.questions || [];
    const evaluation = markQuiz(questions, answers);

    // 6. Store attempt in the database
    const { data: attempt, error: insertError } = await supabase
      .from('activity_attempts')
      .insert({
        activity_id,
        student_id: user.id,
        answers,
        score: evaluation.score,
        max_score: evaluation.maxScore,
        percentage: evaluation.percentage,
        time_taken_seconds
      })
      .select()
      .single();

    if (insertError) {
      // Handle db unique constraint violation specifically (if code execution raced)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already submitted an attempt for this quiz.' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    // 7. Return evaluation results
    return NextResponse.json({
      success: true,
      message: 'Quiz submitted and marked successfully',
      data: {
        attemptId: attempt.id,
        score: evaluation.score,
        maxScore: evaluation.maxScore,
        percentage: evaluation.percentage,
        results: evaluation.results
      }
    });

  } catch (error: any) {
    console.error('Submit Quiz Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
