import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import AttendanceForm from './AttendanceForm'

export default async function TeacherAttendancePage({
  searchParams
}: {
  searchParams: Promise<{ class_id?: string; date?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Teacher' && profile?.role !== 'System Admin') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  const params = await searchParams
  const selectedClassId = params.class_id || (classes && classes.length > 0 ? classes[0].id : '')
  const selectedDate = params.date || new Date().toISOString().split('T')[0]

  // Fetch students in selected class
  let classStudents: any[] = []
  let isLocked = false
  let existingLogs: any[] = []

  if (selectedClassId) {
    const selectedClass = classes?.find(c => c.id === selectedClassId)
    if (selectedClass) {
      // Query students whose grade_level and section match the class name/section
      // In the database: students has grade_level and section
      const { data: students } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          grade_level,
          section,
          profiles:id (first_name, last_name)
        `)
        .eq('grade_level', selectedClass.name)
        .eq('section', selectedClass.section)
      
      classStudents = students || []

      // Fetch existing attendance logs for this class & date
      const { data: attLogs } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('date', selectedDate)

      existingLogs = attLogs || []
      isLocked = existingLogs.some(log => log.is_locked === true)
    }
  }

  // Server Action to submit attendance
  async function handleSaveAttendance(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const classId = formData.get('classId') as string
    const date = formData.get('date') as string
    const lock = formData.get('lock') === 'true'

    if (!classId || !date) return

    const { data: { user } } = await supabase.auth.getUser()

    // Parse statuses from form data
    const updates: any[] = []
    const absents: string[] = []

    formData.forEach((value, key) => {
      if (key.startsWith('status_')) {
        const studentId = key.replace('status_', '')
        updates.push({
          student_id: studentId,
          class_id: classId,
          date,
          status: value as string,
          recorded_by: user?.id,
          is_locked: lock
        })

        if (value === 'Absent' || value === 'Late') {
          absents.push(studentId)
        }
      }
    })

    // Upsert attendance logs
    for (const update of updates) {
      const { error } = await supabase
        .from('attendance')
        .upsert(update, { onConflict: 'student_id,date' })

      if (error) {
        console.error('Error saving attendance:', error.message)
      }
    }

    // If locked, trigger parent notifications for absent/late students
    if (lock && absents.length > 0) {
      for (const studentId of absents) {
        // Fetch student details
        const { data: stud } = await supabase
          .from('students')
          .select('profiles:id (first_name, last_name)')
          .eq('id', studentId)
          .single()

        const name = stud ? `${(stud.profiles as any).first_name} ${(stud.profiles as any).last_name}` : 'Your child'

        // Fetch parents
        const { data: parentLinks } = await supabase
          .from('student_parents')
          .select('parent_id')
          .eq('student_id', studentId)

        if (parentLinks) {
          for (const link of parentLinks) {
            await supabase.from('notifications').insert({
              user_id: link.parent_id,
              message: `Alert: ${name} was marked Absent/Late on ${date}. Please contact the school if you have questions.`,
              link_url: `/dashboard/parent/discipline` // redirect to timeline
            })
          }
        }
      }
    }

    revalidatePath('/dashboard/teacher/attendance')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Mark Class Attendance
        </h1>
        <Link href="/dashboard/teacher" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      {/* Filter Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <form method="GET" action="/dashboard/teacher/attendance" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label className="form-label">Class</label>
            <select name="class_id" defaultValue={selectedClassId} className="input-field" required>
              {classes?.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: '200px' }}>
            <label className="form-label">Date</label>
            <input type="date" name="date" defaultValue={selectedDate} className="input-field" required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
            Load Students List
          </button>
        </form>
      </div>

      {/* Students Marking Form */}
      {classStudents.length > 0 ? (
        <AttendanceForm
          students={classStudents}
          existingLogs={existingLogs}
          isLocked={isLocked}
          classId={selectedClassId}
          date={selectedDate}
          saveAction={handleSaveAttendance}
        />
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
          No student records found matching this class level/section.
        </div>
      )}
    </div>
  )
}
