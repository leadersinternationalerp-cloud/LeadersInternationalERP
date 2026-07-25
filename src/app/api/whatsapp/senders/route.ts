import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Verify that the user is an admin or director
async function checkAuth(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  const roles = profile?.roles || []
  if (!roles.includes('System Admin') && !roles.includes('Director')) {
    return { authorized: false, errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { authorized: true, user }
}

// Fetch active or first Twilio WhatsApp configuration
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
    defaultSender: config.webhook_secret || ''
  }
}

// Helper to make Basic Auth headers
function getAuthHeaders(accountSid: string, authToken: string) {
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  }
}

// GET: Retrieve the list of registered WhatsApp Senders from Twilio
export async function GET() {
  try {
    const supabase = await createClient()
    const { authorized, errorResponse } = await checkAuth(supabase)
    if (!authorized) return errorResponse

    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      return NextResponse.json({ error: 'Twilio WhatsApp is not configured. Please add and configure Twilio in Integrations Settings first.' }, { status: 404 })
    }

    const { accountSid, authToken, defaultSender } = twilioConfig

    // Call Twilio Channels Senders API
    const response = await fetch(`https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp`, {
      method: 'GET',
      headers: getAuthHeaders(accountSid, authToken)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TWILIO API ERROR] Fetch senders failed:', errorText)
      return NextResponse.json({ error: `Twilio API returned error: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      senders: data.senders || [],
      defaultSender,
      accountSid: `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}`
    })

  } catch (error: any) {
    console.error('[API Senders GET ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// POST: Create/Register a new WhatsApp Sender on Twilio
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { authorized, errorResponse } = await checkAuth(supabase)
    if (!authorized) return errorResponse

    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      return NextResponse.json({ error: 'Twilio WhatsApp is not configured.' }, { status: 404 })
    }

    const { accountSid, authToken } = twilioConfig
    const body = await request.json()

    const { senderId, profile } = body
    if (!senderId || !profile?.name) {
      return NextResponse.json({ error: 'Sender ID (phone number) and Business Display Name are required.' }, { status: 400 })
    }

    // Format payload matching Twilio API spec
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
        emails: profile.emails || []
      }
    }

    const response = await fetch('https://messaging.twilio.com/v2/Channels/Senders', {
      method: 'POST',
      headers: getAuthHeaders(accountSid, authToken),
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TWILIO API ERROR] Create sender failed:', errorText)
      return NextResponse.json({ error: `Twilio API returned: ${errorText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, sender: data })

  } catch (error: any) {
    console.error('[API Senders POST ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PUT: Set a specific WhatsApp Sender as the Default Sender (stored in webhook_secret)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { authorized, errorResponse } = await checkAuth(supabase)
    if (!authorized) return errorResponse

    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      return NextResponse.json({ error: 'Twilio WhatsApp is not configured.' }, { status: 404 })
    }

    const body = await request.json()
    const { defaultSenderId } = body

    if (!defaultSenderId) {
      return NextResponse.json({ error: 'Default Sender ID is required.' }, { status: 400 })
    }

    // Update webhook_secret to hold the default sender id
    const { error: updateError } = await supabase
      .from('integration_config')
      .update({ webhook_secret: defaultSenderId })
      .eq('id', twilioConfig.id)

    if (updateError) {
      console.error('[DB UPDATE ERROR] Failed to update default sender:', updateError)
      return NextResponse.json({ error: 'Failed to update database configuration.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, defaultSenderId })

  } catch (error: any) {
    console.error('[API Senders PUT ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: Delete a WhatsApp Sender from Twilio
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { authorized, errorResponse } = await checkAuth(supabase)
    if (!authorized) return errorResponse

    const twilioConfig = await getTwilioConfig(supabase)
    if (!twilioConfig) {
      return NextResponse.json({ error: 'Twilio WhatsApp is not configured.' }, { status: 404 })
    }

    const { accountSid, authToken } = twilioConfig
    const { searchParams } = new URL(request.url)
    const sid = searchParams.get('sid')

    if (!sid) {
      return NextResponse.json({ error: 'Sender SID is required.' }, { status: 400 })
    }

    // DELETE request to Twilio Channels Senders API
    const response = await fetch(`https://messaging.twilio.com/v2/Channels/Senders/${sid}`, {
      method: 'DELETE',
      headers: getAuthHeaders(accountSid, authToken)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[TWILIO API ERROR] Delete sender failed:', errorText)
      return NextResponse.json({ error: `Twilio API returned: ${errorText}` }, { status: response.status })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[API Senders DELETE ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
