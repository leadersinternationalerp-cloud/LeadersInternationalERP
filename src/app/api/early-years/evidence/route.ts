import { createServiceClient } from '@/utils/supabase/service'
import { route, ok } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertStudentInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const POST = route(
  async ({ user, req, requestId }) => {
    const formData = await req.formData()
    const file = formData.get('evidence') as File | null
    const studentId = formData.get('student_id') as string | null
    const learningArea = formData.get('learning_area') as string | null

    if (!file || !studentId || !learningArea) {
      throw badRequest({
        fields: 'Missing required parameters: evidence file, student_id, and learning_area are required',
      })
    }

    await assertStudentInScope(user, studentId)

    if (!file.type.startsWith('image/')) {
      throw badRequest({ file: 'Invalid file type. Only images are allowed.' })
    }

    const maxSizeBytes = 8 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      throw badRequest({ file: 'File size exceeds maximum limit of 8MB.' })
    }

    const supabaseService = createServiceClient()
    const cleanArea = learningArea.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${studentId}/${cleanArea}_${Date.now()}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseService.storage
      .from('ey-evidence')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      throw new ApiError('INTERNAL', 'Failed to upload evidence file')
    }

    const {
      data: { publicUrl },
    } = supabaseService.storage.from('ey-evidence').getPublicUrl(fileName)

    return ok({ url: publicUrl }, { requestId })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
