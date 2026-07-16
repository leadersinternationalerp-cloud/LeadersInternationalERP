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

    // Try to get API key from environment variable or database integration config
    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.startsWith('YOUR_KEY') || apiKey.trim() === '') {
      try {
        const { data: dbConfig } = await supabase
          .from('integration_config')
          .select('api_key')
          .eq('provider_type', 'GEMINI')
          .eq('is_active', true)
          .maybeSingle();

        if (dbConfig?.api_key) {
          apiKey = dbConfig.api_key;
        }
      } catch (dbError) {
        console.warn('Failed to fetch GEMINI api_key from integration_config:', dbError);
      }
    }

    // If API Key is missing or invalid placeholder, fallback immediately to local templates
    if (!apiKey || apiKey.startsWith('YOUR_KEY') || apiKey.trim() === '') {
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

    // Sequence of models to attempt (prioritizing current stable & fast Gemini models)
    const primaryEnv = process.env.GEMINI_PRIMARY_MODEL;
    const fallbackEnv = process.env.GEMINI_FALLBACK_MODEL;

    const candidateModels = Array.from(new Set([
      primaryEnv,
      fallbackEnv,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-2.5-flash'
    ].filter((m): m is string => Boolean(m && m.trim()))));

    let quizData: any = null;
    let usedModel: string | null = null;
    let lastErrorDetails: string | null = null;

    // Try each model candidate sequentially
    for (const modelName of candidateModels) {
      try {
        console.log(`Attempting quiz generation with model: ${modelName}`);
        
        // Attempt 1: With application/json response format
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' }
          });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          quizData = parseGenAIResponse(text);
        } catch (jsonMimeErr: any) {
          console.warn(`Model ${modelName} JSON mime attempt failed: ${jsonMimeErr?.message || jsonMimeErr}. Retrying standard generation...`);
          // Attempt 2: Standard generation without explicit responseMimeType
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          quizData = parseGenAIResponse(text);
        }

        if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
          usedModel = modelName;
          console.log(`Successfully generated quiz with model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastErrorDetails = err?.message || String(err);
        console.error(`Quiz generation with model ${modelName} failed:`, lastErrorDetails);
      }
    }

    // 4. If AI generation succeeded, return the parsed JSON
    if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'gemini-api',
        model: usedModel,
        data: quizData
      });
    }

    // 5. If all Gemini model attempts failed, fallback to local offline MCQ templates
    console.log('All Gemini AI model attempts failed. Using local offline MCQ templates.');
    const localQuiz = getFallbackQuiz(subject, gradeLevel, topic, numQuestions);
    return NextResponse.json({
      success: true,
      source: 'local-fallback',
      reason: `All Gemini models failed. Last error: ${lastErrorDetails || 'Unknown error'}`,
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
  if (!responseStr || typeof responseStr !== 'string') return null;

  let cleaned = responseStr.trim();
  
  // Strip markdown code block wrappers if present
  cleaned = cleaned
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  
  // Find first '{' and last '}' to strip any surrounding commentary
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // Sanitize common LLM JSON errors: trailing commas before closing braces or brackets
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('Failed to parse GenAI response as JSON:', parseErr, 'Raw string:', responseStr);
    return null;
  }
}
