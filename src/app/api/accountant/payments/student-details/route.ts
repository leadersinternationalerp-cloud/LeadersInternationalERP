import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { route, apiHeaders } from '@/lib/api/handler'
import { FINANCE_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'
import { assertParentOf } from '@/lib/api/scope'

export const GET = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const url = new URL(req.url)
    const studentId = url.searchParams.get('student_id')

    if (!studentId) {
      throw badRequest({ student_id: 'student_id is required' })
    }

    if (user.roles.includes('Parent')) {
      await assertParentOf(user, studentId)
    }

    // A. Fetch selected student details
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        profiles (first_name, last_name, phone)
      `)
      .eq('id', studentId)
      .single()

    if (studentErr || !student) {
      throw new ApiError('NOT_FOUND', 'Student not found')
    }

    const studentProfile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
    const studentName = studentProfile
      ? `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim()
      : ''
    const studentAdmNo = student.student_id || ''

    // B. Fetch parent details
    const { data: parentLinks } = await supabase
      .from('student_parents')
      .select(`
        parent_id,
        profiles:parent_id (id, first_name, last_name, phone, email)
      `)
      .eq('student_id', studentId)

    interface ParentProfile {
      id: string
      first_name?: string
      last_name?: string
      phone?: string
      email?: string
    }

    const parents = (parentLinks || [])
      .map((link: { profiles: ParentProfile | ParentProfile[] | null }) => {
        const p = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles
        return {
          id: p?.id || '',
          name: p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : '',
          phone: p?.phone || '',
          email: p?.email || '',
        }
      })
      .filter((p) => p.id)

    // C. Fetch siblings
    const parentIds = parents.map((p) => p.id)
    let siblings: Array<{ id: string; name: string; admission_number: string }> = []

    if (parentIds.length > 0) {
      const { data: siblingLinks } = await supabase
        .from('student_parents')
        .select(`
          student_id,
          students:student_id (
            id,
            student_id,
            profiles (first_name, last_name)
          )
        `)
        .in('parent_id', parentIds)
        .neq('student_id', studentId)

      const seenSiblingIds = new Set<string>()
      interface SiblingRecord {
        id: string
        student_id?: string
        profiles?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[]
      }

      siblings = (siblingLinks || [])
        .map((link: { students: SiblingRecord | SiblingRecord[] | null }) => {
          const s = Array.isArray(link.students) ? link.students[0] : link.students
          if (!s || seenSiblingIds.has(s.id)) return null
          seenSiblingIds.add(s.id)

          const sProf = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
          return {
            id: s.id,
            name: sProf ? `${sProf.first_name || ''} ${sProf.last_name || ''}`.trim() : '',
            admission_number: s.student_id || '',
          }
        })
        .filter((sib): sib is { id: string; name: string; admission_number: string } => Boolean(sib))
    }

    // D. Fetch pending bank deposits
    const { data: pendingDeposits } = await supabase
      .from('bank_deposits')
      .select('*')
      .eq('status', 'PENDING')
      .order('deposit_date', { ascending: false })

    // E. Perform matching
    interface DepositRecord {
      reference?: string
      [key: string]: unknown
    }

    const deposits = (pendingDeposits || []).map((dep: DepositRecord) => {
      const ref = (dep.reference || '').toLowerCase()

      const studentMatch = studentName && ref.includes(studentName.toLowerCase())
      const studentIdMatch = studentAdmNo && ref.includes(studentAdmNo.toLowerCase())

      let parentMatch = false
      let matchedParentName = ''
      for (const p of parents) {
        if (p.name && ref.includes(p.name.toLowerCase())) {
          parentMatch = true
          matchedParentName = p.name
          break
        }
        if (p.phone && ref.includes(p.phone.replace(/[+\s-]/g, ''))) {
          parentMatch = true
          matchedParentName = p.name
          break
        }
      }

      let siblingMatch = false
      let matchedSiblingName = ''
      for (const sib of siblings) {
        if (sib.name && ref.includes(sib.name.toLowerCase())) {
          siblingMatch = true
          matchedSiblingName = sib.name
          break
        }
        if (sib.admission_number && ref.includes(sib.admission_number.toLowerCase())) {
          siblingMatch = true
          matchedSiblingName = sib.name
          break
        }
      }

      let matched = false
      let matchReason = ''

      if (studentMatch) {
        matched = true
        matchReason = `Matches student name (${studentName})`
      } else if (studentIdMatch) {
        matched = true
        matchReason = `Matches student ID (${studentAdmNo})`
      } else if (parentMatch) {
        matched = true
        matchReason = `Matches parent: ${matchedParentName}`
      } else if (siblingMatch) {
        matched = true
        matchReason = `Matches sibling: ${matchedSiblingName}`
      }

      return {
        ...dep,
        matched,
        matchReason,
      }
    })

    deposits.sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0))

    const responsePayload = {
      student: {
        id: studentId,
        name: studentName,
        admission_number: studentAdmNo,
      },
      parents,
      siblings,
      deposits,
    }

    return NextResponse.json(
      {
        data: responsePayload,
        ...responsePayload,
        meta: { requestId },
      },
      {
        status: 200,
        headers: apiHeaders(requestId),
      }
    )
  },
  { roles: [...FINANCE_ROLES, 'Parent'] }
)
