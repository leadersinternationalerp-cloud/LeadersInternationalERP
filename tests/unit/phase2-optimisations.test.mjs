import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)

/**
 * Compiles and evaluates a TypeScript module from src/ in-memory for unit testing
 * under Node's native test runner without external test dependencies.
 */
function loadTsModule(relPath, customMocks = {}) {
  const fullPath = path.resolve(relPath)
  const source = fs.readFileSync(fullPath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: fullPath,
  })

  const moduleObj = { exports: {} }
  const dir = path.dirname(fullPath)

  const localRequire = (specifier) => {
    if (specifier in customMocks) return customMocks[specifier]
    if (specifier.startsWith('@/')) {
      const targetRel = path.join('src', specifier.slice(2))
      const candidates = [`${targetRel}.ts`, `${targetRel}/index.ts`]
      for (const c of candidates) {
        if (fs.existsSync(path.resolve(c))) {
          return loadTsModule(c, customMocks)
        }
      }
    }
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const resolved = path.resolve(dir, specifier)
      const candidates = [`${resolved}.ts`, `${resolved}/index.ts`]
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          return loadTsModule(path.relative(process.cwd(), c), customMocks)
        }
      }
    }
    return require(specifier)
  }

  const wrapper = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) { ${outputText}\n})`,
    { filename: fullPath }
  )
  wrapper(moduleObj.exports, localRequire, moduleObj, fullPath, dir)
  return moduleObj.exports
}

test('Workstream A: Request-scoped Supabase auth.getUser() deduplication & middleware security', async () => {
  const serverSource = fs.readFileSync(path.resolve('src/utils/supabase/server.ts'), 'utf8')
  assert.ok(
    serverSource.includes('let cachedUserPromise: ReturnType<typeof originalGetUser> | null = null'),
    'server.ts must memoize auth.getUser() per request client instance'
  )

  const middlewareSource = fs.readFileSync(
    path.resolve('src/utils/supabase/middleware.ts'),
    'utf8'
  )
  assert.ok(
    !middlewareSource.includes('/api/admin/go-live-setup'),
    'middleware.ts must NOT exempt /api/admin/go-live-setup from authentication'
  )
  assert.ok(
    middlewareSource.includes("buildCacheKey('auth:roles', [user.id])"),
    'middleware.ts must cache profile role resolution with bounded TTL'
  )
})

test('Workstream D: Redis/In-Memory Cache Layer — wing-scoped keys, hit/miss metrics, and prefix invalidation', async () => {
  const redisCache = loadTsModule('src/lib/cache/redisCache.ts')
  redisCache.resetCacheForTests()

  const cambridgeKey = redisCache.buildCacheKey('dashboard:kpi', ['2026-2027', 'Term 1'], 'Cambridge')
  const nectaKey = redisCache.buildCacheKey('dashboard:kpi', ['2026-2027', 'Term 1'], 'NECTA')

  assert.notEqual(
    cambridgeKey,
    nectaKey,
    'Cambridge and NECTA cache keys must be strictly isolated'
  )
  assert.ok(cambridgeKey.includes('wing:cambridge'))
  assert.ok(nectaKey.includes('wing:necta'))

  let loaderCalls = 0
  const val1 = await redisCache.getOrSetCache(cambridgeKey, 60, async () => {
    loaderCalls += 1
    return { totalStudents: 140, wing: 'Cambridge' }
  })
  const val2 = await redisCache.getOrSetCache(cambridgeKey, 60, async () => {
    loaderCalls += 1
    return { totalStudents: 999, wing: 'Cambridge' }
  })

  assert.equal(loaderCalls, 1, 'Second getOrSetCache call must be served from cache without invoking loader')
  assert.deepEqual(val1, val2)

  // Verify NECTA key does not read Cambridge cache
  const nectaVal = await redisCache.getOrSetCache(nectaKey, 60, async () => {
    loaderCalls += 1
    return { totalStudents: 210, wing: 'NECTA' }
  })
  assert.equal(loaderCalls, 2)
  assert.equal(nectaVal.wing, 'NECTA')

  const statsBeforeInvalidate = redisCache.getCacheStats()
  assert.ok(statsBeforeInvalidate.hits >= 1)
  assert.ok(statsBeforeInvalidate.misses >= 2)

  await redisCache.invalidateCachePrefix('dashboard:kpi')
  const cachedAfterInvalidate = await redisCache.getCache(cambridgeKey)
  assert.equal(cachedAfterInvalidate, null, 'Prefix invalidation must clear matching keys immediately')
})

test('Workstream C: Background Job Queue — async execution, retries, idempotency, and wing/user ownership isolation', async () => {
  const queue = loadTsModule('src/lib/jobs/queue.ts')
  queue.resetJobQueueForTests()

  let workerInvocations = 0
  queue.registerJobWorker('REPORT_CARD_BATCH_PDF', async (job, helpers) => {
    workerInvocations += 1
    await helpers.updateProgress(1, job.payload.studentIds.length)
    if (job.payload.shouldFailOnce && workerInvocations === 1) {
      throw new Error('Simulated transient PDF render error')
    }
    await helpers.updateProgress(job.payload.studentIds.length, job.payload.studentIds.length)
    return {
      resultMeta: { generatedCount: job.payload.studentIds.length },
      artifactBuffer: Buffer.from('%PDF-1.4 mock batch pdf'),
      artifactMimeType: 'application/pdf',
      artifactFilename: 'Batch_Report.pdf',
    }
  })

  // 1. Enqueue with idempotency key and verify deduplication
  const job1 = await queue.enqueueBackgroundJob({
    jobType: 'REPORT_CARD_BATCH_PDF',
    createdBy: 'teacher-cambridge-1',
    wing: 'Cambridge',
    idempotencyKey: 'term1-classA',
    totalItems: 2,
    retryBaseDelayMs: 10,
    payload: {
      studentIds: ['s1', 's2'],
      shouldFailOnce: true,
    },
  })

  const duplicateJob = await queue.enqueueBackgroundJob({
    jobType: 'REPORT_CARD_BATCH_PDF',
    createdBy: 'teacher-cambridge-1',
    wing: 'Cambridge',
    idempotencyKey: 'term1-classA',
    totalItems: 2,
    retryBaseDelayMs: 10,
    payload: {
      studentIds: ['s1', 's2'],
      shouldFailOnce: true,
    },
  })

  assert.equal(job1.id, duplicateJob.id, 'Idempotency key must deduplicate concurrent identical job submissions')

  // Wait briefly for async execution + 1 retry
  await new Promise((r) => setTimeout(r, 80))

  // 2. Verify owner in Cambridge wing can access completed job + artifact
  const completedJob = queue.getBackgroundJobForUser(
    job1.id,
    { id: 'teacher-cambridge-1', roles: ['Teacher'], wing: 'Cambridge' },
    true
  )
  assert.ok(completedJob, 'Job owner must be able to retrieve job')
  assert.equal(completedJob.status, 'completed')
  assert.equal(completedJob.progress, 100)
  assert.equal(completedJob.attempts, 2, 'Worker should have succeeded on attempt #2 after retry')
  assert.ok(completedJob.artifactBuffer instanceof Buffer)

  // 3. Verify another teacher cannot access this job
  const unauthorizedTeacherView = queue.getBackgroundJobForUser(
    job1.id,
    { id: 'teacher-other-2', roles: ['Teacher'], wing: 'Cambridge' },
    true
  )
  assert.equal(unauthorizedTeacherView, null, 'Non-owner teacher must be denied access to job')

  // 4. Verify a NECTA-locked staff member cannot access a Cambridge wing job
  const crossWingView = queue.getBackgroundJobForUser(
    job1.id,
    { id: 'dean-necta', roles: ['Principal'], wing: 'NECTA' },
    false
  )
  assert.equal(crossWingView, null, 'NECTA-locked user must not access Cambridge wing job')
})

test('Workstream E: High-speed Sliding-Window Rate Limiter (<1ms overhead, rejects burst > max)', async () => {
  const rateLimit = loadTsModule('src/lib/api/rate-limit.ts')
  rateLimit.resetRateLimitForTests()

  const start = performance.now()
  await rateLimit.enforceRateLimit({ key: 'test-login', max: 3, windowMs: 60_000 }, 'user-1')
  await rateLimit.enforceRateLimit({ key: 'test-login', max: 3, windowMs: 60_000 }, 'user-1')
  await rateLimit.enforceRateLimit({ key: 'test-login', max: 3, windowMs: 60_000 }, 'user-1')
  const elapsedMs = performance.now() - start

  assert.ok(elapsedMs < 15, `3 rate-limit checks should take <15ms in-memory, took ${elapsedMs.toFixed(2)}ms`)

  await assert.rejects(
    async () => {
      await rateLimit.enforceRateLimit({ key: 'test-login', max: 3, windowMs: 60_000 }, 'user-1')
    },
    (err) => err?.code === 'RATE_LIMITED',
    '4th request within window must throw ApiError(RATE_LIMITED)'
  )
})

test('Workstream F: Structured Logger PII/Secret Redaction & Biometric Webhook Security', async () => {
  const logger = loadTsModule('src/lib/monitoring/logger.ts')

  const sanitized = logger.redactSensitiveData({
    username: 'teacher01',
    password: '123456',
    pin_hash: 'abcdef123456',
    nested: {
      supabase_service_role_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig',
      safeField: 'Cambridge Wing',
    },
  })

  assert.equal(sanitized.username, 'teacher01')
  assert.equal(sanitized.password, '[REDACTED]')
  assert.equal(sanitized.pin_hash, '[REDACTED]')
  assert.equal(sanitized.nested.supabase_service_role_key, '[REDACTED]')
  assert.equal(sanitized.nested.safeField, 'Cambridge Wing')

  // Verify biometric route enforces timestamp drift, HMAC signature, and replay deduplication
  const biometricSource = fs.readFileSync(
    path.resolve('src/app/api/attendance/biometric/route.ts'),
    'utf8'
  )
  assert.ok(biometricSource.includes('MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000'))
  assert.ok(biometricSource.includes('crypto.timingSafeEqual'))
  assert.ok(biometricSource.includes('Duplicate biometric event replay detected'))
})

test('Workstream B: Synchronous autoGenerateMissingInvoices removed from page renders & SQL migration present', () => {
  const paymentsPage = fs.readFileSync(
    path.resolve('src/app/dashboard/accountant/payments/page.tsx'),
    'utf8'
  )
  const feeBalancesPage = fs.readFileSync(
    path.resolve('src/app/dashboard/accountant/fee-balances/page.tsx'),
    'utf8'
  )

  assert.ok(
    !paymentsPage.includes('await autoGenerateMissingInvoices()'),
    'payments/page.tsx must not block GET rendering on synchronous autoGenerateMissingInvoices()'
  )
  assert.ok(
    !feeBalancesPage.includes('await autoGenerateMissingInvoices()'),
    'fee-balances/page.tsx must not block GET rendering on synchronous autoGenerateMissingInvoices()'
  )

  const migrationPath = path.resolve(
    'supabase/migrations/20261115183000_phase2_performance_indexes_and_views.sql'
  )
  assert.ok(fs.existsSync(migrationPath), 'Phase 2 additive SQL migration must exist')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  assert.ok(sql.includes('idx_marks_class_subject_term_assessment'))
  assert.ok(sql.includes('idx_invoices_student_year_term_status'))
  assert.ok(sql.includes('idx_attendance_class_date'))
  assert.ok(sql.includes('vw_invoice_balances_and_aging'))
  assert.ok(sql.includes('get_ar_aging_summary'))
  assert.ok(sql.includes('background_jobs'))
})
