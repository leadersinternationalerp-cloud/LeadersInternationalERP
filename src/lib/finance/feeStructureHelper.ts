import type { SupabaseClient } from '@supabase/supabase-js'

export interface OfficialFeeSeedRow {
  academic_year: string
  term: string
  grade_level: string
  fee_type: string
  amount: number
  monthly_amount: number
  annual_amount: number
  due_date: string
  wing: 'Cambridge' | 'NECTA'
  payable_once: boolean
  payable_annually: boolean
  description: string
}

const TERM_DATES: Record<string, string> = {
  'Term 1': '2027-01-08',
  'Term 2': '2027-04-20',
  'Term 3': '2027-08-05',
}

export function getOfficial2027FeeRows(): OfficialFeeSeedRow[] {
  const rows: OfficialFeeSeedRow[] = []

  // 1. Cambridge Wing: Year 1 - 3
  for (const grade of ['Cambridge Year 1', 'Cambridge Year 2', 'Cambridge Year 3']) {
    for (const term of ['Term 1', 'Term 2', 'Term 3']) {
      const due = TERM_DATES[term]
      rows.push(
        {
          academic_year: '2027',
          term,
          grade_level: grade,
          fee_type: 'Tuition',
          amount: 620000,
          monthly_amount: 155000,
          annual_amount: 1860000,
          due_date: due,
          wing: 'Cambridge',
          payable_once: false,
          payable_annually: false,
          description: 'Cambridge Wing 2027 Official Fee Structure (Year 1 - 3)',
        },
        {
          academic_year: '2027',
          term,
          grade_level: grade,
          fee_type: 'Stationery',
          amount: 500000,
          monthly_amount: 125000,
          annual_amount: 1500000,
          due_date: due,
          wing: 'Cambridge',
          payable_once: false,
          payable_annually: false,
          description: 'Cambridge Wing 2027 Official Fee Structure (Year 1 - 3)',
        },
        {
          academic_year: '2027',
          term,
          grade_level: grade,
          fee_type: 'Meals (Breakfast & Lunch)',
          amount: 320000,
          monthly_amount: 80000,
          annual_amount: 960000,
          due_date: due,
          wing: 'Cambridge',
          payable_once: false,
          payable_annually: false,
          description: 'Cambridge Wing 2027 Official Fee Structure (Year 1 - 3)',
        }
      )
    }
    rows.push({
      academic_year: '2027',
      term: 'Term 1',
      grade_level: grade,
      fee_type: 'Admission Fee',
      amount: 150000,
      monthly_amount: 0,
      annual_amount: 150000,
      due_date: TERM_DATES['Term 1'],
      wing: 'Cambridge',
      payable_once: true,
      payable_annually: false,
      description: 'One-time admission fee payable on admission (new students only)',
    })
  }

  // 2. Cambridge Wing: Year 4 - 6
  for (const grade of ['Cambridge Year 4', 'Cambridge Year 5', 'Cambridge Year 6']) {
    for (const term of ['Term 1', 'Term 2', 'Term 3']) {
      const due = TERM_DATES[term]
      rows.push(
        {
          academic_year: '2027',
          term,
          grade_level: grade,
          fee_type: 'Tuition',
          amount: 972000,
          monthly_amount: 243000,
          annual_amount: 2916000,
          due_date: due,
          wing: 'Cambridge',
          payable_once: false,
          payable_annually: false,
          description: 'Cambridge Wing 2027 Official Fee Structure (Year 4 - 6)',
        },
        {
          academic_year: '2027',
          term,
          grade_level: grade,
          fee_type: 'Stationery',
          amount: 580000,
          monthly_amount: 145000,
          annual_amount: 1740000,
          due_date: due,
          wing: 'Cambridge',
          payable_once: false,
          payable_annually: false,
          description: 'Cambridge Wing 2027 Official Fee Structure (Year 4 - 6)',
        },
        {
          academic_year: '2027',
          term,
          grade_level: grade,
          fee_type: 'Meals (Breakfast & Lunch)',
          amount: 320000,
          monthly_amount: 80000,
          annual_amount: 960000,
          due_date: due,
          wing: 'Cambridge',
          payable_once: false,
          payable_annually: false,
          description: 'Cambridge Wing 2027 Official Fee Structure (Year 4 - 6)',
        }
      )
    }
    rows.push({
      academic_year: '2027',
      term: 'Term 1',
      grade_level: grade,
      fee_type: 'Admission Fee',
      amount: 150000,
      monthly_amount: 0,
      annual_amount: 150000,
      due_date: TERM_DATES['Term 1'],
      wing: 'Cambridge',
      payable_once: true,
      payable_annually: false,
      description: 'One-time admission fee payable on admission (new students only)',
    })
  }

  // 3. NECTA Wing: Baby Class
  const babyTerms = [
    { term: 'Term 1', tuition: 173333, other: 426667 },
    { term: 'Term 2', tuition: 173333, other: 426667 },
    { term: 'Term 3', tuition: 173334, other: 426666 },
  ]
  for (const t of babyTerms) {
    rows.push(
      {
        academic_year: '2027',
        term: t.term,
        grade_level: 'Baby Class',
        fee_type: 'Tuition',
        amount: t.tuition,
        monthly_amount: 43333,
        annual_amount: 520000,
        due_date: TERM_DATES[t.term],
        wing: 'NECTA',
        payable_once: false,
        payable_annually: false,
        description: 'NECTA Wing 2027 Official Fee Structure (Baby Class)',
      },
      {
        academic_year: '2027',
        term: t.term,
        grade_level: 'Baby Class',
        fee_type: 'Stationery, Meals & Other Curriculums',
        amount: t.other,
        monthly_amount: 106667,
        annual_amount: 1280000,
        due_date: TERM_DATES[t.term],
        wing: 'NECTA',
        payable_once: false,
        payable_annually: false,
        description: 'NECTA Wing 2027 Official Fee Structure (Baby Class)',
      }
    )
  }
  rows.push({
    academic_year: '2027',
    term: 'Term 1',
    grade_level: 'Baby Class',
    fee_type: 'Admission Fee',
    amount: 150000,
    monthly_amount: 0,
    annual_amount: 150000,
    due_date: TERM_DATES['Term 1'],
    wing: 'NECTA',
    payable_once: true,
    payable_annually: false,
    description: 'One-time admission fee payable on admission (new students only)',
  })

  // 4. NECTA Wing: Nursery
  const nurseryTerms = [
    { term: 'Term 1', tuition: 240000, other: 430000 },
    { term: 'Term 2', tuition: 240000, other: 425000 },
    { term: 'Term 3', tuition: 240000, other: 425000 },
  ]
  for (const t of nurseryTerms) {
    rows.push(
      {
        academic_year: '2027',
        term: t.term,
        grade_level: 'Nursery',
        fee_type: 'Tuition',
        amount: t.tuition,
        monthly_amount: 60000,
        annual_amount: 720000,
        due_date: TERM_DATES[t.term],
        wing: 'NECTA',
        payable_once: false,
        payable_annually: false,
        description: 'NECTA Wing 2027 Official Fee Structure (Nursery)',
      },
      {
        academic_year: '2027',
        term: t.term,
        grade_level: 'Nursery',
        fee_type: 'Stationery, Meals & Other Curriculums',
        amount: t.other,
        monthly_amount: 106667,
        annual_amount: 1280000,
        due_date: TERM_DATES[t.term],
        wing: 'NECTA',
        payable_once: false,
        payable_annually: false,
        description: 'NECTA Wing 2027 Official Fee Structure (Nursery)',
      }
    )
  }
  rows.push({
    academic_year: '2027',
    term: 'Term 1',
    grade_level: 'Nursery',
    fee_type: 'Admission Fee',
    amount: 150000,
    monthly_amount: 0,
    annual_amount: 150000,
    due_date: TERM_DATES['Term 1'],
    wing: 'NECTA',
    payable_once: true,
    payable_annually: false,
    description: 'One-time admission fee payable on admission (new students only)',
  })

  // 5. NECTA Wing: Primary 1 - 6 (Grade 1 .. Grade 6)
  const primaryTerms = [
    { term: 'Term 1', tuition: 310000, other: 430000 },
    { term: 'Term 2', tuition: 305000, other: 425000 },
    { term: 'Term 3', tuition: 305000, other: 425000 },
  ]
  for (const grade of ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']) {
    for (const t of primaryTerms) {
      rows.push(
        {
          academic_year: '2027',
          term: t.term,
          grade_level: grade,
          fee_type: 'Tuition',
          amount: t.tuition,
          monthly_amount: 76666,
          annual_amount: 920000,
          due_date: TERM_DATES[t.term],
          wing: 'NECTA',
          payable_once: false,
          payable_annually: false,
          description: 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)',
        },
        {
          academic_year: '2027',
          term: t.term,
          grade_level: grade,
          fee_type: 'Stationery, Meals & Other Curriculums',
          amount: t.other,
          monthly_amount: 106667,
          annual_amount: 1280000,
          due_date: TERM_DATES[t.term],
          wing: 'NECTA',
          payable_once: false,
          payable_annually: false,
          description: 'NECTA Wing 2027 Official Fee Structure (Primary 1 - 6)',
        }
      )
    }
    rows.push({
      academic_year: '2027',
      term: 'Term 1',
      grade_level: grade,
      fee_type: 'Admission Fee',
      amount: 150000,
      monthly_amount: 0,
      annual_amount: 150000,
      due_date: TERM_DATES['Term 1'],
      wing: 'NECTA',
      payable_once: true,
      payable_annually: false,
      description: 'One-time admission fee payable on admission (new students only)',
    })
  }

  return rows
}

