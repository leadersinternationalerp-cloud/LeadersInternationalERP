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
  { label: string; badgeClass: string; dotClass: string; icon: React.ComponentType<{ size?: number }> }
> = {
  submitted: {
    label: 'New / Received',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200/80 ring-1 ring-sky-500/20',
    dotClass: 'bg-sky-500',
    icon: Sparkles,
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/80 ring-1 ring-amber-500/20',
    dotClass: 'bg-amber-500',
    icon: Clock,
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200/80 ring-1 ring-purple-500/20',
    dotClass: 'bg-purple-500',
    icon: Calendar,
  },
  accepted: {
    label: 'Accepted',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 ring-1 ring-emerald-500/20',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  enrolled: {
    label: 'Enrolled',
    badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200/80 ring-1 ring-teal-500/20',
    dotClass: 'bg-teal-500',
    icon: Check,
  },
  rejected: {
    label: 'Declined',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/80 ring-1 ring-rose-500/20',
    dotClass: 'bg-rose-500',
    icon: X,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200 ring-1 ring-slate-400/20',
    dotClass: 'bg-slate-400',
    icon: X,
  },
}

export default function AdmissionsClient({ initialApplications }: Props) {
  const [applications, setApplications] = useState<AdmissionApplication[]>(initialApplications)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all')
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null)
  const [previewPdfApp, setPreviewPdfApp] = useState<AdmissionApplication | null>(null)
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applications</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200/80 transition-colors">
              <FileText size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-[Outfit]">
            {metrics.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">All received online forms</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700">New / Unreviewed</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-500/20 group-hover:bg-sky-100 transition-colors">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-sky-700 font-[Outfit]">
            {metrics.submitted}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting initial desk review</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Under Review</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/20 group-hover:bg-amber-100 transition-colors">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 font-[Outfit]">
            {metrics.underReview}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Currently being processed</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Interviews</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-500/20 group-hover:bg-purple-100 transition-colors">
              <Calendar size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-700 font-[Outfit]">
            {metrics.interview}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assessment sessions booked</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Enrolled / Accepted</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-[Outfit]">
            {metrics.accepted}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Offers issued & registered</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-600 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap gap-3.5 items-center justify-between">
        <div className="flex-1 min-w-[280px] relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs placeholder:text-slate-400"
            placeholder="Search candidate name, reference, parent email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2.5 flex-wrap items-center">
          <div className="min-w-[170px]">
            <select
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs font-medium text-slate-700 cursor-pointer"
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

          <div className="min-w-[150px]">
            <select
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-2xs font-medium text-slate-700 cursor-pointer"
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
      <div className="table-wrapper overflow-x-auto rounded-2xl border border-slate-200/90 shadow-xs bg-white">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Application #</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[190px]">Candidate / Student</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[150px]">Class & Curriculum</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 max-w-[240px]">Parent / Contact</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Submitted</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14 px-4 text-slate-500">
                  <FileText size={38} className="mx-auto mb-3 text-slate-300" />
                  <div className="font-bold text-base text-slate-800">
                    No admission applications found
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
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
                  <tr key={app.id} className="hover:bg-sky-50/40 transition-colors border-b border-slate-100 last:border-b-0">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/90 shadow-2xs">
                        <FileText size={12} className="text-slate-400" />
                        {app.application_no}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-600 to-blue-800 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ring-2 ring-white">
                          {app.first_name?.[0] || 'S'}{app.last_name?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {app.first_name} {app.last_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {app.gender && (
                              <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                                {app.gender}
                              </span>
                            )}
                            {app.date_of_birth && <span>DOB: {app.date_of_birth}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {app.class_applied_for}
                      </div>
                      <div className="mt-1">
                        {app.curriculum?.toLowerCase().includes('cambridge') || !app.curriculum ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Cambridge
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            NECTA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="font-semibold text-slate-900 truncate" title={app.parent_name}>
                        {app.parent_name}
                      </div>
                      <div className="mt-1 flex flex-col gap-1 text-xs text-slate-500">
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700">{app.parent_phone}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${app.parent_email}`}
                            title={app.parent_email}
                            className="truncate max-w-[185px] text-sky-600 hover:text-sky-800 hover:underline font-medium"
                          >
                            {app.parent_email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {dateDisplay}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-2xs ${conf.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${conf.dotClass}`} />
                        {conf.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* Eye Icon -> Opens PDF in interactive Modal */}
                        <button
                          type="button"
                          onClick={() => setPreviewPdfApp(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs hover:shadow active:scale-95 transition-all cursor-pointer"
                          title="Preview Official 3-Page 2027 Admission Form PDF in Modal"
                        >
                          <Eye size={13} />
                          <span>View Form</span>
                        </button>

                        {/* Direct PDF Download */}
                        <a
                          href={`/api/admissions/apply?reference=${encodeURIComponent(app.application_no)}&download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-slate-300 hover:border-sky-500 bg-white hover:bg-sky-50/50 text-slate-700 hover:text-sky-700 shadow-2xs active:scale-95 transition-all"
                          title="Download Official 3-Page PDF"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </a>

                        {/* Review / Details Modal */}
                        <button
                          type="button"
                          onClick={() => openModal(app)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer"
                          title="Review applicant data & update status"
                        >
                          <FileText size={13} />
                          <span>Review</span>
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

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const app = selectedApp;
                    setSelectedApp(null);
                    setPreviewPdfApp(app);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  <Eye size={16} /> Preview PDF Form
                </button>
                <a
                  href={`/api/admissions/apply?reference=${encodeURIComponent(selectedApp.application_no)}&download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  <Download size={16} /> Download PDF
                </a>
              </div>
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
    

      {/* 6. Interactive 3-Page Official PDF Form Preview Modal */}
      {previewPdfApp && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewPdfApp(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-6xl w-full h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* PDF Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-500/20 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-[Outfit] m-0">
                      Official 2027 Admission Form
                    </h3>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/90 shadow-2xs">
                      {previewPdfApp.application_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Candidate: <strong className="text-slate-800">{previewPdfApp.first_name} {previewPdfApp.last_name}</strong> • {previewPdfApp.class_applied_for} ({previewPdfApp.curriculum || 'Cambridge Curriculum'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Open in full browser tab */}
                <a
                  href={`/api/admissions/apply?reference=${encodeURIComponent(previewPdfApp.application_no)}&preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-2xs"
                  title="Open raw PDF in new browser tab"
                >
                  Open in Tab ↗
                </a>

                {/* Direct Download */}
                <a
                  href={`/api/admissions/apply?reference=${encodeURIComponent(previewPdfApp.application_no)}&download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs hover:shadow transition-all active:scale-95"
                  title="Download filled PDF form"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </a>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setPreviewPdfApp(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Interactive PDF iFrame Viewer */}
            <div className="flex-1 bg-slate-700 relative">
              <iframe
                src={`/api/admissions/apply?reference=${encodeURIComponent(previewPdfApp.application_no)}&preview=1`}
                className="w-full h-full border-none block"
                title={`Official Admission Form - ${previewPdfApp.application_no}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}