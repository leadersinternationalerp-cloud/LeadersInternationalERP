'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function LessonPlanForm({ classSubjects, teacherId }: { classSubjects: any[], teacherId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData(e.currentTarget)
      const classSubjectPair = formData.get('class_subject') as string
      const [class_id, subject_id] = classSubjectPair.split('|')
      const week_number = parseInt(formData.get('week_number') as string)
      const term = formData.get('term') as string
      const file = formData.get('file') as File

      if (!file || file.size === 0) {
        throw new Error('Please select a file to upload.')
      }

      // Initialize Supabase Client (assuming ANON key allows upload based on RLS)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // 1. Upload File to Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${teacherId}-${class_id}-${subject_id}-week${week_number}-${Math.random()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lesson_plans')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('lesson_plans')
        .getPublicUrl(fileName)

      // 2. Insert into lesson_plans table
      // In a real app we'd get academic_year from settings, hardcoding 2025-2026 for now
      const { error: dbError } = await supabase
        .from('lesson_plans')
        .insert({
          teacher_id: teacherId,
          class_id,
          subject_id,
          week_number,
          term,
          academic_year: '2025-2026',
          file_url: publicUrl,
          status: 'Submitted'
        })

      if (dbError) throw dbError

      // 3. Notify Deans and Heads of Section
      try {
        const { data: teacherProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', teacherId)
          .single()

        const teacherName = teacherProfile ? `${teacherProfile.first_name} ${teacherProfile.last_name}` : 'A teacher'

        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, role, roles')

        const targetUsers = (allProfiles || []).filter(p => {
          const userRoles = p.roles && Array.isArray(p.roles) && p.roles.length > 0
            ? p.roles
            : (p.role ? p.role.split(',').map((r: string) => r.trim()) : [])
          return userRoles.includes('Head of Section') || userRoles.includes('Dean')
        })

        if (targetUsers.length > 0) {
          const notifications = targetUsers.map(u => ({
            user_id: u.id,
            message: `New lesson plan submitted by ${teacherName} (Week ${week_number}). Please review.`,
            link_url: `/dashboard/hos/lesson-plans`
          }))
          await supabase.from('notifications').insert(notifications)
        }
      } catch (notifErr) {
        console.error('Error triggering lesson plan notifications:', notifErr)
      }

      setSuccess(true)
      e.currentTarget.reset()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div className="auth-error">{error}</div>}
      {success && <div style={{ color: 'var(--color-success)', padding: '1rem', background: 'rgba(0,255,0,0.1)', borderRadius: 'var(--radius-md)' }}>Lesson Plan submitted successfully!</div>}

      <div className="form-group">
        <label className="form-label">Class & Subject</label>
        <select name="class_subject" className="input-field" required>
          <option value="">Select...</option>
          {classSubjects.map(cs => (
            <option key={cs.id} value={`${cs.class_id}|${cs.subject_id}`}>
              {cs.classes.name} - {cs.subjects.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Term</label>
          <select name="term" className="input-field" required>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Week Number</label>
          <input type="number" name="week_number" min="1" max="15" className="input-field" required />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Lesson Plan File (PDF/Word)</label>
        <input type="file" name="file" accept=".pdf,.doc,.docx" className="input-field" required />
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Uploading...' : 'Submit Lesson Plan'}
      </button>
    </form>
  )
}
