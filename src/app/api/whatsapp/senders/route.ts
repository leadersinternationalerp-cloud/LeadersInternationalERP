import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson } from '@/lib/api/handler'
import { ADMIN_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'

async function getTwilioConfig(supabase: any) {
  const { data: config } = await supabase
    .from('integration_config')
    .select('*')
    .eq('provider_type', 'WHATSAPP')
    .ilike('provider_name', '%twilio%')
    .order('is_active', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config || !config.api_key || !config.api_secret) {
    return null
  }

  return {
    id: config.id,
    accountSid: config.api_key,
    authToken: config.api_secret,
    defaultSender: config.webhook_secret || '',
  }
}

function getAuthHeaders(accountSid: string, authToken: string) {
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  return {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
}

export const GET = route(
  async ({ requestId }) => {
    const supabase = await createClient()
    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      throw new ApiError('NOT_FOUND', 'Twilio WhatsApp is not configured')
    }

    const { accountSid, authToken, defaultSender } = twilioConfig

    const response = await fetch(`https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp`, {
      method: 'GET',
      headers: getAuthHeaders(accountSid, authToken),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TWILIO API ERROR] Fetch senders failed:', errorText)
      throw new ApiError('PROVIDER_ERROR', 'Twilio rejected the request')
    }

    const data = await response.json()
    const maskedSid = `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}`

    return ok(
      {
        senders: data.senders || [],
        defaultSender,
        accountSid: maskedSid,
      },
      { requestId }
    )
  },
  { roles: ADMIN_ROLES }
)

export const POST = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      throw new ApiError('NOT_FOUND', 'Twilio WhatsApp is not configured')
    }

    const { accountSid, authToken } = twilioConfig
    const body = await parseJson<{
      senderId?: string
      profile?: {
        name?: string
        vertical?: string
        about?: string
        address?: string
        description?: string
        logoUrl?: string
        logo_url?: string
        websites?: string[]
        emails?: string[]
      }
    }>(req)

    const { senderId, profile } = body
    if (!senderId || !profile?.name) {
      throw badRequest({ fields: 'Sender ID (phone number) and Business Display Name are required.' })
    }

    const payload = {
      senderId,
      profile: {
        name: profile.name,
        vertical: profile.vertical || 'Other',
        about: profile.about || '',
        address: profile.address || '',
        description: profile.description || '',
        logo_url: profile.logoUrl || profile.logo_url || null,
        websites: profile.websites || [],
        emails: profile.emails || [],
      },
    }

    const response = await fetch('https://messaging.twilio.com/v2/Channels/Senders', {
      method: 'POST',
      headers: getAuthHeaders(accountSid, authToken),
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TWILIO API ERROR] Create sender failed:', errorText)
      throw new ApiError('PROVIDER_ERROR', 'Twilio rejected the request')
    }

    const data = await response.json()
    return ok({ sender: data }, { requestId }, 201)
  },
  { roles: ADMIN_ROLES }
)

export const PUT = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      throw new ApiError('NOT_FOUND', 'Twilio WhatsApp is not configured')
    }

    const body = await parseJson<{
      defaultSenderId?: string
    }>(req)

    const { defaultSenderId } = body
    if (!defaultSenderId) {
      throw badRequest({ defaultSenderId: 'Default Sender ID is required.' })
    }

    const { error: updateError } = await supabase
      .from('integration_config')
      .update({ webhook_secret: defaultSenderId })
      .eq('id', twilioConfig.id)

    if (updateError) {
      throw new ApiError('INTERNAL', 'Failed to update database configuration')
    }

    return ok({ defaultSenderId }, { requestId })
  },
  { roles: ADMIN_ROLES }
)

export const DELETE = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      throw new ApiError('NOT_FOUND', 'Twilio WhatsApp is not configured')
    }

    const { accountSid, authToken } = twilioConfig
    const { searchParams } = new URL(req.url)
    const sid = searchParams.get('sid')

    if (!sid) {
      throw badRequest({ sid: 'Sender SID is required' })
    }

    const response = await fetch(`https://messaging.twilio.com/v2/Channels/Senders/${sid}`, {
      method: 'DELETE',
      headers: getAuthHeaders(accountSid, authToken),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TWILIO API ERROR] Delete sender failed:', errorText)
      throw new ApiError('PROVIDER_ERROR', 'Twilio rejected the request')
    }

    return ok({ success: true }, { requestId })
  },
  { roles: ADMIN_ROLES }
)
