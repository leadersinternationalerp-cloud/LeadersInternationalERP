'use client'

import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  Globe, 
  Mail, 
  HelpCircle,
  Phone,
  Building,
  User,
  Info
} from 'lucide-react'

interface SenderProfile {
  name: string
  about?: string
  address?: string
  description?: string
  logo_url?: string
  vertical?: string
  websites?: Array<{ website: string; label: string }>
  emails?: Array<{ email: string; label: string }>
}

interface WhatsAppSender {
  sid: string
  status: string
  senderId: string
  configuration?: any
  webhook?: any
  profile?: SenderProfile
}

export default function TwilioSendersPage() {
  const [senders, setSenders] = useState<WhatsAppSender[]>([])
  const [defaultSender, setDefaultSender] = useState<string>('')
  const [accountSid, setAccountSid] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modals / Form states
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false)
  const [registerLoading, setRegisterLoading] = useState<boolean>(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [selectedSender, setSelectedSender] = useState<WhatsAppSender | null>(null)

  // Form Fields
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [profileName, setProfileName] = useState<string>('')
  const [profileVertical, setProfileVertical] = useState<string>('Other')
  const [profileAbout, setProfileAbout] = useState<string>('')
  const [profileDescription, setProfileDescription] = useState<string>('')
  const [profileAddress, setProfileAddress] = useState<string>('')
  const [profileWebsite, setProfileWebsite] = useState<string>('')
  const [profileEmail, setProfileEmail] = useState<string>('')

  // Load senders on mount
  useEffect(() => {
    fetchSenders()
  }, [])

  async function fetchSenders() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/senders')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch senders')
      }
      setSenders(data.senders || [])
      setDefaultSender(data.defaultSender || '')
      setAccountSid(data.accountSid || '')
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading Twilio senders.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSetDefault(senderId: string) {
    try {
      const res = await fetch('/api/whatsapp/senders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultSenderId: senderId })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set default sender')
      }
      setDefaultSender(senderId)
    } catch (err: any) {
      alert(err.message || 'Failed to update default sender.')
    }
  }

  async function handleDeleteSender(sid: string) {
    if (!confirm('Are you sure you want to delete this WhatsApp sender from Twilio? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/whatsapp/senders?sid=${sid}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete sender')
      }
      // Remove from state
      setSenders(prev => prev.filter(s => s.sid !== sid))
      if (selectedSender && selectedSender.sid === sid) {
        setSelectedSender(null)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete sender.')
    }
  }

  async function handleRegisterSender(e: React.FormEvent) {
    e.preventDefault()
    setRegisterLoading(true)
    setRegisterError(null)

    // Format phone number (ensure whatsapp:+ prefix)
    let formattedSenderId = phoneNumber.trim()
    if (!formattedSenderId.startsWith('whatsapp:')) {
      // Remove leading '+' or spaces if they are typed
      const cleanPhone = formattedSenderId.replace(/\s+/g, '').replace(/^\+/, '')
      formattedSenderId = `whatsapp:+${cleanPhone}`
    }

    const payload = {
      senderId: formattedSenderId,
      profile: {
        name: profileName.trim(),
        vertical: profileVertical,
        about: profileAbout.trim() || undefined,
        address: profileAddress.trim() || undefined,
        description: profileDescription.trim() || undefined,
        websites: profileWebsite.trim() ? [{ website: profileWebsite.trim(), label: 'Website' }] : [],
        emails: profileEmail.trim() ? [{ email: profileEmail.trim(), label: 'Support Email' }] : []
      }
    }

    try {
      const res = await fetch('/api/whatsapp/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register sender')
      }
      
      // Refresh list, close modal, clear fields
      await fetchSenders()
      setShowRegisterModal(false)
      setPhoneNumber('')
      setProfileName('')
      setProfileAbout('')
      setProfileDescription('')
      setProfileAddress('')
      setProfileWebsite('')
      setProfileEmail('')
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to register sender on Twilio.')
    } finally {
      setRegisterLoading(false)
    }
  }

  function getStatusStyle(status: string) {
    const s = status.toUpperCase()
    if (s === 'ONLINE') {
      return { bg: 'rgba(16, 185, 129, 0.1)', fg: 'var(--color-success)', text: 'Online / Active' }
    }
    if (s === 'CREATING' || s === 'VERIFYING' || s === 'TWILIO_REVIEW') {
      return { bg: 'rgba(245, 158, 11, 0.1)', fg: 'var(--color-warning)', text: status }
    }
    if (s === 'PENDING_VERIFICATION') {
      return { bg: 'rgba(59, 130, 246, 0.1)', fg: '#3b82f6', text: 'Pending Verification' }
    }
    return { bg: 'rgba(239, 68, 68, 0.1)', fg: 'var(--color-error)', text: status }
  }

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <a href="/dashboard/admin/integrations" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          cursor: 'pointer'
        }}>
          <ArrowLeft size={18} />
        </a>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', fontWeight: 700 }}>Twilio WhatsApp Senders</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Register and manage WhatsApp Business phone numbers registered via Twilio.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Side: Senders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="stat-card">
              <div className="stat-label">Twilio Account SID</div>
              <div className="stat-value" style={{ fontSize: '1.25rem', fontFamily: 'monospace' }}>
                {loading ? '...' : accountSid || 'Not Found'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Senders</div>
              <div className="stat-value">{loading ? '...' : senders.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Default Sender</div>
              <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--color-secondary)' }}>
                {loading ? '...' : (defaultSender ? defaultSender.replace('whatsapp:', '') : 'None Selected')}
              </div>
            </div>
          </div>

          {/* Senders Table Container */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ 
              padding: '1.25rem', 
              borderBottom: '1px solid var(--color-border)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.01)'
            }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>WhatsApp Phone Numbers</h2>
              <button 
                onClick={() => setShowRegisterModal(true)} 
                className="btn-primary" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem',
                  borderRadius: 'var(--radius-btn)',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Register Sender
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
                <Loader2 className="animate-spin" size={24} />
                <span>Loading WhatsApp senders from Twilio...</span>
              </div>
            ) : error ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <AlertCircle size={40} style={{ color: 'var(--color-error)', marginBottom: '1rem' }} />
                <h3 style={{ color: 'var(--color-error)', marginBottom: '0.5rem' }}>Failed to Load Senders</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                  {error}
                </p>
                <button onClick={fetchSenders} className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Retry</button>
              </div>
            ) : senders.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Info size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3>No Registered WhatsApp Senders</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0.5rem auto 1.5rem auto' }}>
                  You have not registered any WhatsApp business senders in this ERP. Use the Register Sender button to link a number.
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Phone Number</th>
                    <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Display Name</th>
                    <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {senders.map((sender) => {
                    const isDefault = sender.senderId === defaultSender
                    const statusInfo = getStatusStyle(sender.status)
                    
                    return (
                      <tr key={sender.sid} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{sender.senderId.replace('whatsapp:', '')}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                              SID: {sender.sid}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {sender.profile?.name || <em style={{ color: 'var(--color-text-muted)' }}>No display name</em>}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '0.25rem 0.6rem', 
                            borderRadius: '1rem', 
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.fg,
                            display: 'inline-block'
                          }}>
                            {statusInfo.text}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => setSelectedSender(sender)}
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              Details
                            </button>
                            
                            {sender.status.toUpperCase() === 'ONLINE' && !isDefault && (
                              <button
                                onClick={() => handleSetDefault(sender.senderId)}
                                className="btn-secondary"
                                style={{ 
                                  padding: '0.35rem 0.75rem', 
                                  fontSize: '0.8rem', 
                                  borderColor: 'var(--color-secondary)',
                                  color: 'var(--color-secondary)',
                                  cursor: 'pointer'
                                }}
                              >
                                Set Default
                              </button>
                            )}

                            {isDefault && (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem', 
                                color: 'var(--color-success)', 
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                paddingRight: '0.5rem'
                              }}>
                                <Check size={14} /> Default
                              </span>
                            )}

                            <button
                              onClick={() => handleDeleteSender(sender.sid)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--color-error)', 
                                padding: '0.5rem', 
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              title="Delete Sender"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Sandbox Help Panel & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Trial Sandbox Instructions */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
              <HelpCircle size={18} style={{ color: 'var(--color-secondary)' }} />
              WhatsApp Trial Sandbox
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p>
                Because you are on a <strong>Trial Twilio Account</strong>, you can only send WhatsApp messages to phone numbers that have explicitly opted into your Sandbox.
              </p>
              <div style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                border: '1px solid var(--color-border)', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)', 
                fontFamily: 'monospace',
                fontSize: '0.8rem'
              }}>
                <strong>Sandbox Testing Steps:</strong>
                <ol style={{ paddingLeft: '1.2rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Open WhatsApp on your phone.</li>
                  <li>Send your Twilio Sandbox join keyword (e.g. <code>join sandbox-word</code>) to your sandbox phone number.</li>
                  <li>Once opt-in is confirmed, try triggering receipts to that phone number!</li>
                </ol>
              </div>
              <p>
                <strong>Production Upgrades:</strong> To send to any student/parent number without this opt-in, upgrade your Twilio project, submit a WABA Business profile, and get Meta display name approval.
              </p>
            </div>
          </div>

          {/* Selected Sender Profile Details */}
          {selectedSender && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Profile Details</h3>
                <button 
                  onClick={() => setSelectedSender(null)} 
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div>
                  <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>Business Name</strong>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedSender.profile?.name || 'N/A'}</span>
                </div>
                {selectedSender.profile?.vertical && (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>Industry / Vertical</strong>
                    <span>{selectedSender.profile.vertical}</span>
                  </div>
                )}
                {selectedSender.profile?.about && (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>About</strong>
                    <p style={{ marginTop: '0.2rem' }}>{selectedSender.profile.about}</p>
                  </div>
                )}
                {selectedSender.profile?.description && (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>Description</strong>
                    <p style={{ marginTop: '0.2rem' }}>{selectedSender.profile.description}</p>
                  </div>
                )}
                {selectedSender.profile?.address && (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>Address</strong>
                    <span>{selectedSender.profile.address}</span>
                  </div>
                )}
                {selectedSender.profile?.websites && selectedSender.profile.websites.length > 0 && (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>Websites</strong>
                    {selectedSender.profile.websites.map((w, idx) => (
                      <a key={idx} href={w.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', textDecoration: 'none' }}>
                        <Globe size={12} /> {w.website}
                      </a>
                    ))}
                  </div>
                )}
                {selectedSender.profile?.emails && selectedSender.profile.emails.length > 0 && (
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-muted)' }}>Emails</strong>
                    {selectedSender.profile.emails.map((e, idx) => (
                      <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                        <Mail size={12} /> {e.email}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Register WhatsApp Sender */}
      {showRegisterModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.4)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{ 
            width: '100%', 
            maxWidth: '520px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            padding: '2rem', 
            borderRadius: 'var(--radius-xl)', 
            boxShadow: 'var(--shadow-xl)',
            position: 'relative'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
              Register WhatsApp Sender
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Register a phone number linked to your Twilio WABA. Business Display Names must adhere to Meta guidelines.
            </p>

            {registerError && (
              <div style={{ 
                padding: '0.75rem 1rem', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: 'var(--color-error)', 
                borderRadius: 'var(--radius-md)', 
                marginBottom: '1rem', 
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSender} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Phone Number (E.164 format)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    whatsapp:
                  </span>
                  <input 
                    type="text" 
                    required 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                    placeholder="+255712345678" 
                  />
                </div>
                <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  Include the country code. E.g., +255 712 345 678
                </small>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Business Display Name
                </label>
                <input 
                  type="text" 
                  required 
                  value={profileName} 
                  onChange={e => setProfileName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                  placeholder="Leaders International School" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Industry / Vertical
                  </label>
                  <select 
                    value={profileVertical} 
                    onChange={e => setProfileVertical(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', backgroundColor: 'var(--color-surface)' }}
                  >
                    <option value="Education">Education</option>
                    <option value="Medical and Health">Medical and Health</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Public Service">Public Service</option>
                    <option value="Non-profit">Non-profit</option>
                    <option value="Shopping and Retail">Shopping and Retail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Support Email
                  </label>
                  <input 
                    type="email" 
                    value={profileEmail} 
                    onChange={e => setProfileEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                    placeholder="support@leaders.ac.tz" 
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Website URL
                </label>
                <input 
                  type="url" 
                  value={profileWebsite} 
                  onChange={e => setProfileWebsite(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                  placeholder="https://www.leaders.ac.tz" 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Business Address
                </label>
                <input 
                  type="text" 
                  value={profileAddress} 
                  onChange={e => setProfileAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                  placeholder="123 Mwai Kibaki Rd, Dar es Salaam" 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  About Text (Short Status)
                </label>
                <input 
                  type="text" 
                  value={profileAbout} 
                  maxLength={139}
                  onChange={e => setProfileAbout(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem' }} 
                  placeholder="Official WhatsApp channel for Leaders International." 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description
                </label>
                <textarea 
                  value={profileDescription} 
                  onChange={e => setProfileDescription(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.9rem', fontFamily: 'inherit' }} 
                  placeholder="Provide details about the business services." 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRegisterModal(false)} 
                  className="btn-secondary" 
                  style={{ padding: '0.6rem 1.25rem', cursor: 'pointer' }}
                  disabled={registerLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                  disabled={registerLoading}
                >
                  {registerLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Sender</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
