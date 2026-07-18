import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const isStaff = userRoles.includes('System Admin') ||
                    userRoles.includes('Principal') ||
                    userRoles.includes('Dean') ||
                    userRoles.includes('HOS') ||
                    userRoles.includes('Teacher')

    if (!isStaff) {
      return NextResponse.json({ error: 'Unauthorized Staff Access' }, { status: 403 })
    }

    // 2. Parse Form Data
    const formData = await request.formData()
    const student_id = formData.get('student_id') as string // Student UUID
    const file = formData.get('photo') as File | null

    if (!student_id || !file) {
      return NextResponse.json({ error: 'Missing student_id or photo file' }, { status: 400 })
    }

    // 3. Verify Teacher assignment if Teacher
    if (userRoles.includes('Teacher') && !userRoles.includes('System Admin') && !userRoles.includes('Principal') && !userRoles.includes('Dean') && !userRoles.includes('HOS')) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('class_id, grade_level, section')
        .eq('id', student_id)
        .single()

      let assigned = false
      if (studentRecord) {
        if (studentRecord.class_id) {
          const { data: assignment } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', studentRecord.class_id)
            .eq('teacher_id', user.id)
            .limit(1)
            .maybeSingle()
          if (assignment) assigned = true
        } else {
          const { data: fallbackClass } = await supabase
            .from('classes')
            .select('id')
            .eq('name', studentRecord.grade_level)
            .eq('section', studentRecord.section || null)
            .maybeSingle()
          if (fallbackClass) {
            const { data: assignment } = await supabase
              .from('class_subjects')
              .select('id')
              .eq('class_id', fallbackClass.id)
              .eq('teacher_id', user.id)
              .limit(1)
              .maybeSingle()
            if (assignment) assigned = true
          }
        }
      }

      if (!assigned) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this student\'s class' }, { status: 403 })
      }
    }

    // 4. Validate File
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds the 5MB limit.' }, { status: 400 })
    }

    // 5. Upload file using Service Client
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'png'
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileName = `${student_id}/${Date.now()}-${randomSuffix}.${ext}`

    const supabaseService = createServiceClient()
    
    // Attempt upload to student-photos bucket
    let { data: uploadData, error: uploadError } = await supabaseService.storage
      .from('student-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    let publicUrl = ''
    let bucketName = 'student-photos'
    let finalPath = fileName

    if (uploadError) {
      console.error('Error uploading to student-photos, trying logos fallback:', uploadError.message)
      // Fallback: try logos bucket with student-photos/ prefix
      const fallbackPath = `student-photos/${fileName}`
      const { data: fallbackData, error: fallbackError } = await supabaseService.storage
        .from('logos')
        .upload(fallbackPath, buffer, {
          contentType: file.type,
          upsert: true
        })

      if (fallbackError) {
        return NextResponse.json({ error: `Storage upload failed: ${fallbackError.message}` }, { status: 500 })
      }
      bucketName = 'logos'
      finalPath = fallbackPath
    }

    // Get Public URL
    const { data: urlData } = supabaseService.storage
      .from(bucketName)
      .getPublicUrl(finalPath)

    publicUrl = urlData.publicUrl

    // 6. Update student photo_url in database
    const { error: dbError } = await supabaseService
      .from('students')
      .update({ photo_url: publicUrl })
      .eq('id', student_id)

    if (dbError) {
      return NextResponse.json({ error: `Failed to update student profile: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, photo_url: publicUrl })
  } catch (error: any) {
    console.error('Photo API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')

    if (!student_id) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const isStaff = userRoles.includes('System Admin') ||
                    userRoles.includes('Principal') ||
                    userRoles.includes('Dean') ||
                    userRoles.includes('HOS') ||
                    userRoles.includes('Teacher')

    if (!isStaff) {
      return NextResponse.json({ error: 'Unauthorized Staff Access' }, { status: 403 })
    }

    // 2. Verify Teacher assignment
    if (userRoles.includes('Teacher') && !userRoles.includes('System Admin') && !userRoles.includes('Principal') && !userRoles.includes('Dean') && !userRoles.includes('HOS')) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('class_id, grade_level, section')
        .eq('id', student_id)
        .single()

      let assigned = false
      if (studentRecord) {
        if (studentRecord.class_id) {
          const { data: assignment } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', studentRecord.class_id)
            .eq('teacher_id', user.id)
            .limit(1)
            .maybeSingle()
          if (assignment) assigned = true
        } else {
          const { data: fallbackClass } = await supabase
            .from('classes')
            .select('id')
            .eq('name', studentRecord.grade_level)
            .eq('section', studentRecord.section || null)
            .maybeSingle()
          if (fallbackClass) {
            const { data: assignment } = await supabase
              .from('class_subjects')
              .select('id')
              .eq('class_id', fallbackClass.id)
              .eq('teacher_id', user.id)
              .limit(1)
              .maybeSingle()
            if (assignment) assigned = true
          }
        }
      }

      if (!assigned) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this student\'s class' }, { status: 403 })
      }
    }

    // 3. Clear database photo_url
    const supabaseService = createServiceClient()
    const { error: dbError } = await supabaseService
      .from('students')
      .update({ photo_url: null })
      .eq('id', student_id)

    if (dbError) {
      return NextResponse.json({ error: `Failed to update student profile: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Photo DELETE API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
