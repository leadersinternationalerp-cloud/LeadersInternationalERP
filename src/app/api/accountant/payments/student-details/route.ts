import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user & check permission
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single()

    const roles = profile?.roles || []
    const allowedRoles = ['Accountant', 'System Admin', 'Director', 'Principal']
    const isAllowed = roles.some((r: string) => allowedRoles.includes(r))

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse student ID
    const url = new URL(request.url)
    const studentId = url.searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const studentProfile: any = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
    const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}`.trim() : ''
    const studentAdmNo = student.student_id || ''

    // B. Fetch parent details
    const { data: parentLinks } = await supabase
      .from('student_parents')
      .select(`
        parent_id,
        profiles:parent_id (id, first_name, last_name, phone, email)
      `)
      .eq('student_id', studentId)

    const parents = (parentLinks || []).map((link: any) => {
      const p: any = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles
      return {
        id: p?.id || '',
        name: p ? `${p.first_name} ${p.last_name}`.trim() : '',
        phone: p?.phone || '',
        email: p?.email || ''
      }
    }).filter(p => p.id)

    // C. Fetch siblings (other students sharing any parent)
    const parentIds = parents.map(p => p.id)
    let siblings: any[] = []

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
      siblings = (siblingLinks || []).map((link: any) => {
        const s: any = link.students
        if (!s || seenSiblingIds.has(s.id)) return null
        seenSiblingIds.add(s.id)

        const sProf: any = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        return {
          id: s.id,
          name: sProf ? `${sProf.first_name} ${sProf.last_name}`.trim() : '',
          admission_number: s.student_id || ''
        }
      }).filter(Boolean)
    }

    // D. Fetch all PENDING bank deposits
    const { data: pendingDeposits } = await supabase
      .from('bank_deposits')
      .select('*')
      .eq('status', 'PENDING')
      .order('deposit_date', { ascending: false })

    // E. Perform matching
    const deposits = (pendingDeposits || []).map((dep: any) => {
      const ref = (dep.reference || '').toLowerCase()
      
      // Matching checks
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
        matchReason
      }
    })

    // Sort to put matched deposits first
    deposits.sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0))

    return NextResponse.json({
      student: {
        id: studentId,
        name: studentName,
        admission_number: studentAdmNo
      },
      parents,
      siblings,
      deposits
    })

  } catch (error: any) {
    console.error('[API Student Details ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
