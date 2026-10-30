import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServiceClient } from '@/utils/supabase/service'
import { route, ok } from '@/lib/api/handler'

export const maxDuration = 30

const ENV_KEY_CANDIDATES = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'GENERATIVE_LANGUAGE_API_KEY',
] as const

const HEALTH_CHECK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const

let cachedHealth: { result: Record<string, unknown>; timestamp: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000

async function resolveGeminiApiKey(): Promise<{
  apiKey: string | null
  keyStatus: 'configured' | 'placeholder' | 'missing'
  keySource: string | null
  envChecked: string[]
}> {
  const envChecked = [...ENV_KEY_CANDIDATES]

  for (const name of ENV_KEY_CANDIDATES) {
    const raw = process.env[name]
    if (raw === undefined || raw === null) continue
    const value = String(raw).trim()
    if (!value || value.startsWith('YOUR_KEY') || value.toLowerCase() === 'your_gemini_api_key_here') {
      continue
    }
    return {
      apiKey: value,
      keyStatus: 'configured',
      keySource: `env:${name}`,
      envChecked,
    }
  }

  const anyPlaceholder = ENV_KEY_CANDIDATES.some((name) => {
    const raw = process.env[name]
    if (raw === undefined || raw === null) return false
    const value = String(raw).trim()
    return value.startsWith('YOUR_KEY') || value.toLowerCase() === 'your_gemini_api_key_here' || value === ''
  })

  try {
    const serviceClient = createServiceClient()
    const { data: dbConfig } = await serviceClient
      .from('integration_config')
      .select('api_key, is_active')
      .eq('provider_type', 'GEMINI')
      .eq('is_active', true)
      .maybeSingle()

    if (dbConfig?.api_key) {
      const value = String(dbConfig.api_key).trim()
      if (value && !value.startsWith('YOUR_KEY')) {
        return {
          apiKey: value,
          keyStatus: 'configured',
          keySource: 'integration_config',
          envChecked,
        }
      }
    }
  } catch (err) {
    console.warn('Failed to query integration_config:', err)
  }

  return {
    apiKey: null,
    keyStatus: anyPlaceholder ? 'placeholder' : 'missing',
    keySource: null,
    envChecked,
  }
}

export const GET = route(
  async ({ requestId }) => {
    const now = Date.now()
    if (cachedHealth && now - cachedHealth.timestamp < CACHE_TTL_MS) {
      return ok({ ...cachedHealth.result, cached: true }, { requestId })
    }

    const { apiKey, keyStatus, keySource, envChecked } = await resolveGeminiApiKey()

    const modelResults: Array<{
      model: string
      status: 'ok' | 'failed' | 'skipped'
      latencyMs?: number
      error?: string
    }> = []

    let overallStatus: 'healthy' | 'degraded' | 'unconfigured' = 'unconfigured'

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey)
      let anyModelOk = false

      for (const modelName of HEALTH_CHECK_MODELS) {
        const start = Date.now()
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const probe = await model.generateContent('Say "OK" and nothing else.')
          const latencyMs = Date.now() - start
          const text = probe.response.text()?.trim()

          if (text) {
            anyModelOk = true
            modelResults.push({ model: modelName, status: 'ok', latencyMs })
          } else {
            modelResults.push({ model: modelName, status: 'failed', latencyMs, error: 'Empty response' })
          }
        } catch (err: unknown) {
          const latencyMs = Date.now() - start
          modelResults.push({
            model: modelName,
            status: 'failed',
            latencyMs,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      overallStatus = anyModelOk ? 'healthy' : 'degraded'
    } else {
      for (const modelName of HEALTH_CHECK_MODELS) {
        modelResults.push({ model: modelName, status: 'skipped', error: 'No API key' })
      }
    }

    const healthReport = {
      status: overallStatus,
      keyStatus,
      keySource,
      envChecked,
      models: modelResults,
      timestamp: new Date().toISOString(),
    }

    cachedHealth = { result: healthReport, timestamp: now }

    return ok(healthReport, { requestId })
  },
  { roles: ['System Admin'] }
)
