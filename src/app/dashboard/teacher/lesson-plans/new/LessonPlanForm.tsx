'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitLessonPlanAction } from '../actions'
import { Upload, FileText, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export function LessonPlanForm({ classSubjects }: { classSubjects: any[], teacherId?: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData(e.currentTarget)
      const res = await submitLessonPlanAction(formData)

      if (res.error) {
        setError(res.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard/teacher/lesson-plans')
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
    } else {
      setSelectedFileName(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && (
        <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <CheckCircle2 size={18} />
          <span>Lesson Plan submitted successfully! Redirecting to your dashboard...</span>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" style={{ fontWeight: 600 }}>Class & Subject</label>
        <select name="class_subject" className="input-field" required style={{ fontSize: '0.95rem' }}>
          <option value="">Select class and subject...</option>
          {classSubjects.map(cs => (
            <option key={cs.id} value={`${cs.class_id}|${cs.subject_id}`}>
              {cs.classes.name} — {cs.subjects.name}
            </option>
          ))}
        </select>
        {classSubjects.length === 0 && (
          <span style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.25rem' }}>
            No subject assignments found for your account. Please contact your school administrator.
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Term</label>
          <select name="term" className="input-field" required defaultValue="Term 1" style={{ fontSize: '0.95rem' }}>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Week Number</label>
          <input
            type="number"
            name="week_number"
            min="1"
            max="20"
            defaultValue="1"
            className="input-field"
            required
            style={{ fontSize: '0.95rem' }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ fontWeight: 600 }}>Academic Year</label>
        <input
          type="text"
          name="academic_year"
          defaultValue="2025-2026"
          className="input-field"
          required
          style={{ fontSize: '0.95rem' }}
        />
      </div>

      {/* Custom Drag and Drop File Input Box */}
      <div className="form-group">
        <label className="form-label" style={{ fontWeight: 600 }}>Lesson Plan Document File (PDF / DOCX / DOC)</label>
        <div
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            backgroundColor: selectedFileName ? 'rgba(59, 130, 246, 0.04)' : 'rgba(0,0,0,0.01)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            type="file"
            name="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            required
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>
            {selectedFileName ? (
              <>
                <FileText size={36} style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-primary)' }}>{selectedFileName}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Click to replace file</span>
              </>
            ) : (
              <>
                <Upload size={36} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Drag & drop file here or click to browse</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Supports PDF, Word (.doc, .docx) up to 10MB</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" style={{ fontWeight: 600 }}>Optional Teacher Notes / Objectives</label>
        <textarea
          name="teacher_comments"
          rows={3}
          className="input-field"
          placeholder="Specify key learning outcomes, special materials, or comments for HOS / Dean..."
          style={{ fontSize: '0.9rem' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <Link href="/dashboard/teacher/lesson-plans" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Cancel</span>
        </Link>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || classSubjects.length === 0}
          style={{ flex: 1, padding: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Upload size={18} />
          <span>{isSubmitting ? 'Uploading & Submitting...' : 'Submit Lesson Plan'}</span>
        </button>
      </div>
    </form>
  )
}
