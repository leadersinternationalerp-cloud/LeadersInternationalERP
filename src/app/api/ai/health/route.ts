import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 30; // Health check should be fast

const ENV_KEY_CANDIDATES = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'GENERATIVE_LANGUAGE_API_KEY',
] as const;

/**
 * Resolve a Google/Gemini API key from common env var names, then
 * fall back to the active GEMINI row in integration_config.
 * Never returns the actual key to clients — only presence status.
 */
async function resolveGeminiApiKey(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{
  apiKey: string | null;
  keyStatus: 'configured' | 'placeholder' | 'missing';
  keySource: string | null;
  envChecked: string[];
}> {
  const envChecked = [...ENV_KEY_CANDIDATES];

  for (const name of ENV_KEY_CANDIDATES) {
    const raw = process.env[name];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value || value.startsWith('YOUR_KEY') || value.toLowerCase() === 'your_gemini_api_key_here') {
      // Found a placeholder in env — keep scanning other names, but remember placeholder
      continue;
    }
    return {
      apiKey: value,
      keyStatus: 'configured',
      keySource: `env:${name}`,
      envChecked,
    };
  }

  // Detect pure placeholders (set but invalid) vs completely missing
  const anyPlaceholder = ENV_KEY_CANDIDATES.some((name) => {
    const raw = process.env[name];
    if (raw === undefined || raw === null) return false;
    const value = String(raw).trim();
    return value.startsWith('YOUR_KEY') || value.toLowerCase() === 'your_gemini_api_key_here' || value === '';
  });

  try {
    const { data: dbConfig, error: dbError } = await supabase
      .from('integration_config')
      .select('api_key')
      .eq('provider_type', 'GEMINI')
      .eq('is_active', true)
      .maybeSingle();

    if (dbError) {
      console.warn('Health check failed to query integration_config for GEMINI key:', dbError);
    } else if (dbConfig?.api_key) {
      const value = String(dbConfig.api_key).trim();
      if (value && !value.startsWith('YOUR_KEY')) {
        return {
          apiKey: value,
          keyStatus: 'configured',
          keySource: 'integration_config',
          envChecked,
        };
      }
    }
  } catch (dbError) {
    console.warn('Health check failed to query integration_config for GEMINI key:', dbError);
  }

  return {
    apiKey: null,
    keyStatus: anyPlaceholder ? 'placeholder' : 'missing',
    keySource: null,
    envChecked,
  };
}

/**
 * Health diagnostic endpoint for AI configuration.
 * Auth protected: Teachers, System Admin, Director, Principal, Head of Section, Dean can access.
 * Never returns the actual API key - only presence status.
 */
export async function GET() {
  try {
    // 1. Authenticate the user (staff-auth protection)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - teachers and staff
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
      return NextResponse.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
    }

    // 2. Check API key presence across expanded Google/Gemini env names (never return the actual key)
    const { apiKey, keyStatus, keySource, envChecked } = await resolveGeminiApiKey(supabase);

    // 3. Get configured models
    const primaryModel = process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.0-flash';
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash';

    const modelValidation: {
      model: string;
      status: 'unknown' | 'available' | 'unavailable';
      error?: string;
    }[] = [];

    // 4. Validate models against live API if key is properly configured
    if (keyStatus === 'configured' && apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      const testModel = async (modelName: string) => {
        try {
          try {
            const model = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: { responseMimeType: 'application/json' },
            });
            await model.generateContent('Respond with exactly: {"ok": true}');
          } catch {
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent('Respond with exactly: {"ok": true}');
          }
          modelValidation.push({ model: modelName, status: 'available' });
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          const isModelUnavailable =
            errorMsg.includes('404') ||
            errorMsg.toLowerCase().includes('not found') ||
            errorMsg.toLowerCase().includes('model not found');

          modelValidation.push({
            model: modelName,
            status: isModelUnavailable ? 'unavailable' : 'unknown',
            error: isModelUnavailable ? 'Model not available or retired' : errorMsg || 'Connection error',
          });
        }
      };

      await testModel(primaryModel);
      await testModel(fallbackModel);
    } else {
      // Cannot validate without proper API key
      modelValidation.push({ model: primaryModel, status: 'unknown' });
      modelValidation.push({ model: fallbackModel, status: 'unknown' });
    }

    // 5. Build response (never expose API key)
    const healthy =
      keyStatus === 'configured' && modelValidation.some((m) => m.status === 'available');

    return NextResponse.json({
      success: true,
      healthy,
      apiKey: keyStatus,
      keySource,
      envChecked,
      primaryModel: modelValidation[0],
      fallbackModel: modelValidation[1],
      message: healthy
        ? 'AI configuration is healthy'
        : keyStatus !== 'configured'
          ? `Google/Gemini API key needs to be configured (checked: ${envChecked.join(', ')}, or integration_config)`
          : 'One or more models may be unavailable',
    });
  } catch (error: any) {
    console.error('AI Health Check Error:', error);
    return NextResponse.json(
      {
        success: false,
        healthy: false,
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
