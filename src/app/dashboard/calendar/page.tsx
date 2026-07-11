import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CalendarClient from './CalendarClient'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>Could not retrieve your user profile. Please try logging in again.</p>
      </div>
    )
  }

  const role = profile.role

  // 3. Resolve role-specific target audience contexts
  let studentRecord = null
  const childrenClassIds: string[] = []
  const childrenSections: string[] = []
  const teacherClassIds: string[] = []
  const teacherSections: string[] = []

  if (role === 'Student') {
    const { data } = await supabase
      .from('students')
      .select('id, class_id, section')
      .eq('id', user.id)
      .maybeSingle()
    
    studentRecord = data
  } else if (role === 'Parent') {
    const { data: parentStudents } = await supabase
      .from('student_parents')
      .select(`
        student_id,
        students (
          id,
          class_id,
          section
        )
      `)
      .eq('parent_id', user.id)
    
    if (parentStudents) {
      parentStudents.forEach(link => {
        const student = link.students as any
        if (student) {
          if (student.class_id) childrenClassIds.push(student.class_id)
          if (student.section) childrenSections.push(student.section)
        }
      })
    }
  } else if (role === 'Teacher') {
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select(`
        classes (id, name, section)
      `)
      .eq('teacher_id', user.id)

    if (classSubjects) {
      classSubjects.forEach(cs => {
        const cls = cs.classes as any
        if (cls) {
          if (cls.id) teacherClassIds.push(cls.id)
          if (cls.section) teacherSections.push(cls.section)
        }
      })
    }
  }

  // 4. Fetch all events
  const { data: allEvents, error: eventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_date', { ascending: true })

  if (eventsError) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Error Loading Calendar</h2>
        <p>{eventsError.message}</p>
      </div>
    )
  }

  // 5. Fetch classes for creation form
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name, section')
    .order('name', { ascending: true })

  const classes = classesData || []

  // Extract unique sections from database classes
  const sections = Array.from(new Set(classes.map(c => c.section).filter(Boolean)))
  const defaultSections = ['Kindergarten', 'Primary', 'Middle School', 'Senior School']
  const availableSections = sections.length > 0 ? sections : defaultSections

  // 6. Perform target audience filtering
  const isAdminOrStaff = ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Clinic', 'Transport', 'Teacher'].includes(role)

  const filteredEvents = (allEvents || []).filter(event => {
    // Admins and management see all events
    if (['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section'].includes(role)) {
      return true
    }

    // A. All School target audience
    if (event.target_audience === 'All School') {
      return true
    }

    // B. Section target audience
    if (event.target_audience === 'Section') {
      if (role === 'Student' && studentRecord) {
        return event.audience_ids?.includes(studentRecord.section)
      }
      if (role === 'Parent') {
        return event.audience_ids?.some((sec: string) => childrenSections.includes(sec))
      }
      if (role === 'Teacher') {
        return event.audience_ids?.some((sec: string) => teacherSections.includes(sec))
      }
      // Non-teaching general staff (Accountant, Clinic, Transport) can see section events
      if (isAdminOrStaff) {
        return true
      }
    }

    // C. Class target audience
    if (event.target_audience === 'Class') {
      if (role === 'Student' && studentRecord) {
        return event.audience_ids?.includes(studentRecord.class_id)
      }
      if (role === 'Parent') {
        return event.audience_ids?.some((cid: string) => childrenClassIds.includes(cid))
      }
      if (role === 'Teacher') {
        return event.audience_ids?.some((cid: string) => teacherClassIds.includes(cid))
      }
      // General staff see class events
      if (isAdminOrStaff) {
        return true
      }
    }

    return false
  })

  return (
    <CalendarClient
      events={filteredEvents as any}
      classes={classes}
      availableSections={availableSections}
      userRole={role}
      userId={user.id}
    />
  )
}
