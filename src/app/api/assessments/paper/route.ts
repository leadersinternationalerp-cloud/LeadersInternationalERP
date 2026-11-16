import { route, ok } from '@/lib/api/handler'
import { badRequest } from '@/lib/api/errors'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'

const BUCKET_NAME = 'assessment-papers'
const ALLOWED_ROLES = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Teacher'] as const

export const GET = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const classId = searchParams.get('class_id')
    const subjectId = searchParams.get('subject_id')
    const assessmentType = searchParams.get('assessment_type')
    const term = searchParams.get('term')

    if (!classId || !subjectId || !assessmentType || !term) {
      throw badRequest('Missing required query parameters: class_id, subject_id, assessment_type, term')
    }

    const { data, error } = await supabase
      .from('assessment_papers')
      .select('id, file_url, file_name, updated_at')
      .eq('class_id', classId)
      .eq('subject_id', subjectId)
      .eq('assessment_type', assessmentType)
      .eq('term', term)
      .maybeSingle()

    if (error) {
      return ok({ paper: null }, { requestId })
    }

    return ok({ paper: data }, { requestId })
  },
  { roles: ALLOWED_ROLES }
)

export const POST = route(
  async ({ req, user, requestId }) => {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const classId = formData.get('class_id') as string
    const subjectId = formData.get('subject_id') as string
    const assessmentType = formData.get('assessment_type') as string
    const term = formData.get('term') as string

    if (!file || !classId || !subjectId || !assessmentType || !term) {
      throw badRequest('Missing file or assessment metadata')
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw badRequest('Only PDF files are supported for assessment papers')
    }

    if (file.size > 15 * 1024 * 1024) {
      throw badRequest('PDF file size must be 15MB or less')
    }

    const serviceClient = createServiceClient()

    // Ensure bucket exists
    const { data: buckets } = await serviceClient.storage.listBuckets()
    if (!buckets?.some(b => b.name === BUCKET_NAME)) {
      await serviceClient.storage.createBucket(BUCKET_NAME, { public: true })
    }

    const safeType = assessmentType.replace(/[^a-zA-Z0-9_-]/g, '_')
    const safeTerm = term.replace(/[^a-zA-Z0-9_-]/g, '_')
    const storagePath = `${classId}/${subjectId}/${safeTerm}_${safeType}_${Date.now()}.pdf`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await serviceClient.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) {
      throw badRequest(`Upload failed: ${uploadErr.message}`)
    }

    const { data: urlData } = serviceClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    const { data: record, error: dbErr } = await serviceClient
      .from('assessment_papers')
      .upsert(
        {
          class_id: classId,
          subject_id: subjectId,
          assessment_type: assessmentType,
          term,
          file_url: urlData.publicUrl,
          file_name: file.name,
          uploaded_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'class_id,subject_id,assessment_type,term' }
      )
      .select('id, file_url, file_name, updated_at')
      .single()

    if (dbErr) {
      throw badRequest(`Failed to save paper record: ${dbErr.message}`)
    }

    return ok({ paper: record }, { requestId }, 201)
  },
  { roles: ALLOWED_ROLES }
)
