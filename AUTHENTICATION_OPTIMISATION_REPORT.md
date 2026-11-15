# AUTHENTICATION & REQUEST OPTIMISATION REPORT
**System:** Leaders International School ERP  
**Workstream:** Workstream A (Priority: CRITICAL)  
**Date:** November 2026  

---

## 1. Executive Summary

Prior to Phase 2, every authenticated navigation to a `/dashboard/*` route triggered redundant authentication, profile, and wing-resolution queries across middleware, the root dashboard layout, and individual Server Component pages.

Phase 2 introduces a two-tier request and short-TTL resolution pipeline across `src/utils/supabase/server.ts`, `src/lib/auth/session.ts`, `src/lib/wingServer.ts`, and `src/utils/supabase/middleware.ts` that eliminates duplicate database and GoTrue round trips while preserving JWT verification, session refresh cookies, role-based access control (RBAC), and symmetric **Cambridge** / **NECTA** wing isolation.

---

## 2. Before-and-After Authentication Lifecycle Trace

### 2.1 Before Phase 2 (Baseline)
During a single request to `/dashboard/teacher/marks` or `/dashboard/accountant/payments`:
1. **`src/utils/supabase/middleware.ts`**:
   - Executed `supabase.auth.getUser()` (GoTrue network verify).
   - Executed `SELECT role, roles FROM profiles WHERE id = $1` on every request.
2. **`src/app/dashboard/layout.tsx`**:
   - Created a new Supabase server client instance.
   - Executed `supabase.auth.getUser()` a **2nd time**.
   - Executed `SELECT * FROM profiles WHERE id = $1` a **2nd time**.
   - Executed `getWingContext(user.id, profile)`, which queried `class_subjects` and `classes` for teachers or `students`/`student_parents` for learners/parents.
3. **Individual Page (`page.tsx`)**:
   - Created another Supabase server client instance.
   - Executed `supabase.auth.getUser()` a **3rd time**.
   - Executed `SELECT * FROM profiles WHERE id = $1` a **3rd time**.
   - Executed `getWingContext(user.id, profile)` a **2nd time**, repeating wing assignment queries.

### 2.2 After Phase 2 (Optimised)
1. **Request-Scoped Supabase Server Client (`src/utils/supabase/server.ts`)**:
   - Wrapped in `React.cache()` so all Server Components in the same render tree share one client instance.
   - Memoizes `client.auth.getUser()` per request instance (`cachedUserPromise`), ensuring `layout.tsx`, `page.tsx`, `getSessionUser()`, and `getApiUser()` share a single in-flight/resolved GoTrue `getUser()` promise.
2. **Central Profile & Wing Resolution (`src/lib/auth/session.ts` & `src/lib/wingServer.ts`)**:
   - `resolveUserProfileAndWing(userId)` combines `React.cache()` (intra-request deduplication) with a 30-second server cache (`CACHE_TTL.AUTH_PROFILE = 30s`, key `lis:v1:auth:profile:<userId>`).
   - `getWingContext()` is wrapped in `React.cache()` and delegates to `resolveUserProfileAndWing()`, eliminating duplicate `class_subjects`, `classes`, `students`, and `student_parents` wing lookups.
3. **Middleware Role Resolution (`src/utils/supabase/middleware.ts`)**:
   - Preserves `supabase.auth.getUser()` for cookie token refresh and JWT verification.
   - Wraps the middleware ACL `profiles` lookup in `getOrSetCache(buildCacheKey('auth:roles', [user.id]), CACHE_TTL.AUTH_PROFILE, ...)`.
4. **Immediate Security Invalidation (`src/app/dashboard/users/actions.ts`)**:
   - `createUserAction`, `updateUserAction`, `toggleUserStatusAction`, and `resetUserPasswordAction` invoke `await invalidateUserAuthCache(userId)` which immediately purges both `lis:v1:auth:profile:<userId>` and `lis:v1:auth:roles:<userId>`.

---

## 3. Query Count Comparison

| Navigation Scenario | Metric | Before Phase 2 | After Phase 2 (Cold Cache) | After Phase 2 (Warm 30s Cache) | Reduction |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `/dashboard/teacher/marks` | `supabase.auth.getUser()` calls | 3 | 2 (1 middleware + 1 RSC) | 2 (1 middleware + 1 RSC) | **-33%** |
| `/dashboard/teacher/marks` | `profiles` SELECT queries | 3 | 1 | 0 | **-67% to -100%** |
| `/dashboard/teacher/marks` | `getWingContext()` DB lookups | 4 (2×2 tables) | 2 (1×2 tables) | 0 | **-50% to -100%** |
| `/dashboard/accountant/payments` | Total Auth + Profile + Wing queries | 8 | 3 | 2 | **-63% to -75%** |

---

## 4. Security & Isolation Guarantees

- **No Cross-User Leakage:** `React.cache()` is strictly scoped to a single Next.js Server Component request lifecycle, and all cache keys are explicitly keyed by verified `user.id` (`lis:v1:auth:profile:<userId>`).
- **Immediate Suspension Enforcement:** When an administrator suspends a user via `toggleUserStatusAction`, `invalidateUserAuthCache(userId)` immediately evicts the user's cached profile and roles, and `getApiUser()` / `getSessionUser()` / `DashboardLayout` enforce `profile.is_active !== false`.
- **Symmetric Cambridge & NECTA Isolation Preserved:** `computeAssignedWing()` and `getWingContext()` retain exact wing inference for Cambridge vs NECTA users and lock non-cross-wing users to their assigned wing.
