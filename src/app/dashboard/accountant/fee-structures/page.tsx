import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { deleteFeeStructureAction } from '../actions'
import FeeStructuresClient from './FeeStructuresClient'

export default async function FeeStructuresPage() {
  const supabase = await createClient()

  // Verify auth & roles permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Unauthorized. Please log in.
      </div>
    )
  }

  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles = normalizeRoles(prof)

  const canWrite = userRoles.some(r => ['System Admin', 'Director', 'Principal'].includes(r))
  const canRead = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Accountant'].includes(r))

  if (!canRead) {
    return (
      <div style={{ padding: '2rem', color: 'var(--color-error)', fontWeight: 600 }}>
        Access Denied. You do not have permission to view fee structures.
      </div>
    )
  }

  // Fetch all fee structures
  const { data: fees } = await supabase
    .from('fee_structures')
    .select('*')
    .order('academic_year', { ascending: false })
    .order('grade_level', { ascending: true })
    .order('term', { ascending: true })

  // Fetch classes matching system database classes
  const { data: dbClasses } = await supabase
    .from('classes')
    .select('name')

  const defaultGrades = [
    'Cambridge Year 1',
    'Cambridge Year 2',
    'Cambridge Year 3',
    'Cambridge Year 4',
    'Cambridge Year 5',
    'Cambridge Year 6',
    'Baby Class',
    'Nursery',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
  ]
  const dbGradeNames = dbClasses ? dbClasses.map(c => c.name).filter(Boolean) : []
  const systemGrades = Array.from(new Set([...defaultGrades, ...dbGradeNames])).sort()

  // Fetch academic years
  const { data: dbYears } = await supabase
    .from('academic_years')
    .select('name')
    .order('name', { ascending: false })

  const dbYearNames = dbYears ? dbYears.map(y => y.name).filter(Boolean) : []
  const academicYears = Array.from(new Set(['2027', ...dbYearNames, '2026-2027', '2025-2026']))

  // Handle delete on server side via Server Action directly
  async function handleDelete(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (id) {
      await deleteFeeStructureAction(id)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Fee Structure Management
      </h1>

      <FeeStructuresClient
        fees={fees || []}
        systemGrades={systemGrades}
        academicYears={academicYears}
        canWrite={canWrite}
        handleDeleteAction={handleDelete}
      />
    </div>
  )
}
