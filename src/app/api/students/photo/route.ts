import { NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { route, ok } from '@/lib/api/handler'
import { STAFF_ROLES, MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertStudentInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    if (!student_id) {
      throw badRequest({ student_id: 'Missing student_id' })
    }

    await assertStudentInScope(user, student_id)

    const supabaseService = createServiceClient()
    const { data: files } = await supabaseService.storage.from('student-photos').list(student_id)

    const exists = Boolean(files && files.length > 0)
    if (searchParams.get('json') === 'true') {
      return ok(
        {
          exists,
          photo_url: exists ? `/api/students/photo?student_id=${student_id}` : null,
        },
        { requestId }
      )
    }

    if (exists && files && files.length > 0) {
      const latestFile = files[0]
      const { data: urlData } = supabaseService.storage
        .from('student-photos')
        .getPublicUrl(`${student_id}/${latestFile.name}`)
      return NextResponse.redirect(urlData.publicUrl)
    }

    throw new ApiError('NOT_FOUND', 'No photo found for student')
  },
  { roles: STAFF_ROLES }
)

export const POST = route(
  async ({ user, req, requestId }) => {
    const formData = await req.formData()
    const file = formData.get('photo') as File | null
    const student_id = formData.get('student_id') as string | null

    if (!file || !student_id) {
      throw badRequest({ fields: 'Missing photo file or student_id' })
    }

    await assertStudentInScope(user, student_id)

    if (file.size > 5 * 1024 * 1024) {
      throw badRequest({ file: 'File size exceeds 5MB limit' })
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type)) {
      throw badRequest({ file: 'Invalid file format. Only JPEG, PNG, and WebP are allowed' })
    }

    const supabaseService = createServiceClient()

    const { data: existingFiles } = await supabaseService.storage.from('student-photos').list(student_id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((f) => `${student_id}/${f.name}`)
      await supabaseService.storage.from('student-photos').remove(filesToRemove)
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${student_id}/avatar_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseService.storage.from('student-photos').upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (uploadError) {
      throw new ApiError('INTERNAL', 'Failed to upload student photo')
    }

    const {
      data: { publicUrl },
    } = supabaseService.storage.from('student-photos').getPublicUrl(fileName)

    // Sync student_photos table if present
    try {
      await supabaseService.from('student_photos').upsert(
        {
          student_id,
          photo_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )
    } catch {
      // Non-fatal
    }

    return ok({ photo_url: publicUrl }, { requestId }, 201)
  },
  {
    roles: [...MANAGEMENT_ROLES, 'Teacher'],
    rateLimit: { key: 'photo-upload', max: 20, windowMs: 3600_000 },
  }
)

export const DELETE = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    if (!student_id) {
      throw badRequest({ student_id: 'Missing student_id' })
    }

    await assertStudentInScope(user, student_id)

    const supabaseService = createServiceClient()
    const { data: existingFiles } = await supabaseService.storage.from('student-photos').list(student_id)

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((f) => `${student_id}/${f.name}`)
      await supabaseService.storage.from('student-photos').remove(filesToRemove)
    }

    await supabaseService.from('student_photos').delete().eq('student_id', student_id)

    return ok({ success: true }, { requestId })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
