'use client'

import { useState } from 'react'
import Link from 'next/link'

type Notification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  link_url?: string
}

export default function NotificationsClient({
  initialNotifications,
  markReadAction
}: {
  initialNotifications: Notification[]
  markReadAction: (id: string) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')

  const filteredNotifications = initialNotifications.filter(n => {
    if (activeTab === 'unread') return !n.is_read
    if (activeTab === 'read') return n.is_read
    return true
  })

  const tabStyle = (tab: string) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: activeTab === tab ? 600 : 500,
    backgroundColor: 'transparent',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    fontSize: '0.9rem'
  })

  return (
    <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>
          All
        </button>
        <button style={tabStyle('unread')} onClick={() => setActiveTab('unread')}>
          Unread
        </button>
        <button style={tabStyle('read')} onClick={() => setActiveTab('read')}>
          Read
        </button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredNotifications.map(notif => (
          <div
            key={notif.id}
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: notif.is_read ? 'transparent' : 'rgba(59, 179, 195, 0.05)',
              transition: 'background-color 200ms'
            }}
          >
            <div style={{ flex: 1, paddingRight: '2rem' }}>
              <div style={{
                fontWeight: notif.is_read ? 400 : 600,
                color: notif.is_read ? 'var(--color-text)' : 'var(--color-primary)'
              }}>
                {notif.message}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {new Date(notif.created_at).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {notif.link_url && (
                <Link href={notif.link_url} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                  View details
                </Link>
              )}

              {!notif.is_read && (
                <form action={markReadAction.bind(null, notif.id)}>
                  <button type="submit" style={{
                    background: 'transparent', border: 'none', color: 'var(--color-secondary)',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                  }}>
                    Mark read
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No {activeTab !== 'all' ? activeTab : ''} notifications found.
          </div>
        )}
      </div>
    </div>
  )
}
