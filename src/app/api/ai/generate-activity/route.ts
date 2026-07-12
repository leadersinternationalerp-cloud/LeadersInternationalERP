import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCambridgePrompt } from '@/lib/cambridge-syllabus';
import { getFallbackQuiz } from '@/lib/quiz-fallback';
import { createClient } from '@/utils/supabase/server';

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
    const { subject, gradeLevel, topic, numQuestions = 5 } = body;

    if (!subject || !gradeLevel || !topic) {
      return NextResponse.json({ error: 'Missing required fields: subject, gradeLevel, topic' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // If API Key is missing or invalid placeholder, fallback immediately to local templates
    if (!apiKey || apiKey.startsWith('YOUR_KEY') || apiKey === '') {
      console.log('Gemini API key is not configured. Falling back to local offline quiz templates.');
      const localQuiz = getFallbackQuiz(subject, gradeLevel, topic, numQuestions);
      return NextResponse.json({ 
        success: true, 
        source: 'local-fallback', 
        data: localQuiz 
      });
    }

    // 3. Build prompt for Gemini
    const prompt = getCambridgePrompt(subject, gradeLevel, topic, numQuestions);

    // Initialize Google GenAI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    let quizData = null;
    let usedModel = 'gemini-2.5-flash';

    // Try primary model
    try {
      console.log('Attempting quiz generation with model: gemini-2.5-flash');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      quizData = parseGenAIResponse(text);
    } catch (primaryError: any) {
      console.error('Primary gemini-2.5-flash failed:', primaryError.message || primaryError);
      
      // Fallback model
      try {
        usedModel = 'gemini-2.5-flash-lite';
        console.log('Attempting quiz generation with fallback model: gemini-2.5-flash-lite');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        quizData = parseGenAIResponse(text);
      } catch (fallbackError: any) {
        console.error('Fallback gemini-2.5-flash-lite failed:', fallbackError.message || fallbackError);
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
