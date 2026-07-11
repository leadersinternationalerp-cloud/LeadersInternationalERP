'use client'

import { useState } from 'react'
import { submitReportAction } from './actions'
import { createClient } from '@/utils/supabase/client'

export default function ReportForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

      // Upload to 'lesson_plans' bucket as it is pre-configured and accessible
      const { data, error } = await supabase.storage
        .from('lesson_plans')
        .upload(fileName, file)

      if (error) {
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('lesson_plans')
        .getPublicUrl(fileName)

      setAttachmentUrl(publicUrl)
      setMessage({ type: 'success', text: 'File uploaded successfully!' })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: `Storage upload failed: ${err.message}. You can still paste a URL manually.` })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    if (attachmentUrl) {
      formData.set('attachment_url', attachmentUrl)
    }

    try {
      const result = await submitReportAction(formData)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Report submitted successfully!' })
        // Reset form
        ;(e.target as HTMLFormElement).reset()
        setAttachmentUrl('')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Submit New Report</h2>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
          borderLeft: `4px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label">Report Title</label>
          <input type="text" name="title" placeholder="e.g. Q2 Academic Progress Report" className="input-field" required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <select name="report_type" className="input-field" required>
              <option value="Academic">Academic</option>
              <option value="Financial">Financial</option>
              <option value="Administrative">Administrative</option>
              <option value="Staff">Staff</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Submit To</label>
            <select name="submit_to" className="input-field" required>
              <option value="Principal">Principal</option>
              <option value="Director">Director</option>
              <option value="Both">Both</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Upload Attachment (Optional)</label>
          <input type="file" onChange={handleFileUpload} className="input-field" style={{ padding: '0.5rem' }} disabled={uploading} />
          {uploading && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Uploading file...</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Or Attachment URL</label>
          <input 
            type="url" 
            name="attachment_url" 
            placeholder="https://example.com/document.pdf" 
            className="input-field" 
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Report Content</label>
          <textarea 
            name="content" 
            placeholder="Write the summary or full content of the report here... Note: For financial reports, mention amounts clearly (e.g. 1500000 TZS)." 
            className="input-field" 
            style={{ minHeight: '150px', resize: 'vertical' }} 
            required 
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }} disabled={loading || uploading}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  )
}
