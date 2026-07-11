'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type CalendarEventState = {
  success?: boolean
  error?: string | null
}

export async function saveCalendarEventAction(
  prevState: CalendarEventState,
  formData: FormData
): Promise<CalendarEventState> {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: 'You must be logged in to create calendar events.' }
    }

    // 2. Fetch profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { error: 'Failed to retrieve user profile.' }
    }

    const allowedRoles = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section']
    if (!allowedRoles.includes(profile.role)) {
      return { error: 'Access Denied: You do not have permission to create calendar events.' }
    }

    // 3. Extract and validate fields
    const title = formData.get('title') as string
    const event_type = formData.get('event_type') as string
    const start_date_str = formData.get('start_date') as string
    const end_date_str = formData.get('end_date') as string
    const description = formData.get('description') as string
    const target_audience = formData.get('target_audience') as string
    const audience_ids = formData.getAll('audience_ids') as string[]

    if (!title || !event_type || !start_date_str || !end_date_str || !description || !target_audience) {
      return { error: 'All fields (except attachment) are required.' }
    }

    const allowedEventTypes = ['Public Holiday', 'Exams', 'School Activity', 'Staff Meeting', 'Other']
    if (!allowedEventTypes.includes(event_type)) {
      return { error: `Invalid event type: ${event_type}` }
    }

    const allowedAudiences = ['All School', 'Section', 'Class']
    if (!allowedAudiences.includes(target_audience)) {
      return { error: `Invalid target audience: ${target_audience}` }
    }

    const start_date = new Date(start_date_str)
    const end_date = new Date(end_date_str)

    if (isNaN(start_date.getTime()) || isNaN(end_date.getTime())) {
      return { error: 'Invalid date formats.' }
    }

    if (end_date < start_date) {
      return { error: 'End date cannot be earlier than start date.' }
    }

    // Determine final audience_ids array
    let finalAudienceIds: string[] = []
    if (target_audience !== 'All School') {
      if (!audience_ids || audience_ids.length === 0) {
        return { error: `Please select at least one ${target_audience.toLowerCase()} for the audience.` }
      }
      finalAudienceIds = audience_ids
    }

    // Optional attachment_url
    const attachment_url = (formData.get('attachment_url') as string) || null

    // 4. Insert into public.calendar_events table
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        title,
        event_type,
        start_date: start_date.toISOString(),
        end_date: end_date.toISOString(),
        description,
        target_audience,
        audience_ids: finalAudienceIds,
        attachment_url,
        created_by: user.id
      })

    if (insertError) {
      throw insertError
    }

    revalidatePath('/dashboard/calendar')
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error inserting calendar event:', error)
    return { error: error.message || 'An unexpected error occurred while saving the event.' }
  }
}
