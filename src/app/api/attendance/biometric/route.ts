import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/utils/supabase/service'
import { route, parseJson, apiHeaders } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'

export const POST = route(
  async ({ req, requestId }) => {
    const deviceId = req.headers.get('x-device-id')
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

    const envKey = process.env.BIOMETRIC_API_KEY
    const serviceClient = createServiceClient()

    // 1. Authenticate device
    let isAuthorized = false

    if (deviceId && apiKey) {
      const { data: device } = await serviceClient
        .from('biometric_devices')
        .select('*')
        .eq('id', deviceId)
        .maybeSingle()

      if (device) {
        if (device.is_active === false) {
          throw new ApiError('FORBIDDEN', 'Biometric device is inactive')
        }

        if (device.api_key_hash) {
          const providedHash = crypto.createHash('sha256').update(apiKey).digest('hex')
          if (
            providedHash.length === device.api_key_hash.length &&
            crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(device.api_key_hash))
          ) {
            isAuthorized = true
          }
        } else if (envKey && apiKey === envKey) {
          isAuthorized = true
        }

        if (isAuthorized) {
          await serviceClient
            .from('biometric_devices')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', deviceId)
        }
      }
    }

    if (!isAuthorized && envKey && apiKey === envKey) {
      isAuthorized = true
    }

    if (!isAuthorized) {
      throw new ApiError('UNAUTHENTICATED', 'Invalid device credentials or API key')
    }

    // 2. Parse payload
    const body = await parseJson<{
      biometric_id?: string
      timestamp?: string
      device_id?: string
    }>(req)

    const { biometric_id, timestamp, device_id: bodyDeviceId } = body
    if (!biometric_id || !timestamp) {
      throw new ApiError('VALIDATION_FAILED', 'Missing required fields: biometric_id, timestamp')
    }

    // 3. Resolve student
    const { data: studentData, error: studentError } = await serviceClient
      .from('students')
      .select('id, class_id')
      .eq('biometric_id', biometric_id)
      .maybeSingle()

    if (studentError || !studentData?.class_id) {
      throw new ApiError('NOT_FOUND', 'Unknown biometric ID', { code: 'UNKNOWN_BIOMETRIC_ID' })
    }

    const date = new Date(timestamp).toISOString().split('T')[0]
    const activeDeviceId = deviceId || bodyDeviceId || 'unknown'

    // 4. Record attendance
    await serviceClient.from('attendance').upsert(
      {
        student_id: studentData.id,
        class_id: studentData.class_id,
        date,
        status: 'Present',
      },
      { onConflict: 'student_id,date' }
    )

    // 5. Log punch
    try {
      await serviceClient.from('biometric_logs').insert({
        device_id: activeDeviceId,
        biometric_id,
        timestamp,
        student_id: studentData.id,
      })
    } catch {
      // Ignore dedupe collision on logs
    }

    return NextResponse.json(
      {
        data: {
          student_id: studentData.id,
          class_id: studentData.class_id,
          status: 'Present',
          date,
        },
        meta: { requestId },
      },
      {
        status: 202,
        headers: apiHeaders(requestId),
      }
    )
  },
  { requireAuth: false }
)
