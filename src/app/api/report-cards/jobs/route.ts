import { NextResponse } from 'next/server'
import { route } from '@/lib/api/handler'
import { badRequest, forbidden, notFound } from '@/lib/api/errors'
import { assertStudentInScope } from '@/lib/api/scope'
import {
  enqueueBackgroundJob,
  getBackgroundJobForUser,
  listBackgroundJobsForUser,
  registerJobWorker,
} from '@/lib/jobs/queue'
import { generateBatchReportCardPdfBuffer } from '@/lib/reportCardBatchBuilder'
import { createServiceClient } from '@/utils/supabase/service'

interface ReportCardBatchJobPayload {
  studentIds: string[]
  termId: string
  showRank: boolean
  assessments: string | null
}

// Register the async worker for REPORT_CARD_BATCH_PDF
registerJobWorker<ReportCardBatchJobPayload>(
  'REPORT_CARD_BATCH_PDF',
  async (job, helpers) => {
    const supabase = createServiceClient()
    const { pdfBuffer, filename, studentCount, termName } =
      await generateBatchReportCardPdfBuffer({
        supabase,
        studentIds: job.payload.studentIds,
        termId: job.payload.termId,
        showRank: job.payload.showRank,
        assessmentsParam: job.payload.assessments,
        onProgress: async (processed, total) => {
          await helpers.updateProgress(processed, total)
        },
      })

    return {
      resultMeta: {
        filename,
        studentCount,
        termName,
        byteLength: pdfBuffer.byteLength,
      },
      artifactBuffer: pdfBuffer,
      artifactMimeType: 'application/pdf',
      artifactFilename: filename,
    }
  }
)

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const POST = route(
  async ({ user, req }) => {
    let body: any
    try {
      body = await req.json()
    } catch {
      throw badRequest('Invalid JSON payload')
    }

    const rawStudentIds = body.studentIds ?? body.student_id
    const termId = String(body.termId ?? body.term_id ?? '').trim()
    const showRank = Boolean(body.showRank ?? body.show_rank)
    const assessments =
      typeof body.assessments === 'string' ? body.assessments : null

    const studentIds: string[] = Array.isArray(rawStudentIds)
      ? rawStudentIds.map((s) => String(s).trim()).filter(Boolean)
      : typeof rawStudentIds === 'string'
        ? rawStudentIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : []

    if (studentIds.length === 0 || !termId) {
      throw badRequest('studentIds and termId are required')
    }
    if (studentIds.length > 60) {
      throw badRequest('Cannot enqueue more than 60 student report cards in a single batch')
    }
    if (!UUID_REGEX.test(termId) || studentIds.some((id) => !UUID_REGEX.test(id))) {
      throw badRequest('Invalid UUID format for studentIds or termId')
    }

    // Verify caller scope and wing permissions for every requested student before queuing
    for (const sId of studentIds) {
      await assertStudentInScope(user, sId)
    }

    const defaultIdempotencyKey = `${termId}:${showRank}:${assessments || 'default'}:${[...studentIds].sort().join(',')}`
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : defaultIdempotencyKey

    const job = await enqueueBackgroundJob<ReportCardBatchJobPayload>({
      jobType: 'REPORT_CARD_BATCH_PDF',
      createdBy: user.id,
      wing: user.wing,
      totalItems: studentIds.length,
      idempotencyKey,
      payload: {
        studentIds,
        termId,
        showRank,
        assessments,
      },
    })

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        pollUrl: `/api/report-cards/jobs?jobId=${job.id}`,
        downloadUrl: `/api/report-cards/jobs?jobId=${job.id}&download=true`,
      },
      { status: 202 }
    )
  },
  {
    roles: [
      'System Admin',
      'Director',
      'Principal',
      'Dean',
      'Head of Section',
      'Teacher',
      'Student',
      'Parent',
    ],
    rateLimit: { key: 'report-cards-jobs-enqueue', max: 20, windowMs: 60_000 },
  }
)

export const GET = route(
  async ({ user, req }) => {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId') || searchParams.get('id')
    const isDownload = searchParams.get('download') === 'true'

    if (!jobId) {
      const jobs = listBackgroundJobsForUser(user)
      return NextResponse.json({ jobs })
    }

    const job = getBackgroundJobForUser(jobId, user, isDownload)
    if (!job) {
      throw notFound('Background job not found or access denied')
    }

    if (isDownload) {
      if (job.status !== 'completed' || !job.artifactBuffer) {
        throw forbidden('Report card batch PDF is not ready for download yet')
      }
      return new NextResponse(job.artifactBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': job.artifactMimeType || 'application/pdf',
          'Content-Disposition': `attachment; filename="${job.artifactFilename || 'ReportCards_Batch.pdf'}"`,
          'Cache-Control': 'private, no-store, max-age=0',
        },
      })
    }

    return NextResponse.json({
      jobId: job.id,
      jobType: job.jobType,
      status: job.status,
      progress: job.progress,
      processedItems: job.processedItems,
      totalItems: job.totalItems,
      resultMeta: job.resultMeta,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      downloadUrl:
        job.status === 'completed'
          ? `/api/report-cards/jobs?jobId=${job.id}&download=true`
          : null,
    })
  },
  {
    roles: [
      'System Admin',
      'Director',
      'Principal',
      'Dean',
      'Head of Section',
      'Teacher',
      'Student',
      'Parent',
    ],
    rateLimit: { key: 'report-cards-jobs-poll', max: 120, windowMs: 60_000 },
  }
)
