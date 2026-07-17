import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { markQuiz } from '@/lib/cambridge-syllabus';
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading';

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

    // Fetch grading scale settings
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .maybeSingle();
    const gradingLevels = parseGradingLevels(setting?.value);
    const grade = getGradeForPercentage(evaluation.percentage, gradingLevels);

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
        time_taken_seconds,
        grade
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

    // 6.5 Record the score in the marks table for report cards
    try {
      const serviceClient = createServiceClient();

      // Resolve subject_id by searching subjects matching activity.subject
      const { data: subjectRecord } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', activity.subject)
        .maybeSingle();

      const subjectId = subjectRecord?.id;

      if (subjectId) {
        // Fetch current active term
        const { data: activeTerm } = await supabase
          .from('terms')
          .select('name, academic_year_id')
          .eq('is_current', true)
          .maybeSingle();

        let termName = activeTerm?.name || 'Term 3';
        let academicYearName = '2025-2026';

        if (activeTerm?.academic_year_id) {
          const { data: activeYear } = await supabase
            .from('academic_years')
            .select('name')
            .eq('id', activeTerm.academic_year_id)
            .maybeSingle();
          if (activeYear) {
            academicYearName = activeYear.name;
          }
        }

        // Upsert score into marks table using elevated serviceClient privileges to bypass student write RLS
        const { data: existingMark } = await serviceClient
          .from('marks')
          .select('id')
          .eq('student_id', user.id)
          .eq('class_id', activity.class_id)
          .eq('subject_id', subjectId)
          .eq('remarks', `Quiz: ${activity.title} (Auto-marked)`)
          .maybeSingle();

        const markData: any = {
          student_id: user.id,
          class_id: activity.class_id,
          subject_id: subjectId,
          assessment_type: 'CA',
          term: termName,
          academic_year: academicYearName,
          score: evaluation.percentage,
          remarks: `Quiz: ${activity.title} (Auto-marked)`,
          grading_scale: `Percentage (${grade})`,
          graded_by: activity.created_by,
          is_released: false
        };

        if (existingMark) {
          markData.id = existingMark.id;
        }

        const { error: markError } = await serviceClient
          .from('marks')
          .upsert(markData);

        if (markError) {
          console.error('Failed to save quiz mark in marks table:', markError.message);
        }
      } else {
        console.warn(`Subject matching name '${activity.subject}' not found. Cannot record quiz mark in marks table.`);
      }
    } catch (markRecordError) {
      console.error('Error during quiz mark recording:', markRecordError);
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
        results: evaluation.results,
        grade: attempt.grade
      }
    });

  } catch (error: any) {
    console.error('Submit Quiz Route Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
