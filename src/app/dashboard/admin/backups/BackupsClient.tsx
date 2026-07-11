'use client'

import { useState } from 'react'
import { triggerBackupAction, getBackupDownloadUrlAction } from './actions'

interface Backup {
  id: string
  file_name: string
  file_size_kb: number
  status: 'Pending' | 'Completed' | 'Failed'
  created_at: string
  profiles?: {
    first_name: string
    last_name: string
  }
}

interface BackupsClientProps {
  initialBackups: any[]
}

export default function BackupsClient({ initialBackups }: BackupsClientProps) {
  const [backups, setBackups] = useState<Backup[]>(initialBackups)
  const [isTriggering, setIsTriggering] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleTriggerBackup() {
    setIsTriggering(true)
    setMessage(null)

    try {
      const result = await triggerBackupAction()
      if (result.error) {
        throw new Error(result.error)
      }

      setMessage({ type: 'success', text: `Backup successfully generated: ${result.fileName}` })
      
      // Refresh local list (we can fetch again or append)
      // Since it's simulated, we'll reload the page window to get database updates
      window.location.reload()
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Failed to trigger backup' })
      setIsTriggering(false)
    }
  }

  async function handleDownloadBackup(fileName: string) {
    try {
      const result = await getBackupDownloadUrlAction(fileName)
      if (result.error) {
        throw new Error(result.error)
      }
      if (result.url) {
        window.open(result.url, '_blank')
      }
    } catch (err: any) {
      console.error(err)
      alert(`Could not download backup file: ${err.message}`)
    }
  }

  function formatSize(kb: number) {
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`
    }
    return `${kb} KB`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Database Backups</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Generate manual SQL dumps and view historical database backups.</p>
        </div>
        <button
          onClick={handleTriggerBackup}
          className="btn btn-primary"
          disabled={isTriggering}
          style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isTriggering ? (
            <>
              <span className="spinner" style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
              Generating Dump...
            </>
          ) : (
            <>
              <span>💾</span> Trigger Manual Backup
            </>
          )}
        </button>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
          borderLeft: `4px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Backups List */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '1rem' }}>File Name</th>
                <th style={{ padding: '1rem' }}>File Size</th>
                <th style={{ padding: '1rem' }}>Triggered By</th>
                <th style={{ padding: '1rem' }}>Created At</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => {
                const userFullName = backup.profiles ? `${backup.profiles.first_name} ${backup.profiles.last_name}` : 'System'
                const formattedTime = new Date(backup.created_at).toLocaleString()

                return (
                  <tr key={backup.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 150ms' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>{backup.file_name}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {formatSize(backup.file_size_kb)}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {userFullName}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {formattedTime}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {backup.status === 'Completed' ? (
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--color-success)'
                        }}>
                          Completed
                        </span>
                      ) : backup.status === 'Pending' ? (
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(247, 178, 57, 0.1)',
                          color: 'var(--color-accent)'
                        }}>
                          Pending
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--color-error)'
                        }}>
                          Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {backup.status === 'Completed' && (
                        <button
                          onClick={() => handleDownloadBackup(backup.file_name)}
                          className="btn"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            backgroundColor: 'rgba(59, 179, 195, 0.1)',
                            color: 'var(--color-secondary)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          ⬇️ Download
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}

              {backups.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No historical backups found. Click &quot;Trigger Manual Backup&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
