'use client'

import React, { useState, useMemo, useTransition } from 'react'
import {
  FileText,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  XCircle,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronRight,
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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted: { label: 'New / Received', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  under_review: { label: 'Under Review', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  interview_scheduled: { label: 'Interview Scheduled', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  accepted: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  enrolled: { label: 'Enrolled', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  rejected: { label: 'Declined', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
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
        setStatusMessage(`Application updated to ${STATUS_LABELS[nextStatus]?.label || nextStatus}`)
      } else {
        setStatusMessage(res.error || 'Failed to update application')
      }
    })
  }

  const openModal = (app: AdmissionApplication) => {
    setSelectedApp(app)
    setNotesInput(app.notes || '')
    setStatusMessage(null)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Admissions Desk
          </h1>
          <p className="text-sm text-slate-500">
            Incoming online admissions from website, official 2027 PDF application forms, and applicant review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Auto-Dispatched to admissions@leaderinternationalschool.ac.tz
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Applications</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.total}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-blue-600">New / Unreviewed</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{metrics.submitted}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-600">Under Review</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{metrics.underReview}</p>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-purple-600">Interviews Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-purple-900">{metrics.interview}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600">Accepted / Enrolled</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{metrics.accepted}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student, application #, parent email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              <span className="px-2 font-medium text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">New / Received</option>
                <option value="under_review">Under Review</option>
                <option value="interview_scheduled">Interview Scheduled</option>
                <option value="accepted">Accepted</option>
                <option value="enrolled">Enrolled</option>
                <option value="rejected">Declined</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              <span className="px-2 font-medium text-slate-500">Curriculum:</span>
              <select
                value={curriculumFilter}
                onChange={(e) => setCurriculumFilter(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none"
              >
                <option value="all">All Curricula</option>
                <option value="cambridge">Cambridge</option>
                <option value="necta">NECTA</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Application #</th>
                <th scope="col" className="px-4 py-3.5">Candidate / Student</th>
                <th scope="col" className="px-4 py-3.5">Class & Curriculum</th>
                <th scope="col" className="px-4 py-3.5">Parent / Contact</th>
                <th scope="col" className="px-4 py-3.5">Submitted</th>
                <th scope="col" className="px-4 py-3.5">Status</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No admission applications found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const badge = STATUS_LABELS[app.status] || STATUS_LABELS.submitted
                  const dateDisplay = app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : '—'
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {app.application_no}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {app.first_name} {app.last_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {app.gender ? `${app.gender} • ` : ''}
                          {app.date_of_birth ? `DOB: ${app.date_of_birth}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{app.class_applied_for}</div>
                        <div className="text-xs text-slate-500">{app.curriculum || 'Cambridge'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800">{app.parent_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="flex items-center gap-0.5"><Phone className="h-3 w-3 text-slate-400" /> {app.parent_phone}</span>
                          <span className="flex items-center gap-0.5"><Mail className="h-3 w-3 text-slate-400" /> {app.parent_email}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                        {dateDisplay}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${badge.bg} ${badge.color} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Official PDF Form Download */}
                          <a
                            href={`/api/admissions/apply?reference=${encodeURIComponent(app.application_no)}&download=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                            title="Download Official 3-Page 2027 Admission Form PDF"
                          >
                            <Download className="h-3.5 w-3.5 text-sky-600" /> PDF Form
                          </a>
                          {/* Inspect / Edit Modal */}
                          <button
                            type="button"
                            onClick={() => openModal(app)}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
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
      </div>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedApp.first_name} {selectedApp.last_name}
                  </h2>
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                    {selectedApp.application_no}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  Application for <strong>{selectedApp.class_applied_for}</strong> ({selectedApp.curriculum || 'Cambridge'}) • Submitted on {selectedApp.created_at ? new Date(selectedApp.created_at).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {statusMessage && (
              <div className="mt-4 rounded-lg bg-sky-50 border border-sky-200 p-3 text-xs text-sky-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Modal Content Sections */}
            <div className="mt-5 space-y-6 text-sm">
              {/* 1. Student Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  1. Student Information
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">Full Name:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.first_name} {selectedApp.last_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Date of Birth:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.date_of_birth || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Gender:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.gender || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Nationality:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.nationality || 'Tanzanian'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Place of Birth:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.place_of_birth || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Previous School:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.previous_school || 'None / Fresh Start'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Parent & Guardian Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. Parent & Guardian Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">Primary Contact:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.parent_name} ({selectedApp.parent_relationship || 'Parent'})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Email:</span>
                    <a href={`mailto:${selectedApp.parent_email}`} className="font-semibold text-sky-600 hover:underline">
                      {selectedApp.parent_email}
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Phone / Mobile:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.parent_phone}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">WhatsApp:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.parent_whatsapp || selectedApp.parent_phone}</span>
                  </div>
                  {selectedApp.parent_address && (
                    <div className="sm:col-span-2">
                      <span className="text-xs text-slate-400 block">Residential Address:</span>
                      <span className="font-medium text-slate-800">{selectedApp.parent_address}</span>
                    </div>
                  )}
                  {selectedApp.guardian2_name && (
                    <div className="sm:col-span-2 mt-2 pt-2 border-t border-slate-200">
                      <span className="text-xs font-semibold text-slate-600 block">Secondary Guardian:</span>
                      <span className="text-slate-800">{selectedApp.guardian2_name} ({selectedApp.guardian2_relationship || 'Guardian'}) • {selectedApp.guardian2_phone} • {selectedApp.guardian2_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Services, Term & Preferences */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  3. Services, Fee Plan & Notes
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">School Transport:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedApp.transport_required ? '✅ Required' : '❌ Not required'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Fee Payment Plan:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.fee_plan || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Intake Start Term:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.start_term || 'January 2027'}</span>
                  </div>
                  {selectedApp.clubs && selectedApp.clubs.length > 0 && (
                    <div className="sm:col-span-3">
                      <span className="text-xs text-slate-400 block">Selected Clubs / Talents:</span>
                      <span className="font-semibold text-slate-800">{selectedApp.clubs.join(', ')}</span>
                    </div>
                  )}
                  {selectedApp.medical_conditions && (
                    <div className="sm:col-span-3">
                      <span className="text-xs text-slate-400 block">Medical Conditions:</span>
                      <span className="text-slate-800">{selectedApp.medical_conditions}</span>
                    </div>
                  )}
                  {selectedApp.additional_notes && (
                    <div className="sm:col-span-3">
                      <span className="text-xs text-slate-400 block">Parent Additional Notes:</span>
                      <span className="text-slate-800">{selectedApp.additional_notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Official PDF Form Download & Office Action */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-sky-950">Official 2027 Admission Form PDF</h4>
                    <p className="text-xs text-sky-800">
                      The official 3-page printable application form stamped with candidate details.
                    </p>
                  </div>
                  <a
                    href={`/api/admissions/apply?reference=${encodeURIComponent(selectedApp.application_no)}&download=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 shrink-0"
                  >
                    <Download className="h-4 w-4" /> Download Official PDF
                  </a>
                </div>
              </div>

              {/* 5. Status Management */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Admissions Status & Staff Notes
                </h4>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Update Status:</label>
                    <select
                      value={selectedApp.status}
                      disabled={isPending}
                      onChange={(e) => handleUpdateStatus(selectedApp.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-800 font-medium outline-none focus:border-sky-500"
                    >
                      <option value="submitted">New / Received</option>
                      <option value="under_review">Under Review</option>
                      <option value="interview_scheduled">Interview / Assessment Scheduled</option>
                      <option value="accepted">Accepted (Offer Letter)</option>
                      <option value="enrolled">Enrolled</option>
                      <option value="rejected">Declined</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
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
