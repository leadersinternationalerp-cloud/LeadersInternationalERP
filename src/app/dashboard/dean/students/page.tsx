import { createClient } from '@/utils/supabase/server'
import DeanStudentsClient from './DeanStudentsClient'

export default async function DeanStudentsPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Dean') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all students with their profiles
  const { data: studentsData } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      grade_level,
      section,
      profiles:id (first_name, last_name)
    `)
    .order('grade_level', { ascending: true })

  const students = studentsData || []

  // Fetch all attendance, marks, discipline to attach to students
  // Note: For a very large school, we'd paginate or fetch on demand. 
  // For ERP completion requirements, we fetch them here to power the client-side expansion.
  
  const [attRes, marksRes, discRes] = await Promise.all([
    supabase.from('attendance').select('student_id, status'),
    supabase.from('marks').select('student_id, score').eq('is_released', true),
    supabase.from('discipline').select('student_id, status')
  ])

  const attendanceMap = new Map<string, any[]>()
  attRes.data?.forEach(a => {
    if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, [])
    attendanceMap.get(a.student_id)?.push(a)
  })

  const marksMap = new Map<string, any[]>()
  marksRes.data?.forEach(m => {
    if (!marksMap.has(m.student_id)) marksMap.set(m.student_id, [])
    marksMap.get(m.student_id)?.push(m)
  })

  const discMap = new Map<string, any[]>()
  discRes.data?.forEach(d => {
    if (!discMap.has(d.student_id)) discMap.set(d.student_id, [])
    discMap.get(d.student_id)?.push(d)
  })

  // Assemble full student objects
  const fullStudents = students.map(s => ({
    ...s,
    attendance: attendanceMap.get(s.id) || [],
    marks: marksMap.get(s.id) || [],
    discipline: discMap.get(s.id) || []
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Student Enrollment Directory
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          School-wide student overview with quick-access to academic and discipline records.
        </p>
      </div>

      <DeanStudentsClient students={fullStudents as any[]} />
    </div>
  )
}