/**
 * Normalizes a class / grade name to candidate grade_level strings for fee structure lookup.
 */
export function buildCandidateGrades(rawGrade: string): string[] {
  const clean = (rawGrade || '').trim()
  const lower = clean.toLowerCase()
  const candidates = [clean]

  // Map "Year 1" -> "Cambridge Year 1", "Primary 1" -> "Grade 1", "NECTA Grade 1" -> "Grade 1"
  const yearMatch = lower.match(/year\s*(\d+)/)
  if (yearMatch) {
    candidates.push(`Cambridge Year ${yearMatch[1]}`)
  }
  const gradeMatch = lower.match(/(?:grade|primary|std|standard)\s*(\d+)/)
  if (gradeMatch && !lower.includes('cambridge')) {
    candidates.push(`Grade ${gradeMatch[1]}`)
  }
  if (lower.includes('baby')) candidates.push('Baby Class')
  if (lower.includes('nursery')) candidates.push('Nursery')

  return Array.from(new Set(candidates.filter(Boolean)))
}

/**
 * Resolves fee structure items for a student's placed class, term, and academic year.
 * Falls back to '2027' if '2026/2027' or '2026-2027' has no explicit fee rows yet.
 */
export async function resolveClassFeeStructures(
  supabase: SupabaseClient,
  gradeLevel: string,
  term: string = 'Term 1',
  academicYear: string = '2027',
  includeOneTimeAdmission: boolean = true
) {
  const candidates = buildCandidateGrades(gradeLevel)
  const yearCandidates = Array.from(
    new Set([academicYear, '2027', '2026/2027', '2026-2027'].filter(Boolean))
  )

  let matchedRows: any[] = []
  let resolvedYear = academicYear || '2027'

  for (const yr of yearCandidates) {
    const { data } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('academic_year', yr)
      .in('grade_level', candidates)

    if (data && data.length > 0) {
      matchedRows = data
      resolvedYear = yr
      break
    }
  }

  // Fallback: ilike match if exact grade_level name differs slightly (e.g. "Cambridge Year 1 - Stream A")
  if (matchedRows.length === 0 && gradeLevel) {
    const { data } = await supabase
      .from('fee_structures')
      .select('*')
      .ilike('grade_level', `%${gradeLevel}%`)
      .order('academic_year', { ascending: false })

    if (data && data.length > 0) {
      resolvedYear = data[0].academic_year
      matchedRows = data.filter((r) => r.academic_year === resolvedYear)
    }
  }

  if (matchedRows.length === 0) {
    return {
      items: [] as any[],
      academicYearUsed: resolvedYear,
      dueDate: TERM_DATES[term] || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    }
  }

  // Filter for requested term + optional one-time admission fee
  const termLower = term.toLowerCase()
  const filtered = matchedRows.filter((row) => {
    const isTermMatch = (row.term || '').toLowerCase() === termLower
    const isOnce = Boolean(row.payable_once)
    if (isOnce) return includeOneTimeAdmission
    return isTermMatch
  })

  const finalItems = filtered.length > 0 ? filtered : matchedRows
  const dueDateFromRow = finalItems.find((r) => r.due_date)?.due_date
  const fallbackDue = TERM_DATES[term] || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  return {
    items: finalItems,
    academicYearUsed: resolvedYear,
    dueDate: dueDateFromRow || fallbackDue,
  }
}
