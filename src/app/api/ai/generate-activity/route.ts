import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCambridgePrompt } from '@/lib/cambridge-syllabus';
import { getFallbackQuiz } from '@/lib/quiz-fallback';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60; // Allow Vercel to run up to 60 seconds for AI generation

export async function POST(request: Request) {
  try {
    // 1. Authenticate the user (only teachers/admin can generate quizzes)
    const supabase = await createClient();
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
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to generate quizzes' }, { status: 403 });
    }

    // 2. Parse body parameters
    const body = await request.json();
    const { subject, gradeLevel, topic, numQuestions = 5, topicObjectives = [], topicNumber = '', unitTitle = '' } = body;

    if (!subject || !gradeLevel || !topic) {
      return NextResponse.json({ error: 'Missing required fields: subject, gradeLevel, topic' }, { status: 400 });
    }

    // Try to get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    
    // If API Key is missing or invalid placeholder, fallback immediately to local templates
    if (!apiKey || apiKey.startsWith('YOUR_KEY') || apiKey === '') {
      console.log('Gemini API key is not configured. Falling back to local offline quiz templates.');
      const localQuiz = getFallbackQuiz(subject, gradeLevel, topic, numQuestions);
      return NextResponse.json({ 
        success: true, 
        source: 'local-fallback', 
        reason: 'GEMINI_API_KEY not configured or is a placeholder',
        data: localQuiz 
      });
    }

    // 3. Build prompt for Gemini, using explicit objectives and topic metadata when provided
    const prompt = getCambridgePrompt(
      subject,
      gradeLevel,
      topic,
      numQuestions,
      Array.isArray(topicObjectives) ? topicObjectives : [],
      topicNumber,
      unitTitle
    );

    // Initialize Google GenAI
    const genAI = new GoogleGenerativeAI(apiKey);
    // NOTE: gemini-1.5-flash and gemini-1.5-flash-8b were retired by Google (API returns 404).
    // Current free-tier models. Primary/fallback can be overridden via env without a code change.
    const PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-flash';
    const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';
    
    let quizData = null;
    let usedModel = PRIMARY_MODEL;

    // Try primary model
    try {
      console.log(`Attempting quiz generation with model: ${PRIMARY_MODEL}`);
      const model = genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        generationConfig: { responseMimeType: 'application/json' }
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      quizData = parseGenAIResponse(text);
    } catch (primaryError: any) {
      console.error(`Quiz generation with model ${PRIMARY_MODEL} failed:`, primaryError.message || primaryError);
      
      // Fallback model
      try {
        usedModel = FALLBACK_MODEL;
        console.log(`Attempting quiz generation with fallback model: ${FALLBACK_MODEL}`);
        const model = genAI.getGenerativeModel({
          model: FALLBACK_MODEL,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        quizData = parseGenAIResponse(text);
      } catch (fallbackError: any) {
        console.error(`Quiz generation with fallback model ${FALLBACK_MODEL} failed:`, fallbackError.message || fallbackError);
      }
    }

    // 4. If AI generation succeeded, return the parsed JSON
    if (quizData) {
      return NextResponse.json({
        success: true,
        source: 'gemini-api',
        model: usedModel,
        data: quizData
      });
    }

    // 5. If both models failed, fallback to local offline MCQ templates
    console.log('Both Gemini AI attempts failed. Using local offline MCQ templates.');
    const localQuiz = getFallbackQuiz(subject, gradeLevel, topic, numQuestions);
    return NextResponse.json({
      success: true,
      source: 'local-fallback',
      reason: `Both ${PRIMARY_MODEL} and ${FALLBACK_MODEL} failed`,
      data: localQuiz
    });

  } catch (error: any) {
    console.error('AI Quiz Generator Endpoint Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Robust JSON extraction from the GenAI response string
 */
function parseGenAIResponse(responseStr: string) {
  let cleaned = responseStr.trim();
  
  // Strip markdown code block wrappers if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  
  // Find first '{' and last '}' to strip any garbage text
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  return JSON.parse(cleaned);
}
