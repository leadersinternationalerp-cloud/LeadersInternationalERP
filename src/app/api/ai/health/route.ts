import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 30; // Health check should be fast

/**
 * Health diagnostic endpoint for AI configuration.
 * Staff-auth protected: only System Admin, Director, Principal can access.
 * Never returns the actual API key - only presence status.
 */
export async function GET() {
  try {
    // 1. Authenticate the user (staff-auth protection)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - staff only
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', user.id)
      .single();

    const roles = profile?.roles || (profile?.role ? [profile.role] : []);
    const isStaff = roles.some((r: string) => 
      ['System Admin', 'Director', 'Principal'].includes(r)
    );

    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
    }

    // 2. Check API key presence (never return the actual key)
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
        console.warn('Health check failed to query integration_config for GEMINI key:', dbError);
      }
    }

    const keyStatus: 'configured' | 'placeholder' | 'missing' = 
      !apiKey ? 'missing' :
      apiKey.startsWith('YOUR_KEY') || apiKey === '' ? 'placeholder' :
      'configured';

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
              generationConfig: { responseMimeType: 'application/json' }
            });
            await model.generateContent('Respond with exactly: {"ok": true}');
          } catch (mimeErr) {
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent('Respond with exactly: {"ok": true}');
          }
          modelValidation.push({ model: modelName, status: 'available' });
        } catch (error: any) {
          const errorMsg = error?.message || String(error);
          const isModelUnavailable = errorMsg.includes('404') || 
            errorMsg.toLowerCase().includes('not found') ||
            errorMsg.toLowerCase().includes('model not found');
          
          modelValidation.push({ 
            model: modelName, 
            status: isModelUnavailable ? 'unavailable' : 'unknown',
            error: isModelUnavailable ? 'Model not available or retired' : errorMsg || 'Connection error'
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
    const healthy = keyStatus === 'configured' && 
      modelValidation.some(m => m.status === 'available');

    return NextResponse.json({
      success: true,
      healthy,
      apiKey: keyStatus,
      primaryModel: modelValidation[0],
      fallbackModel: modelValidation[1],
      message: healthy 
        ? 'AI configuration is healthy' 
        : keyStatus !== 'configured' 
          ? 'GEMINI_API_KEY needs to be configured in process.env or integration_config'
          : 'One or more models may be unavailable'
    });

  } catch (error: any) {
    console.error('AI Health Check Error:', error);
    return NextResponse.json({ 
      success: false,
      healthy: false,
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
