import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

// GET: returns the public image URL or checking existence
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    if (!student_id) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 })
    }

    const supabaseService = createServiceClient()
    const { data: files } = await supabaseService.storage
      .from('student-photos')
      .list(student_id)

    const exists = files && files.length > 0
    if (searchParams.get('json') === 'true') {
      return NextResponse.json({
        exists,
        photo_url: exists ? `/api/students/photo?student_id=${student_id}` : null
      })
    }

    if (exists) {
      const latestFile = files[0]
      const { data: urlData } = supabaseService.storage
        .from('student-photos')
        .getPublicUrl(`${student_id}/${latestFile.name}`)
      return NextResponse.redirect(urlData.publicUrl)
    }

    return new NextResponse('No Photo Found', { status: 404 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: uploads a photo file to storage
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

    const supabaseService = createServiceClient()

    // 5. Delete existing files for this student first to save space
    const { data: existingFiles } = await supabaseService.storage
      .from('student-photos')
      .list(student_id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${student_id}/${f.name}`)
      await supabaseService.storage
        .from('student-photos')
        .remove(filesToDelete)
    }

    // 6. Upload new file
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'png'
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileName = `${student_id}/${Date.now()}-${randomSuffix}.${ext}`

    const { error: uploadError } = await supabaseService.storage
      .from('student-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const publicUrl = `/api/students/photo?student_id=${student_id}&t=${Date.now()}`

    return NextResponse.json({ success: true, photo_url: publicUrl })
  } catch (error: any) {
    console.error('Photo API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE: clears all photo files in the student's subfolder from storage
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

    // 2. Delete files from storage
    const supabaseService = createServiceClient()
    const { data: files } = await supabaseService.storage
      .from('student-photos')
      .list(student_id)

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${student_id}/${f.name}`)
      await supabaseService.storage
        .from('student-photos')
        .remove(filesToDelete)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Photo DELETE API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
