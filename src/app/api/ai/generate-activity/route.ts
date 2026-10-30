import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCambridgePrompt } from '@/lib/cambridge-syllabus'
import { getFallbackQuiz } from '@/lib/quiz-fallback'
import { createServiceClient } from '@/utils/supabase/service'
import { route, ok, parseJson } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { badRequest } from '@/lib/api/errors'

export const maxDuration = 60

const ACTIVE_FREE_TIER_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
] as const

async function resolveGeminiApiKey(): Promise<{ apiKey: string | null; source: string | null }> {
  const envCandidates: Array<{ name: string; value: string | undefined }> = [
    { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY },
    { name: 'GOOGLE_API_KEY', value: process.env.GOOGLE_API_KEY },
    { name: 'GOOGLE_GENERATIVE_AI_API_KEY', value: process.env.GOOGLE_GENERATIVE_AI_API_KEY },
    { name: 'GOOGLE_GEMINI_API_KEY', value: process.env.GOOGLE_GEMINI_API_KEY },
    { name: 'GENERATIVE_LANGUAGE_API_KEY', value: process.env.GENERATIVE_LANGUAGE_API_KEY },
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
  } catch (dbError) {
    console.warn('Failed to fetch GEMINI api_key from integration_config:', dbError)
  }

  return { apiKey: null, source: null }
}

function parseGenAIResponse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

export const POST = route(
  async ({ req, requestId }) => {
    const body = await parseJson<{
      subject?: string
      gradeLevel?: string
      topic?: string
      numQuestions?: number
      topicObjectives?: unknown[]
      topicNumber?: string
      unitTitle?: string
    }>(req)

    const {
      subject,
      gradeLevel,
      topic,
      numQuestions = 5,
      topicObjectives = [],
      topicNumber,
      unitTitle,
    } = body

    if (!subject || !gradeLevel || !topic) {
      throw badRequest({
        fields: 'Missing required parameters: subject, gradeLevel, and topic must be provided',
      })
    }

    const { apiKey, source: keySource } = await resolveGeminiApiKey()

    if (!apiKey) {
      const fallbackQuiz = getFallbackQuiz(subject, gradeLevel, topic, numQuestions)
      return ok(
        {
          source: 'local-fallback',
          reason: 'No Google Gemini API key configured.',
          data: fallbackQuiz,
        },
        { requestId }
      )
    }

    const prompt = getCambridgePrompt(
      subject,
      gradeLevel,
      topic,
      numQuestions,
      Array.isArray(topicObjectives) ? (topicObjectives as string[]) : [],
      topicNumber,
      unitTitle
    )

    const genAI = new GoogleGenerativeAI(apiKey)
    const primaryEnv = process.env.GEMINI_PRIMARY_MODEL
    const fallbackEnv = process.env.GEMINI_FALLBACK_MODEL
    const allowedModels = new Set(ACTIVE_FREE_TIER_MODELS)

    const candidateModels = Array.from(
      new Set(
        [primaryEnv, fallbackEnv, ...ACTIVE_FREE_TIER_MODELS].filter(
          (m): m is string => Boolean(m && m.trim()) && allowedModels.has(m as (typeof ACTIVE_FREE_TIER_MODELS)[number])
        )
      )
    )

    let quizData: Record<string, unknown> | null = null
    let usedModel: string | null = null

    for (const modelName of candidateModels) {
      try {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: 'application/json' },
          })
          const result = await model.generateContent(prompt)
          const text = result.response.text()
          quizData = parseGenAIResponse(text)
        } catch {
          const model = genAI.getGenerativeModel({ model: modelName })
          const result = await model.generateContent(prompt)
          const text = result.response.text()
          quizData = parseGenAIResponse(text)
        }

        if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
          usedModel = modelName
          break
        }
      } catch (err: unknown) {
        console.warn(`Quiz generation with model ${modelName} failed:`, err)
      }
    }

    if (quizData && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      return ok(
        {
          source: 'gemini-api',
          model: usedModel,
          keySource,
          data: quizData,
        },
        { requestId }
      )
    }

    const localQuiz = getFallbackQuiz(subject, gradeLevel, topic, numQuestions)
    return ok(
      {
        source: 'local-fallback',
        reason: 'All Gemini models failed.',
        data: localQuiz,
      },
      { requestId }
    )
  },
  {
    roles: [...MANAGEMENT_ROLES, 'Teacher'],
    rateLimit: { key: 'ai-generate', max: 20, windowMs: 3600_000 },
  }
)
