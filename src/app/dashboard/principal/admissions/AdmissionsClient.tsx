'use client'

import React, { useState, useMemo, useTransition } from 'react'
import {
  FileText,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  School,
  User,
  HeartHandshake,
  Check,
} from 'lucide-react'
import { updateApplicationStatusAction } from './actions'

export interface AdmissionApplication {
  id: string
  application_no: string
  status: 'submitted' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected' | 'enrolled' | 'cancelled'
  first_name: string
  last_name: string
  middle_name?: string | null
  date_of_birth?: string | null
  gender?: string | null
  place_of_birth?: string | null
  nationality?: string | null
  id_number?: string | null
  curriculum?: string | null
  class_applied_for: string
  academic_year?: string | null
  start_term?: string | null
  previous_school?: string | null

  parent_name: string
  parent_relationship?: string | null
  parent_occupation?: string | null
  parent_employer?: string | null
  parent_email: string
  parent_phone: string
  parent_whatsapp?: string | null
  parent_address?: string | null

  guardian2_name?: string | null
  guardian2_relationship?: string | null
  guardian2_occupation?: string | null
  guardian2_employer?: string | null
  guardian2_phone?: string | null
  guardian2_email?: string | null
  guardian2_address?: string | null

  transport_required?: boolean | null
  transport_route?: string | null
  fee_plan?: string | null
  clubs?: string[] | null
  medical_conditions?: string | null
  special_talents_interests?: string | null
  additional_notes?: string | null
  source?: string | null
  pdf_sent_to_school?: boolean | null
  email_sent_at?: string | null
  notes?: string | null
  created_at: string
}

interface Props {
  initialApplications: AdmissionApplication[]
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ size?: number }> }
> = {
  submitted: { label: 'New / Received', badgeClass: 'badge-primary', icon: Sparkles },
  under_review: { label: 'Under Review', badgeClass: 'badge-warning', icon: Clock },
  interview_scheduled: { label: 'Interview Scheduled', badgeClass: 'badge-accent', icon: Calendar },
  accepted: { label: 'Accepted', badgeClass: 'badge-success', icon: CheckCircle2 },
  enrolled: { label: 'Enrolled', badgeClass: 'badge-success', icon: Check },
  rejected: { label: 'Declined', badgeClass: 'badge-error', icon: X },
  cancelled: { label: 'Cancelled', badgeClass: 'badge-muted', icon: X },
}

