import crypto from 'crypto'
import type { UserWingAssignment } from '@/lib/wing'

export type BackgroundJobType =
  | 'REPORT_CARD_BATCH_PDF'
  | 'BULK_INVOICE_GENERATION'
  | 'BULK_NOTIFICATION_DISPATCH'

export type BackgroundJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface BackgroundJobRecord<TPayload = Record<string, any>, TResult = Record<string, any>> {
  id: string
  jobType: BackgroundJobType
  status: BackgroundJobStatus
  idempotencyKey: string | null
  createdBy: string
  wing: UserWingAssignment
  payload: TPayload
  progress: number
  totalItems: number
  processedItems: number
  resultMeta: TResult | null
  artifactBuffer?: Buffer
  artifactMimeType?: string
  artifactFilename?: string
  errorMessage: string | null
  attempts: number
  maxAttempts: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export interface JobProgressUpdater {
  updateProgress: (processedItems: number, totalItems: number) => Promise<void>
}

export type JobWorkerHandler<TPayload = any, TResult = any> = (
  job: BackgroundJobRecord<TPayload, TResult>,
  helpers: JobProgressUpdater
) => Promise<{
  resultMeta?: TResult
  artifactBuffer?: Buffer
  artifactMimeType?: string
  artifactFilename?: string
}>

const MAX_IN_MEMORY_JOBS = 250
const JOB_RETENTION_MS = 30 * 60 * 1000 // 30 minutes retention in memory

const jobStore = new Map<string, BackgroundJobRecord>()
const idempotencyIndex = new Map<string, string>()
const workerRegistry = new Map<BackgroundJobType, JobWorkerHandler>()

function evictExpiredJobs() {
  const now = Date.now()
  for (const [id, job] of jobStore.entries()) {
    const updatedMs = new Date(job.updatedAt).getTime()
    if (now - updatedMs > JOB_RETENTION_MS && (job.status === 'completed' || job.status === 'failed')) {
      jobStore.delete(id)
      if (job.idempotencyKey) {
        idempotencyIndex.delete(job.idempotencyKey)
      }
    }
  }
  while (jobStore.size > MAX_IN_MEMORY_JOBS) {
    const oldestKey = jobStore.keys().next().value
    if (!oldestKey) break
    const oldest = jobStore.get(oldestKey)
    if (oldest?.idempotencyKey) {
      idempotencyIndex.delete(oldest.idempotencyKey)
    }
    jobStore.delete(oldestKey)
  }
}

export function registerJobWorker<TPayload = any, TResult = any>(
  jobType: BackgroundJobType,
  handler: JobWorkerHandler<TPayload, TResult>
) {
  workerRegistry.set(jobType, handler)
}

export interface EnqueueJobOptions<TPayload = Record<string, any>> {
  jobType: BackgroundJobType
  createdBy: string
  wing?: UserWingAssignment
  payload: TPayload
  totalItems?: number
  idempotencyKey?: string
  maxAttempts?: number
  retryBaseDelayMs?: number
}

/**
 * Enqueues a background job and schedules non-blocking execution on the event loop.
 * Deduplicates active or completed jobs sharing the same idempotencyKey.
 */
export async function enqueueBackgroundJob<TPayload = Record<string, any>>(
  options: EnqueueJobOptions<TPayload>
): Promise<BackgroundJobRecord<TPayload>> {
  evictExpiredJobs()

  const scopedIdempotencyKey = options.idempotencyKey
    ? `${options.createdBy}:${options.jobType}:${options.idempotencyKey}`
    : null

  if (scopedIdempotencyKey) {
    const existingId = idempotencyIndex.get(scopedIdempotencyKey)
    if (existingId) {
      const existingJob = jobStore.get(existingId)
      if (existingJob && existingJob.status !== 'failed') {
        return serializeJob(existingJob) as BackgroundJobRecord<TPayload>
      }
    }
  }

  const nowIso = new Date().toISOString()
  const job: BackgroundJobRecord<TPayload> = {
    id: crypto.randomUUID(),
    jobType: options.jobType,
    status: 'queued',
    idempotencyKey: scopedIdempotencyKey,
    createdBy: options.createdBy,
    wing: options.wing || 'Both',
    payload: options.payload,
    progress: 0,
    totalItems: Math.max(0, options.totalItems ?? 0),
    processedItems: 0,
    resultMeta: null,
    errorMessage: null,
    attempts: 0,
    maxAttempts: Math.max(1, options.maxAttempts ?? 3),
    createdAt: nowIso,
    startedAt: null,
    completedAt: null,
    updatedAt: nowIso,
  }

  jobStore.set(job.id, job as BackgroundJobRecord<any, any>)
  if (scopedIdempotencyKey) {
    idempotencyIndex.set(scopedIdempotencyKey, job.id)
  }

  const retryBaseDelayMs = options.retryBaseDelayMs ?? 150
  setImmediate(() => {
    void executeJobWithRetries(job.id, retryBaseDelayMs)
  })

  return serializeJob(job as BackgroundJobRecord<any, any>) as BackgroundJobRecord<TPayload>
}

async function executeJobWithRetries(jobId: string, retryBaseDelayMs: number) {
  const job = jobStore.get(jobId)
  if (!job) return

  const worker = workerRegistry.get(job.jobType)
  if (!worker) {
    job.status = 'failed'
    job.errorMessage = `No worker registered for job type: ${job.jobType}`
    job.completedAt = new Date().toISOString()
    job.updatedAt = job.completedAt
    return
  }

  job.status = 'processing'
  job.startedAt = new Date().toISOString()
  job.updatedAt = job.startedAt

  const helpers: JobProgressUpdater = {
    updateProgress: async (processedItems: number, totalItems: number) => {
      job.processedItems = Math.max(0, processedItems)
      job.totalItems = Math.max(job.processedItems, totalItems)
      job.progress =
        job.totalItems > 0
          ? Math.min(99, Math.round((job.processedItems / job.totalItems) * 100))
          : 50
      job.updatedAt = new Date().toISOString()
    },
  }

  while (job.attempts < job.maxAttempts) {
    job.attempts += 1
    job.updatedAt = new Date().toISOString()
    try {
      const outcome = await worker(job, helpers)
      job.status = 'completed'
      job.progress = 100
      job.processedItems = job.totalItems
      job.resultMeta = outcome?.resultMeta ?? null
      if (outcome?.artifactBuffer) {
        job.artifactBuffer = outcome.artifactBuffer
        job.artifactMimeType = outcome.artifactMimeType || 'application/octet-stream'
        job.artifactFilename = outcome.artifactFilename || `job-${job.id}.bin`
      }
      job.errorMessage = null
      job.completedAt = new Date().toISOString()
      job.updatedAt = job.completedAt
      return
    } catch (err: any) {
      const message = err?.message || String(err)
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed'
        job.errorMessage = message
        job.completedAt = new Date().toISOString()
        job.updatedAt = job.completedAt
        return
      }
      const backoffMs = retryBaseDelayMs * Math.pow(2, job.attempts - 1)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }
}

function serializeJob(job: BackgroundJobRecord, includeArtifact = false): BackgroundJobRecord {
  const { artifactBuffer, ...rest } = job
  if (includeArtifact && artifactBuffer) {
    return { ...rest, artifactBuffer }
  }
  return { ...rest }
}

/**
 * Retrieves a background job after enforcing user ownership and wing isolation.
 */
export function getBackgroundJobForUser(
  jobId: string,
  user: { id: string; roles?: string[]; wing?: UserWingAssignment },
  includeArtifact = false
): BackgroundJobRecord | null {
  const job = jobStore.get(jobId)
  if (!job) return null

  const roles = user.roles || []
  const isCrossWingAdmin = roles.some((r) =>
    ['System Admin', 'Director', 'Principal'].includes(r)
  )

  if (job.createdBy !== user.id && !isCrossWingAdmin) {
    return null
  }

  // Enforce wing isolation if caller is bound to a single wing
  if (user.wing && user.wing !== 'Both' && job.wing !== 'Both' && job.wing !== user.wing) {
    return null
  }

  return serializeJob(job, includeArtifact)
}

export function listBackgroundJobsForUser(user: {
  id: string
  roles?: string[]
  wing?: UserWingAssignment
}): BackgroundJobRecord[] {
  evictExpiredJobs()
  const results: BackgroundJobRecord[] = []
  for (const job of jobStore.values()) {
    const allowed = getBackgroundJobForUser(job.id, user, false)
    if (allowed) {
      results.push(allowed)
    }
  }
  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function resetJobQueueForTests() {
  jobStore.clear()
  idempotencyIndex.clear()
}
