import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

// GET: returns the public image URL or checking existence
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const formData = await request.formData()
    const file = formData.get('photo') as File
    const student_id = formData.get('student_id') as string

    if (!file || !student_id) {
      return NextResponse.json({ error: 'Missing photo file or student_id' }, { status: 400 })
    }

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    // Check MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file format. Only JPEG, PNG, and WebP are allowed' }, { status: 400 })
    }

    const supabaseService = createServiceClient()

    // Remove any existing photos in student's directory
    const { data: existingFiles } = await supabaseService.storage
      .from('student-photos')
      .list(student_id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(f => `${student_id}/${f.name}`)
      await supabaseService.storage.from('student-photos').remove(filesToRemove)
    }

    // Save new file with timestamped name
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${student_id}/avatar_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseService.storage
      .from('student-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabaseService.storage
      .from('student-photos')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      photo_url: urlData.publicUrl
    })
  } catch (error: any) {
    console.error('Photo upload handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
