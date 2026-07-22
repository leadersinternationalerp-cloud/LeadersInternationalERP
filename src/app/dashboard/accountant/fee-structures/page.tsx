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
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

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
    .order('created_at', { ascending: false })

  // Fetch classes matching system database classes
  const { data: dbClasses } = await supabase
    .from('classes')
    .select('name')

  const defaultGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']
  const systemGrades = dbClasses && dbClasses.length > 0
    ? Array.from(new Set(dbClasses.map(c => c.name))).filter(Boolean).sort()
    : defaultGrades

  // Fetch academic years
  const { data: dbYears } = await supabase
    .from('academic_years')
    .select('name')
    .order('name', { ascending: false })

  const academicYears = dbYears && dbYears.length > 0
    ? dbYears.map(y => y.name)
    : ['2024-2025', '2025-2026', '2026-2027']

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
