'use client'

import { useState, useRef } from 'react'
import { Camera, Trash2, AlertCircle } from 'lucide-react'

interface StudentPhotoManagerProps {
  studentId: string
  currentPhotoUrl: string | null
  studentName: string
  onUploaded?: (url: string | null) => void
}

export default function StudentPhotoManager({
  studentId,
  currentPhotoUrl,
  studentName,
  onUploaded
}: StudentPhotoManagerProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('student_id', studentId)
    formData.append('photo', file)

    try {
      const res = await fetch('/api/students/photo', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setPhotoUrl(data.photo_url)
      if (onUploaded) onUploaded(data.photo_url)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error uploading photo')
      // Clear error after 4 seconds
      setTimeout(() => setError(null), 4000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to remove this student photo?')) return

    setUploading(true)
    setError(null)

    try {
      const res = await fetch(`/api/students/photo?student_id=${studentId}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove photo')
      }

      setPhotoUrl(null)
      if (onUploaded) onUploaded(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error removing photo')
      setTimeout(() => setError(null), 4000)
    } finally {
      setUploading(false)
    }
  }

  const triggerSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Get initials for placeholder
  const getInitials = () => {
    return studentName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
      
      {/* Photo Container */}
      <div 
        onClick={triggerSelectFile}
        style={{
          width: '72px',
          height: '90px',
          borderRadius: '4px',
          border: '2px dashed var(--color-border)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)'
        }}
        title="Click to upload student photo"
      >
        {photoUrl ? (
          <>
            <img 
              src={photoUrl} 
              alt={studentName} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {/* Trash button overlay */}
            <button
              onClick={handleDelete}
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease'
              }}
              title="Remove photo"
            >
              <Trash2 size={10} />
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 179, 195, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.8rem',
              marginBottom: '0.25rem'
            }}>
              {getInitials()}
            </div>
            <Camera size={12} style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}

        {/* Uploading Overlay */}
        {uploading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 500
          }}>
            Uploading...
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      {/* Error Tooltip */}
      {error && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          backgroundColor: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '0.35rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.65rem',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <AlertCircle size={10} />
          {error}
        </div>
      )}
    </div>
  )
}
