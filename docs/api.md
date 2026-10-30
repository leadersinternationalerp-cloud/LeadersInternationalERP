# Leaders International School ERP - HTTP API Documentation

This document describes the API architecture, security perimeter, role matrix, scoping policies, error taxonomy, and request/response contracts for all routes under `src/app/api/`.

---

## 1. Security Architecture & Perimeter

Every API endpoint is protected by defense-in-depth:
1. **Network Proxy (`src/utils/supabase/middleware.ts`)**:
   - Deny-by-default for unauthenticated calls: returns `HTTP 401 JSON` (`UNAUTHENTICATED`) instead of redirecting (HTTP 307) to the HTML login page.
   - Machine clients (e.g. `/api/attendance/biometric`) authenticate via machine headers (`x-api-key`) and are exempt from interactive session cookies.
2. **Unified Route Wrapper (`src/lib/api/handler.ts: route(...)`)**:
   - Every API handler exports `export const METHOD = route(...)`.
   - Enforces user session retrieval, active status checks (`is_active !== false`), role authorization, rate limiting, error catching, and standard security headers.
3. **Response Envelope & Standard Headers**:
   - All successful responses use the `ok(data, meta)` envelope:
     ```json
     {
       "data": { ... },
       "meta": {
         "requestId": "uuid"
       }
     }
     ```
   - Standard security headers injected on every response:
     - `Cache-Control: no-store, max-age=0` (private / non-cacheable)
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: no-referrer`
     - `X-Request-Id: <uuid>`

---

## 2. Canonical Roles & Alias Registry

The system recognizes **9 canonical roles**:
1. `System Admin`
2. `Director`
3. `Principal`
4. `Dean`
5. `Head of Section`
6. `Accountant`
7. `Teacher`
8. `Student`
9. `Parent`

### Role Aliases
Incoming strings, legacy tokens, and UI labels are canonicalized via `coerceRole()` in `src/lib/auth/roles.ts`:

| Alias / Legacy Token | Canonical Role |
|---|---|
| `HOS` | `Head of Section` |
| `Academic Dean` | `Dean` |
| `Vice Principal` | `Principal` |
| `Admin` | `System Admin` |

Helper functions `normalizeRoles(profile)` and `hasAnyRole(userRoles, allowedRoles)` guarantee that code only compares against canonical roles. Non-canonical literals like `'HOS'` are strictly forbidden in code.

---

## 3. Error Taxonomy

All API errors return a standard JSON envelope:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

| Error Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Session missing or expired, or invalid API key. |
| `FORBIDDEN` | 403 | Authenticated user lacks required role or data scope. ("You do not have access to this resource") |
| `NOT_FOUND` | 404 | Resource does not exist or user lacks permission to see it. |
| `BAD_REQUEST` | 400 | Malformed syntax or missing query parameters. |
| `VALIDATION_FAILED`| 422 | Schema validation failed on request payload. |
| `CONFLICT` | 409 | Duplicate entry, already submitted, or resource state conflict. |
| `RATE_LIMITED` | 429 | Request rate limit exceeded for this window. |
| `PROVIDER_ERROR` | 502 | Upstream provider (e.g. Gemini, WhatsApp) failed. |
| `INTERNAL` | 500 | Unexpected server error. Stack traces and raw DB errors are sanitized. |

---

## 4. Route Inventory & Authorization Matrix

| # | Route Path | Method | Allowed Roles | Scope Enforcement | Rate Limit |
|---|---|---|---|---|---|
| 1 | `/api/accountant/fee-structures/pdf` | GET | Admin, Director, Principal, Accountant | Data-level | 30 / min |
| 2 | `/api/accountant/payments/pdf` | GET | Admin, Director, Principal, Accountant | Payment ID validation | 30 / min |
| 3 | `/api/accountant/payments/student-details` | GET | Admin, Director, Principal, Accountant | Parameter validation | 60 / min |
| 4 | `/api/accountant/reports` | GET | Admin, Director, Principal, Accountant | Financial dates | 30 / min |
| 5 | `/api/accountant/reports/export` | GET | Admin, Director, Principal, Accountant | Financial dates | 15 / min |
| 6 | `/api/activities/publish` | POST | Admin, Director, Principal, Dean, Head of Section, Teacher | `assertClassInScope` | 20 / min |
| 7 | `/api/activities/results` | GET | Admin, Director, Principal, Dean, Head of Section, Teacher, Student | Class / Student scope | 60 / min |
| 8 | `/api/activities/review` | GET | Admin, Director, Principal, Dean, Head of Section, Teacher | `assertClassInScope` | 60 / min |
| 9 | `/api/activities/submit` | POST | Student, Teacher, Management | Server-side quiz scoring; 1 attempt | 10 / min |
| 10 | `/api/ai/expand-observation` | POST | Admin, Director, Principal, Dean, Head of Section, Teacher | Teacher tier | 15 / min |
| 11 | `/api/ai/generate-activity` | POST | Admin, Director, Principal, Dean, Head of Section, Teacher | Cambridge prompt | 10 / min |
| 12 | `/api/ai/health` | GET | Public / Health check | None | 60 / min |
| 13 | `/api/attendance/biometric` | POST | Device Key (`x-api-key`) | Serial number & device check | 120 / min |
| 14 | `/api/cron/cleanup-students` | POST | Service Role / Cron Secret | System batch | 5 / min |
| 15 | `/api/early-years/evidence` | POST | Admin, Director, Principal, Dean, Head of Section, Teacher | `assertClassInScope` | 30 / min |
| 16 | `/api/early-years/observations` | GET, POST, DELETE | Staff, Student (GET own), Parent (GET child) | `assertStudentInScope` | 60 / min |
| 17 | `/api/early-years/report` | GET | Staff, Student (GET own), Parent (GET child) | `assertStudentInScope` | 20 / min |
| 18 | `/api/early-years/students` | GET | Staff tier | Teacher class assignment | 60 / min |
| 19 | `/api/report-cards/download` | GET | All roles | `assertStudentInScope` (max 40/batch) | 20 / min |
| 20 | `/api/report-cards/students` | GET | Staff tier | Teacher class assignment | 60 / min |
| 21 | `/api/seed-subjects` | POST | Admin only (mutates database) | System Admin | 5 / min |
| 22 | `/api/students/find` | GET | Staff tier | Term query | 60 / min |
| 23 | `/api/students/photo` | GET, POST, DELETE | GET: All in scope; Writes: Staff | `assertStudentInScope` | 30 / min |
| 24 | `/api/syllabus/topics` | GET | Staff & Students | Grade & Subject | 60 / min |
| 25 | `/api/timetable/entries` | GET, POST, PUT, PATCH, DELETE | GET: All; Writes: Admin tier | Timetable slot validations | 60 / min |
| 26 | `/api/timetable/pdf` | GET | All authenticated | Class / Teacher scope | 20 / min |
| 27 | `/api/timetable/slots` | GET, POST | GET: All; POST: Admin tier | Configuration | 30 / min |
| 28 | `/api/whatsapp/send-receipt` | POST | Admin, Director, Principal, Accountant | Phone & payment validation | 15 / min |
| 29 | `/api/whatsapp/send-report` | POST | Admin, Director, Principal, Dean, Head of Section | `assertStudentInScope` | 15 / min |
| 30 | `/api/whatsapp/senders` | GET, POST, PUT, DELETE | System Admin, Director | Sender credentials | 30 / min |
| 31 | `/api/notifications/push` | POST | System Admin, Director, Principal, Dean, Head of Section | Target roles / users | 30 / min |

---

## 5. Scope Assertion Rules (`src/lib/api/scope.ts`)

- **Management Roles** (`System Admin`, `Director`, `Principal`, `Dean`, `Head of Section`):
  Universal access across all classes, students, and activities.
- **Teacher**:
  - Bound to classes where `classes.teacher_id = user.id` or `class_subjects.teacher_id = user.id`.
  - Cannot publish, review, or grade activities outside assigned classes.
- **Student**:
  - Strictly isolated to `student_id = user.id` (or matching profile record).
  - Attempting to query another student's report card, observations, or marks throws `FORBIDDEN` (403).
- **Parent**:
  - Strictly isolated to student IDs present in `parents.children_ids`.
  - Accessing non-child student records throws `FORBIDDEN` (403).
