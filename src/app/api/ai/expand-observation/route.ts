import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export const maxDuration = 30

const ACTIVE_FREE_TIER_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-pro'
] as const

async function resolveGeminiApiKey(): Promise<{ apiKey: string | null; source: string | null }> {
  const envCandidates: Array<{ name: string; value: string | undefined }> = [
    { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY },
    { name: 'GOOGLE_API_KEY', value: process.env.GOOGLE_API_KEY },
    { name: 'GOOGLE_GENERATIVE_AI_API_KEY', value: process.env.GOOGLE_GENERATIVE_AI_API_KEY },
    { name: 'GOOGLE_GEMINI_API_KEY', value: process.env.GOOGLE_GEMINI_API_KEY },
    { name: 'GENERATIVE_LANGUAGE_API_KEY', value: process.env.GENERATIVE_LANGUAGE_API_KEY }
  ]

  for (const candidate of envCandidates) {
    const value = candidate.value?.trim()
    if (value && !value.startsWith('YOUR_KEY') && value.toLowerCase() !== 'your_gemini_api_key_here') {
      return { apiKey: value, source: `env:${candidate.name}` }
    }
  }

  try {
    const serviceClient = createServiceClient()
    const { data: dbConfig } = await serviceClient
      .from('integration_config')
      .select('api_key')
      .eq('provider_type', 'GEMINI')
      .eq('is_active', true)
      .maybeSingle()

    if (dbConfig?.api_key) {
      const value = String(dbConfig.api_key).trim()
      if (value && !value.startsWith('YOUR_KEY')) {
        return { apiKey: value, source: 'integration_config' }
      }
    }
  } catch (err) {
    console.warn('Failed to query integration_config for GEMINI key:', err)
  }

  return { apiKey: null, source: null }
}

function getFallbackExpandedComment(note: string, childName?: string, learningArea?: string): string {
  const name = childName || 'The child'
  const area = learningArea || 'this learning area'
  const trimmed = note.trim().replace(/\.+$/, '')

  return `${name} displays steady developmental milestone progress in ${area}. Specifically, ${trimmed.toLowerCase()}. Through structured classroom activities and peer engagement, ${name} demonstrates consistent application and enthusiasm.`
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { note, childName = 'The child', learningArea = 'this area', achievementLevel = 'Developed' } = body

    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json({ error: 'Please enter a draft note to expand.' }, { status: 400 })
    }

    const { apiKey, source: keySource } = await resolveGeminiApiKey()

    // Fallback if no key configured
    if (!apiKey) {
      const fallbackText = getFallbackExpandedComment(note, childName, learningArea)
      return NextResponse.json({
        success: true,
        source: 'local-fallback',
        expandedText: fallbackText
      })
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey)
    const prompt = `You are an Early Years Foundation Stage (EYFS) educational specialist.
Your task is to take the following brief teacher note for a child named "${childName}" in the learning area "${learningArea}" (Achievement Level: "${achievementLevel}") and expand it into a professional 3 to 4 sentence developmental observation narrative.

RULES:
1. Write EXACTLY 3 to 4 complete, encouraging sentences.
2. Keep the exact intended meaning of the teacher's original note without inventing unsaid facts.
3. Use professional early childhood educational terminology (e.g., fine motor control, active engagement, peer collaboration, self-regulation).
4. Output ONLY the raw expanded sentences without any extra titles, quotes, or markdown wrappers.

Teacher's Note: "${note.trim()}"`

    let expandedText: string | null = null

    for (const modelName of ACTIVE_FREE_TIER_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        if (text && text.trim()) {
          expandedText = text.trim().replace(/^["']|["']$/g, '')
          break
        }
      } catch (e: any) {
        console.warn(`Gemini model ${modelName} attempt error:`, e?.message || e)
      }
    }

    if (!expandedText) {
      expandedText = getFallbackExpandedComment(note, childName, learningArea)
    }

    return NextResponse.json({
      success: true,
      source: keySource ? 'gemini-api' : 'local-fallback',
      expandedText
    })

  } catch (error: any) {
    console.error('AI expand-observation endpoint error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
