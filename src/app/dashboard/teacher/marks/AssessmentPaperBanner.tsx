'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, ExternalLink, CheckCircle2 } from 'lucide-react'

interface PaperInfo {
  id: string
  file_url: string
  file_name: string
  updated_at: string
}

interface Props {
  classId: string
  subjectId: string
  assessmentType: string
  term: string
}

export default function AssessmentPaperBanner({
  classId,
  subjectId,
  assessmentType,
  term,
}: Props) {
  const [paper, setPaper] = useState<PaperInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      class_id: classId,
      subject_id: subjectId,
      assessment_type: assessmentType,
      term,
    })
    fetch(`/api/assessments/paper?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (active) {
          setPaper(json?.data?.paper || json?.paper || null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [classId, subjectId, assessmentType, term])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('class_id', classId)
      fd.append('subject_id', subjectId)
      fd.append('assessment_type', assessmentType)
      fd.append('term', term)

      const res = await fetch('/api/assessments/paper', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error?.message || json?.error || 'Failed to upload PDF')
      } else {
        setPaper(json?.data?.paper || json?.paper || null)
      }
    } catch {
      setError('Network error while uploading PDF')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div
      className="glass-panel"
      style={{
        padding: '0.9rem 1.25rem',
        marginBottom: '1.25rem',
        borderRadius: 'var(--radius-md)',
        borderLeft: paper ? '4px solid var(--color-success)' : '4px solid var(--color-warning)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {paper ? (
          <CheckCircle2 size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        ) : (
          <FileText size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {loading
              ? 'Checking question paper archive...'
              : paper
              ? `Question Paper Uploaded: ${paper.file_name}`
              : `No Question Paper PDF attached for ${assessmentType}`}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Attach a PDF copy of this {assessmentType} paper for coordinator &amp; academic archive review.
          </div>
          {error && (
            <div style={{ fontSize: '0.78rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {paper && (
          <a
            href={paper.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem', textDecoration: 'none' }}
          >
            <ExternalLink size={14} /> View PDF
          </a>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
        >
          <Upload size={14} />
          {uploading ? 'Uploading...' : paper ? 'Replace PDF' : 'Upload Paper PDF'}
        </button>
      </div>
    </div>
  )
}
