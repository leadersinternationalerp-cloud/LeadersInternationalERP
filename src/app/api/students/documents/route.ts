import { createServiceClient } from '@/utils/supabase/service'
import { route, ok } from '@/lib/api/handler'
import { STAFF_ROLES, MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertStudentInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

const BUCKET_NAME = 'student-documents'

async function ensureDocumentsBucket(supabaseService: ReturnType<typeof createServiceClient>) {
  try {
    const { data: bucket } = await supabaseService.storage.getBucket(BUCKET_NAME)
    if (!bucket) {
      await supabaseService.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      })
    }
  } catch {
    // Ignore if bucket already exists
  }
}

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    if (!student_id) {
      throw badRequest({ student_id: 'Missing student_id' })
    }

    await assertStudentInScope(user, student_id)

    const supabaseService = createServiceClient()
    await ensureDocumentsBucket(supabaseService)

    const { data: files, error } = await supabaseService.storage.from(BUCKET_NAME).list(student_id, {
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      return ok({ documents: [] }, { requestId })
    }

    const documents = (files || [])
      .filter((f) => f.name && f.name !== '.emptyFolderPlaceholder')
      .map((f) => {
        const { data: urlData } = supabaseService.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${student_id}/${f.name}`)

        // Parse optional label prefix: timestamp__label__filename
        const parts = f.name.split('__')
        const label = parts.length >= 3 ? parts[1].replace(/_/g, ' ') : 'Admission Document'
        const displayName = parts.length >= 3 ? parts.slice(2).join('__') : f.name

        return {
          name: displayName,
          path: `${student_id}/${f.name}`,
          label,
          url: urlData.publicUrl,
          created_at: f.created_at || new Date().toISOString(),
          size: f.metadata?.size || 0,
        }
      })

    return ok({ documents }, { requestId })
  },
  { roles: STAFF_ROLES }
)

export const POST = route(
  async ({ user, req, requestId }) => {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const student_id = formData.get('student_id') as string | null
    const rawLabel = (formData.get('label') as string | null) || 'Supporting Document'

    if (!file || !student_id) {
      throw badRequest({ fields: 'Missing document file or student_id' })
    }

    await assertStudentInScope(user, student_id)

    if (file.size > 10 * 1024 * 1024) {
      throw badRequest({ file: 'Document size exceeds 10MB limit' })
    }

    const supabaseService = createServiceClient()
    await ensureDocumentsBucket(supabaseService)

    const safeLabel = rawLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${student_id}/${Date.now()}__${safeLabel}__${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseService.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      throw new ApiError('INTERNAL', `Failed to upload student document: ${uploadError.message}`)
    }

    const {
      data: { publicUrl },
    } = supabaseService.storage.from(BUCKET_NAME).getPublicUrl(storagePath)

    const docEntry = {
      name: file.name,
      path: storagePath,
      label: rawLabel,
      url: publicUrl,
      uploaded_at: new Date().toISOString(),
      size: file.size,
    }

    // Best-effort sync to students.documents JSONB column if present
    try {
      const { data: st } = await supabaseService
        .from('students')
        .select('documents')
        .eq('id', student_id)
        .maybeSingle()
      const existingDocs = Array.isArray(st?.documents) ? st.documents : []
      await supabaseService
        .from('students')
        .update({ documents: [...existingDocs, docEntry] })
        .eq('id', student_id)
    } catch {
      // Non-fatal if column not yet migrated
    }

    return ok({ document: docEntry }, { requestId }, 201)
  },
  {
    roles: [...MANAGEMENT_ROLES, 'Teacher', 'Receptionist'],
    rateLimit: { key: 'doc-upload', max: 40, windowMs: 3600_000 },
  }
)

export const DELETE = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const student_id = searchParams.get('student_id')
    const path = searchParams.get('path')

    if (!student_id || !path || !path.startsWith(`${student_id}/`)) {
      throw badRequest({ path: 'Invalid student_id or document path' })
    }

    await assertStudentInScope(user, student_id)

    const supabaseService = createServiceClient()
    await supabaseService.storage.from(BUCKET_NAME).remove([path])

    try {
      const { data: st } = await supabaseService
        .from('students')
        .select('documents')
        .eq('id', student_id)
        .maybeSingle()
      if (Array.isArray(st?.documents)) {
        const nextDocs = st.documents.filter((d: any) => d.path !== path)
        await supabaseService.from('students').update({ documents: nextDocs }).eq('id', student_id)
      }
    } catch {
      // Non-fatal
    }

    return ok({ success: true }, { requestId })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher', 'Receptionist'] }
)
