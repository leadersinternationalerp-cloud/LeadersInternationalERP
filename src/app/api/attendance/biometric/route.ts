import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { buildCacheKey, getCache, setCache } from '@/lib/cache/redisCache'
import { logStructuredSecurityEvent } from '@/lib/monitoring/logger'

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000 // ±5 minutes replay window

function safeCompareStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function computeBiometricHmac(
  rawBody: string,
  timestampHeader: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex')
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'biometric-device'
    await enforceRateLimit(`biometric:${ip}`, 120, 60_000)

    // 1. Authenticate Device via API Key & optional HMAC Signature
    const apiKey = request.headers.get('x-api-key')
    const validApiKey = process.env.BIOMETRIC_API_KEY
    const hmacSecret = process.env.BIOMETRIC_WEBHOOK_SECRET || validApiKey

    if (!validApiKey) {
      return NextResponse.json(
        { error: 'Biometric webhook is not configured on the server.' },
        { status: 503 }
      )
    }

    if (!apiKey || !safeCompareStrings(apiKey, validApiKey)) {
      logStructuredSecurityEvent('BIOMETRIC_INVALID_API_KEY', {
        route: '/api/attendance/biometric',
        method: 'POST',
        statusCode: 401,
        metadata: { ip },
      })
      return NextResponse.json({ error: 'Unauthorized device' }, { status: 401 })
    }

    const rawBody = await request.text()
    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { student_code, timestamp, device_id } = body

    if (!student_code || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: student_code, timestamp' },
        { status: 400 }
      )
    }

    // 2. Validate timestamp freshness (±5 minutes) to prevent replay attacks
    const parsedTimeMs = new Date(timestamp).getTime()
    if (Number.isNaN(parsedTimeMs)) {
      return NextResponse.json(
        { error: 'Invalid ISO timestamp format' },
        { status: 400 }
      )
    }

    const driftMs = Math.abs(Date.now() - parsedTimeMs)
    if (driftMs > MAX_TIMESTAMP_DRIFT_MS) {
      logStructuredSecurityEvent('BIOMETRIC_TIMESTAMP_DRIFT_REJECTED', {
        route: '/api/attendance/biometric',
        method: 'POST',
        statusCode: 401,
        metadata: { ip, device_id, driftMs },
      })
      return NextResponse.json(
        { error: 'Stale or future biometric timestamp rejected (exceeds 5m window)' },
        { status: 401 }
      )
    }

    // 3. Verify HMAC-SHA256 signature if provided or if required by BIOMETRIC_REQUIRE_HMAC
    const signatureHeader =
      request.headers.get('x-biometric-signature') ||
      request.headers.get('x-signature')
    const requireHmac = process.env.BIOMETRIC_REQUIRE_HMAC === 'true'

    if ( (requireHmac || signatureHeader) && hmacSecret ) {
      if (!signatureHeader) {
        logStructuredSecurityEvent('BIOMETRIC_MISSING_HMAC', {
          route: '/api/attendance/biometric',
          method: 'POST',
          statusCode: 401,
          metadata: { ip, device_id },
        })
        return NextResponse.json(
          { error: 'Missing HMAC signature header' },
          { status: 401 }
        )
      }
      const headerTimestamp = request.headers.get('x-timestamp') || String(timestamp)
      const expectedSig = computeBiometricHmac(rawBody, headerTimestamp, hmacSecret)
      const normalizedActual = signatureHeader.replace(/^sha256=/i, '').trim()
      if (!safeCompareStrings(normalizedActual, expectedSig)) {
        logStructuredSecurityEvent('BIOMETRIC_INVALID_HMAC', {
          route: '/api/attendance/biometric',
          method: 'POST',
          statusCode: 401,
          metadata: { ip, device_id },
        })
        return NextResponse.json(
          { error: 'Invalid biometric HMAC signature' },
          { status: 401 }
        )
      }
    }

    // 4. Replay deduplication check within the 5-minute window
    const replayKey = buildCacheKey('biometric:replay', [
      String(device_id || 'default'),
      String(student_code),
      String(timestamp),
    ])
    const alreadyProcessed = await getCache<boolean>(replayKey)
    if (alreadyProcessed) {
      return NextResponse.json(
        { error: 'Duplicate biometric event replay detected' },
        { status: 409 }
      )
    }
    await setCache(replayKey, true, 300)

    // 5. Initialize Supabase Service Role Client (bypasses RLS for webhook)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase Service Role Key' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 6. Lookup Student by student_id or admission_number
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class_id, grade_level, section')
      .or(`student_id.eq.${student_code},admission_number.eq.${student_code}`)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: `Student not found for code: ${student_code}` },
        { status: 404 }
      )
    }

    // 7. Determine Class ID if not directly linked on student
    let classId = student.class_id
    if (!classId) {
      const { data: classObj } = await supabase
        .from('classes')
        .select('id')
        .eq('name', student.grade_level)
        .eq('section', student.section || 'A')
        .single()

      if (classObj) {
        classId = classObj.id
      } else {
        return NextResponse.json(
          { error: `Could not resolve class for student ${student_code}` },
          { status: 400 }
        )
      }
    }

    // 8. Calculate Attendance Status based on Time of Day (8:00 AM cutoff)
    const punchTime = new Date(timestamp)
    const punchDate = punchTime.toISOString().split('T')[0]
    const hours = punchTime.getHours()
    const minutes = punchTime.getMinutes()

    let status = 'Present'
    if (hours > 8 || (hours === 8 && minutes > 0)) {
      status = 'Late'
    }

    // 9. Upsert Attendance Record
    const { error: attendanceError } = await supabase.from('attendance').upsert(
      {
        student_id: student.id,
        class_id: classId,
        date: punchDate,
        status,
        remarks: `Biometric Check-in (${punchTime.toLocaleTimeString()}) via Device ${device_id || 'Unknown'}`,
      },
      {
        onConflict: 'student_id,class_id,date',
      }
    )

    if (attendanceError) {
      throw attendanceError
    }

    return NextResponse.json({
      success: true,
      message: `Attendance recorded as ${status} for ${student_code} on ${punchDate}`,
    })
  } catch (err: any) {
    if (err?.code === 'RATE_LIMITED' || err?.status === 429) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