export default function AdmissionsClient({ initialApplications }: Props) {
  const [applications, setApplications] = useState<AdmissionApplication[]>(initialApplications)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all')
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter((a) => a.status === 'submitted').length,
      underReview: applications.filter((a) => a.status === 'under_review').length,
      interview: applications.filter((a) => a.status === 'interview_scheduled').length,
      accepted: applications.filter((a) => a.status === 'accepted' || a.status === 'enrolled').length,
    }
  }, [applications])

  // Filtered List
  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const matchSearch =
        searchTerm === '' ||
        `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.application_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.parent_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.parent_phone.includes(searchTerm) ||
        app.class_applied_for.toLowerCase().includes(searchTerm.toLowerCase())

      const matchStatus = statusFilter === 'all' || app.status === statusFilter
      const matchCurriculum =
        curriculumFilter === 'all' ||
        (curriculumFilter === 'cambridge' &&
          (app.curriculum?.toLowerCase().includes('cambridge') ||
            app.class_applied_for.toLowerCase().includes('cambridge') ||
            app.class_applied_for.toLowerCase().includes('year'))) ||
        (curriculumFilter === 'necta' &&
          (app.curriculum?.toLowerCase().includes('necta') ||
            app.class_applied_for.toLowerCase().includes('necta') ||
            app.class_applied_for.toLowerCase().includes('grade')))

      return matchSearch && matchStatus && matchCurriculum
    })
  }, [applications, searchTerm, statusFilter, curriculumFilter])

  const openModal = (app: AdmissionApplication) => {
    setSelectedApp(app)
    setNotesInput(app.notes || '')
    setStatusMessage(null)
  }

  const handleUpdateStatus = (appId: string, nextStatus: string) => {
    startTransition(async () => {
      setStatusMessage(null)
      const res = await updateApplicationStatusAction(appId, nextStatus, notesInput || undefined)
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId
              ? {
                  ...a,
                  status: nextStatus as AdmissionApplication['status'],
                  notes: notesInput || a.notes,
                }
              : a
          )
        )
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp((prev) =>
            prev
              ? {
                  ...prev,
                  status: nextStatus as AdmissionApplication['status'],
                  notes: notesInput || prev.notes,
                }
              : null
          )
        }
        setStatusMessage(`Application status updated to "${STATUS_CONFIG[nextStatus]?.label || nextStatus}"`)
      } else {
        setStatusMessage(res.error || 'Failed to update application')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
            Student Admissions Desk
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', margin: 0 }}>
            Incoming online admissions from website, official 2027 PDF application forms, and applicant review.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            className="badge badge-primary"
            style={{
              padding: '0.45rem 1rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Sparkles size={14} color="var(--color-secondary)" />
            admissions@leaderinternationalschool.ac.tz
          </span>
        </div>
      </div>

      {/* 2. Stat Cards / KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(0, 38, 75, 0.08)' }}>
            <FileText size={20} color="var(--color-primary)" />
          </div>
          <div className="stat-label">Total Applications</div>
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
            {metrics.total}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 179, 195, 0.12)' }}>
            <Sparkles size={20} color="var(--color-secondary)" />
          </div>
          <div className="stat-label">New / Unreviewed</div>
          <div className="stat-value" style={{ color: 'var(--color-secondary)' }}>
            {metrics.submitted}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
            <Clock size={20} color="var(--color-warning)" />
          </div>
          <div className="stat-label">Under Review</div>
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {metrics.underReview}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(247, 178, 57, 0.15)' }}>
            <Calendar size={20} color="var(--color-accent)" />
          </div>
          <div className="stat-label">Interviews Scheduled</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {metrics.interview}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
            <CheckCircle2 size={20} color="var(--color-success)" />
          </div>
          <div className="stat-label">Accepted / Enrolled</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {metrics.accepted}
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
          <Search
            size={18}
            color="var(--color-text-muted)"
            style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search candidate name, reference, parent email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: '180px' }}>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">New / Received</option>
              <option value="under_review">Under Review</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="accepted">Accepted</option>
              <option value="enrolled">Enrolled</option>
              <option value="rejected">Declined</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="input-field"
              value={curriculumFilter}
              onChange={(e) => setCurriculumFilter(e.target.value)}
            >
              <option value="all">All Curricula</option>
              <option value="cambridge">Cambridge</option>
              <option value="necta">NECTA</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Applications Data Table */}
      <div className="table-wrapper">
        <table style={{ width: '100%', minWidth: '900px' }}>
          <thead>
            <tr>
              <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Application #</th>
              <th style={{ minWidth: '160px' }}>Candidate / Student</th>
              <th style={{ minWidth: '150px' }}>Class & Curriculum</th>
              <th style={{ width: '220px', maxWidth: '240px' }}>Parent / Contact</th>
              <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Submitted</th>
              <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ width: '180px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-text-muted)' }}>
                  <FileText size={36} color="var(--color-border)" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text)' }}>
                    No admission applications found
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                    Adjust your search query or filters to inspect incoming forms.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((app) => {
                const conf = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
                const dateDisplay = app.created_at
                  ? new Date(app.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'

                return (
                  <tr key={app.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(0, 38, 75, 0.06)',
                          color: 'var(--color-primary)',
                          border: '1px solid rgba(0, 38, 75, 0.1)',
                          display: 'inline-block',
                        }}
                      >
                        {app.application_no}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {app.first_name} {app.last_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        {app.gender ? `${app.gender} • ` : ''}
                        {app.date_of_birth ? `DOB: ${app.date_of_birth}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {app.class_applied_for}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {app.curriculum || 'Cambridge Curriculum'}
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.parent_name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--color-text-muted)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          marginTop: '0.2rem',
                          maxWidth: '220px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                          <Phone size={12} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                          <span>{app.parent_phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Mail size={12} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                          <a
                            href={`mailto:${app.parent_email}`}
                            title={app.parent_email}
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              maxWidth: '190px',
                              color: 'var(--color-secondary)',
                              textDecoration: 'none',
                            }}
                          >
                            {app.parent_email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {dateDisplay}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`badge ${conf.badgeClass}`}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'currentColor',
                          }}
                        />
                        {conf.label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {/* Download Official PDF */}
                        <a
                          href={`/api/admissions/apply?reference=${encodeURIComponent(app.application_no)}&download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-primary"
                          title="Download Official 3-Page 2027 Admission Form PDF"
                        >
                          <Download size={14} /> PDF Form
                        </a>

                        {/* Review / Details Modal */}
                        <button
                          type="button"
                          onClick={() => openModal(app)}
                          className="btn btn-sm btn-secondary"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Application Details & Review Modal */}
      {selectedApp && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-xl)',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>
                    {selectedApp.first_name} {selectedApp.middle_name ? `${selectedApp.middle_name} ` : ''}
                    {selectedApp.last_name}
                  </h2>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.6rem',
                      backgroundColor: 'rgba(59, 179, 195, 0.1)',
                      color: 'var(--color-secondary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {selectedApp.application_no}
                  </span>
                  <span className={`badge ${STATUS_CONFIG[selectedApp.status]?.badgeClass || 'badge-primary'}`}>
                    {STATUS_CONFIG[selectedApp.status]?.label || selectedApp.status}
                  </span>
                </div>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Applying for <strong>{selectedApp.class_applied_for}</strong> ({selectedApp.curriculum || 'Cambridge Curriculum'}) • Received on{' '}
                  {selectedApp.created_at
                    ? new Date(selectedApp.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Message Notification */}
            {statusMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Official PDF Download Hero Card */}
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid rgba(59, 179, 195, 0.3)',
                background: 'linear-gradient(135deg, rgba(59, 179, 195, 0.08) 0%, rgba(0, 38, 75, 0.04) 100%)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Official 2027 Admission Form PDF
                </h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  The 3-page stamped legal admission form filled with all candidate, parent, and co-curricular details.
                </p>
              </div>

              <a
                href={`/api/admissions/apply?reference=${encodeURIComponent(selectedApp.application_no)}&download=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.4rem' }}
              >
                <Download size={16} /> Download Official PDF
              </a>
            </div>

            {/* Section 1: Candidate Details */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <User size={14} color="var(--color-secondary)" /> 1. Student Information
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Full Name</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.first_name} {selectedApp.middle_name || ''} {selectedApp.last_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Date of Birth</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.date_of_birth || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Gender</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.gender || 'Not specified'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Place of Birth</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.place_of_birth || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Nationality</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.nationality || 'Tanzanian'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Birth Cert / Passport ID</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.id_number || '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Class Applied For</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {selectedApp.class_applied_for} ({selectedApp.curriculum || 'Cambridge'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Previous School</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.previous_school || 'None / Fresh Start'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Parent / Guardian Information */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <HeartHandshake size={14} color="var(--color-secondary)" /> 2. Parent & Guardian Contact
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Primary Contact</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.parent_name} ({selectedApp.parent_relationship || 'Parent'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Occupation & Employer</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.parent_occupation ? `${selectedApp.parent_occupation}` : '—'}
                    {selectedApp.parent_employer ? ` at ${selectedApp.parent_employer}` : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Phone Number</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{selectedApp.parent_phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Email Address</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>
                    <a href={`mailto:${selectedApp.parent_email}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {selectedApp.parent_email}
                    </a>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Residential Address</div>
                  <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                    {selectedApp.parent_address || '—'}
                  </div>
                </div>

                {/* Secondary Guardian if provided */}
                {selectedApp.guardian2_name && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      borderTop: '1px dashed var(--color-border)',
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Secondary Parent / Guardian:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.25rem' }}>
                      <span>
                        <strong>{selectedApp.guardian2_name}</strong> ({selectedApp.guardian2_relationship || 'Guardian'})
                      </span>
                      {selectedApp.guardian2_occupation && (
                        <span>
                          {selectedApp.guardian2_occupation} ({selectedApp.guardian2_employer || '—'})
                        </span>
                      )}
                      <span>📞 {selectedApp.guardian2_phone}</span>
                      {selectedApp.guardian2_email && <span>✉️ {selectedApp.guardian2_email}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Services & Co-curricular */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-muted)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <School size={14} color="var(--color-secondary)" /> 3. Services, Term & Activities
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>School Transport</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.transport_required ? '✅ Required' : '❌ Not required'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Fee Plan</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.fee_plan || 'Standard Termly'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Intake Term</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {selectedApp.start_term || 'January 2027'}
                  </div>
                </div>

                {selectedApp.clubs && selectedApp.clubs.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                      Selected Co-Curricular Clubs & Activities:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {selectedApp.clubs.map((club, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ padding: '0.3rem 0.75rem' }}>
                          {club}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedApp.medical_conditions && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Medical Conditions</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                      {selectedApp.medical_conditions}
                    </div>
                  </div>
                )}

                {selectedApp.additional_notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Additional Notes</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                      {selectedApp.additional_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Admissions Staff Action & Status Management */}
            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary)',
                }}
              >
                Admissions Status & Staff Review
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Update Application Status
                  </label>
                  <select
                    className="input-field"
                    value={selectedApp.status}
                    disabled={isPending}
                    onChange={(e) => handleUpdateStatus(selectedApp.id, e.target.value)}
                  >
                    <option value="submitted">New / Received</option>
                    <option value="under_review">Under Review</option>
                    <option value="interview_scheduled">Interview / Assessment Scheduled</option>
                    <option value="accepted">Accepted (Offer Letter Issued)</option>
                    <option value="enrolled">Enrolled in Classes</option>
                    <option value="rejected">Declined</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Internal Staff Notes
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Add an internal note..."
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleUpdateStatus(selectedApp.id, selectedApp.status)}
                      className="btn btn-secondary btn-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
