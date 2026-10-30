import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { parseTimetableConfig } from '@/lib/timetableAiParser'
import { route, ok, parseJson, apiHeaders } from '@/lib/api/handler'
import { ROLES, MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const class_id = searchParams.get('class_id')

    const supabase = await createClient()

    let query = supabase
      .from('timetable_slots')
      .select('*')
      .order('period_number', { ascending: true })
      .order('start_time', { ascending: true })

    if (class_id) {
      query = query.eq('class_id', class_id)
    } else {
      query = query.is('class_id', null)
    }

    const { data: slots, error } = await query

    if (error) {
      throw new ApiError('INTERNAL', 'Failed to fetch timetable slots')
    }

    let finalSlots = slots || []
    if (finalSlots.length === 0) {
      if (class_id) {
        const { data: globalSlots } = await supabase
          .from('timetable_slots')
          .select('*')
          .is('class_id', null)
          .order('period_number', { ascending: true })
          .order('start_time', { ascending: true })
        finalSlots = globalSlots || []
      }

      if (finalSlots.length === 0) {
        const { data: anySlots } = await supabase
          .from('timetable_slots')
          .select('*')
          .order('period_number', { ascending: true })
          .order('start_time', { ascending: true })

        if (anySlots && anySlots.length > 0) {
          const firstClassId = anySlots[0].class_id
          finalSlots = anySlots.filter((s: { class_id?: string }) => s.class_id === firstClassId)
        }
      }
    }

    return NextResponse.json(
      {
        data: finalSlots,
        slots: finalSlots,
        meta: { requestId },
      },
      {
        status: 200,
        headers: apiHeaders(requestId),
      }
    )
  },
  { roles: ROLES }
)

export const POST = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const body = await parseJson<{
      class_id?: string
      text?: string
      slots?: Array<{
        period_number: number
        name: string
        start_time: string
        end_time: string
        is_break?: boolean
      }>
      total_periods?: number
    }>(req)

    const { class_id, text, slots: manualSlots, total_periods } = body

    let finalSlots: Array<{
      period_number: number
      name: string
      start_time: string
      end_time: string
      is_break?: boolean
    }> = []

    if (text) {
      finalSlots = parseTimetableConfig(text, total_periods || 8)
    } else if (manualSlots && Array.isArray(manualSlots)) {
      finalSlots = manualSlots
    } else {
      throw badRequest({ fields: 'Missing config text or slots array' })
    }

    if (class_id) {
      await supabase.from('timetable_slots').delete().eq('class_id', class_id)
    } else {
      await supabase.from('timetable_slots').delete().is('class_id', null)
    }

    const slotsToInsert = finalSlots.map((s) => ({
      class_id: class_id || null,
      period_number: s.period_number,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      is_break: s.is_break,
    }))

    const { data: insertedSlots, error: insertError } = await supabase
      .from('timetable_slots')
      .insert(slotsToInsert)
      .select()

    if (insertError) {
      throw new ApiError('INTERNAL', 'Failed to save timetable slots')
    }

    return ok({ slots: insertedSlots }, { requestId }, 201)
  },
  { roles: MANAGEMENT_ROLES }
)
