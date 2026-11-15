# REDIS & MULTI-TIER CACHING STRATEGY
**System:** Leaders International School ERP  
**Workstream:** Workstream D (Priority: HIGH)  
**Date:** November 2026  

---

## 1. Architecture Overview

Phase 2 introduces a unified server-side caching layer in:
- `src/lib/cache/redisCache.ts` (Core L1/L2 Cache Engine)
- `src/lib/cache/referenceData.ts` (Domain Reference Data Cache & Invalidation Helpers)

### Dual-Tier Resilience (Upstash/Redis REST + Bounded In-Memory LRU)
1. **L1 In-Memory LRU + TTL Store:** Provides sub-millisecond (`<0.05ms`) reads within the Node.js server process, bounded to `MAX_MEMORY_ENTRIES = 2000` to guarantee predictable memory consumption.
2. **L2 Optional Redis REST Store (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`):** When configured in environment variables, reads and writes synchronize with Redis so multiple Node.js worker instances share cached entries. If Redis is unconfigured or temporarily unreachable, the application degrades gracefully to L1 in-memory caching without throwing errors or blocking requests.

---

## 2. Cache Key Convention & Wing Isolation

All cache keys are constructed via `buildCacheKey(namespace, parts, wing)` in `src/lib/cache/redisCache.ts`:

```text
lis:v1:<namespace>:<part1>:<part2>:wing:<cambridge|necta|both>
```

### Examples
- `lis:v1:auth:profile:9f8c...` — User profile, normalized roles, and computed wing assignment.
- `lis:v1:auth:roles:9f8c...` — Middleware ACL role lookup.
- `lis:v1:settings:grading_scale` — School grading scale configuration.
- `lis:v1:settings:assessment_weights` — Assessment weights (`QUIZZES`, `Test 1`, `Mid-Term`, `Terminal`, etc.).
- `lis:v1:academic:terms` — Academic terms ordered by `is_current DESC`.
- `lis:v1:academic:current_term_year` — Active term and academic year pair.
- `lis:v1:academic:classes:wing:cambridge` — Cambridge wing class list.
- `lis:v1:academic:classes:wing:necta` — NECTA wing class list.

---

## 3. Configured TTL Policy (`CACHE_TTL`)

| Cache Domain | Constant | TTL (Seconds) | Rationale |
| :--- | :--- | :---: | :--- |
| Authenticated Profile & Wing | `CACHE_TTL.AUTH_PROFILE` | `30s` | Eliminates duplicate queries across middleware/layout/page while keeping role/suspension latency under 30s (plus instant invalidation on admin edit). |
| Dashboard KPI Summary | `CACHE_TTL.DASHBOARD_SUMMARY` | `60s` | Absorbs concurrent dashboard refreshes during peak morning check-in. |
| Classes & Subjects Lists | `CACHE_TTL.CLASSES_LIST` / `SUBJECTS_LIST` | `180s` (3m) | Frequently read on marks, attendance, and timetable screens; rarely mutated. |
| Active Term / Grading Scale / Weights | `CACHE_TTL.ACTIVE_TERM` / `GRADING_SCALE` / `ASSESSMENT_WEIGHTS` | `300s` (5m) | Read on every marks entry, overview, and report card request; invalidated immediately on settings update. |

---

## 4. Explicit Cache Invalidation Matrix

| Mutation Action | File | Invalidation Call | Evicted Key Prefix(es) |
| :--- | :--- | :--- | :--- |
| Create / Update / Suspend / Reset User | `src/app/dashboard/users/actions.ts` | `invalidateUserAuthCache(userId)` | `lis:v1:auth:profile:<userId>`, `lis:v1:auth:roles:<userId>` |
| Update Grading Scale | `src/app/dashboard/admin/settings/grading/actions.ts` | `invalidateReferenceDataCache('grading')` | `lis:v1:settings:grading_scale` |
| Update Assessment Weights | `src/app/dashboard/admin/settings/assessment-weights/actions.ts` | `invalidateReferenceDataCache('weights')` | `lis:v1:settings:assessment_weights` |
| Update Terms / Classes | `src/lib/cache/referenceData.ts` | `invalidateReferenceDataCache('terms' \| 'classes' \| 'all')` | `lis:v1:academic:terms`, `lis:v1:academic:classes` |

---

## 5. Observability (`getCacheStats()`)

`getCacheStats()` in `src/lib/cache/redisCache.ts` exposes real-time counters for:
- `hits`
- `misses`
- `sets`
- `invalidations`
- `size` (active entries in memory)
