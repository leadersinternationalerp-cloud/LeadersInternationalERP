import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // We use the Service Role key to bypass RLS since this is a server-to-server call from the biometric device
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Expected payload from biometric device
    const body = await request.json()
    const { biometric_id, timestamp, device_id } = body

    if (!biometric_id || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields: biometric_id, timestamp' }, { status: 400 })
    }

    // 1. Get the student's ID and class
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, class_id')
      .eq('biometric_id', biometric_id)
      .single()

    if (studentError || !studentData?.class_id) {
      return NextResponse.json({ error: 'Student not found or not assigned to a class' }, { status: 404 })
    }

    const date = new Date(timestamp).toISOString().split('T')[0] // Get YYYY-MM-DD

    // 2. Insert or update the attendance record (upsert)
    const { data: attendanceData, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .upsert({
        student_id: studentData.id,
        class_id: studentData.class_id,
        date,
        status: 'Present', // Biometric scan implies Present
        // Optionally store device_id in a metadata column or notes
      }, {
        onConflict: 'student_id, class_id, date'
      })
      .select()

    if (attendanceError) {
      throw attendanceError
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attendance recorded successfully via biometric device',
      data: attendanceData 
    })

  } catch (error: any) {
    console.error('Biometric API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
