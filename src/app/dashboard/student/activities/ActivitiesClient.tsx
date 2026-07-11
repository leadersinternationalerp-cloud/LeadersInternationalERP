'use client'

import React, { useState } from 'react'

export interface ClassActivity {
  id: string
  title: string
  subject: string
  date: string
  description: string
  attachment_url?: string
}

export default function ActivitiesClient({ activities }: { activities: ClassActivity[] }) {
  const [tab, setTab] = useState<'Upcoming' | 'Past' | 'All'>('Upcoming')
  
  const now = new Date()
  
  const filtered = activities.filter(a => {
    if (tab === 'All') return true
    const aDate = new Date(a.date)
    if (tab === 'Upcoming') return aDate >= now
    if (tab === 'Past') return aDate < now
    return true
  })

  // Sort by date (Upcoming: closest first, Past: most recent first)
  filtered.sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    return tab === 'Upcoming' ? da - db : db - da
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {['Upcoming', 'Past', 'All'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            style={{
              padding: '0.5rem 1rem',
              background: tab === t ? 'var(--color-surface)' : 'transparent',
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              fontWeight: tab === t ? 600 : 500,
              cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {filtered.map(act => (
          <div key={act.id} className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', margin: 0 }}>{act.title}</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '999px', color: 'var(--color-secondary)' }}>
                {act.subject}
              </span>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📅</span> {new Date(act.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', margin: 0, flex: 1 }}>
              {act.description}
            </p>
            
            {act.attachment_url && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <a href={act.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                  📎 Download Attachment
                </a>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', gridColumn: '1 / -1' }}>
            No {tab.toLowerCase()} activities found.
          </div>
        )}
      </div>
    </div>
  )
}
