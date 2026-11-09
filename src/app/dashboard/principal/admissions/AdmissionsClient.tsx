'use client'

import React, { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
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
  Trash2,
  UserPlus,
  GraduationCap,
  Receipt,
  ArrowRight,
  Filter,
} from 'lucide-react'
import {
  updateApplicationStatusAction,
  enrollLearnerAction,
  deleteApplicationAction,
  registerLearnerAction,
  type RegisterLearnerInput,
} from './actions'

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
  registered_by?: string | null
  sales_agent_name?: string | null
  enrolled_student_id?: string | null
  pdf_sent_to_school?: boolean | null
  email_sent_at?: string | null
  notes?: string | null
  created_at: string
}

export interface ClassOption {
  id: string
  name: string
  class_name?: string
  section?: string
  grade_level?: string
}

interface CurrentUser {
  id: string
  name: string
  email: string
  roles: string[]
  isSales?: boolean
}

interface Props {
  initialApplications: AdmissionApplication[]
  classes?: ClassOption[]
  currentUser?: CurrentUser
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; icon: React.ComponentType<{ size?: number }> }
> = {
  submitted: {
    label: 'New / Received',
    badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200',
    dotClass: 'bg-sky-500',
    icon: Sparkles,
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-amber-50 text-amber-900 border border-amber-200',
    dotClass: 'bg-amber-500',
    icon: Clock,
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    badgeClass: 'bg-purple-50 text-purple-800 border border-purple-200',
    dotClass: 'bg-purple-500',
    icon: Calendar,
  },
  accepted: {
    label: 'Accepted',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  enrolled: {
    label: 'Enrolled in School',
    badgeClass: 'bg-teal-50 text-teal-800 border border-teal-200 font-bold',
    dotClass: 'bg-teal-500',
    icon: GraduationCap,
  },
  rejected: {
    label: 'Declined',
    badgeClass: 'bg-rose-50 text-rose-800 border border-rose-200',
    dotClass: 'bg-rose-500',
    icon: X,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
    dotClass: 'bg-slate-400',
    icon: X,
  },
}

export default function AdmissionsClient({ initialApplications, classes = [], currentUser }: Props) {
  const [applications, setApplications] = useState<AdmissionApplication[]>(initialApplications)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all')
  const [attributionFilter, setAttributionFilter] = useState<string>('all') // 'all' | 'website' | 'sales'
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null)
  const [previewPdfApp, setPreviewPdfApp] = useState<AdmissionApplication | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [targetClassId, setTargetClassId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Registration Modal State for Sales Persons / Staff
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [regForm, setRegForm] = useState<RegisterLearnerInput>({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'Male',
    dob: '',
    classAppliedFor: 'Cambridge Year 1',
    curriculum: 'Cambridge',
    academicYear: '2026/2027',
    startTerm: 'Term 1',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelationship: 'Parent',
    parentAddress: '',
    feePlan: 'Standard Termly',
    transportRequired: false,
    additionalNotes: '',
  })

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter((a) => a.status === 'submitted').length,
      underReview: applications.filter((a) => a.status === 'under_review').length,
      enrolled: applications.filter((a) => a.status === 'enrolled').length,
      salesCount: applications.filter((a) => a.sales_agent_name || a.source === 'sales').length,
      websiteCount: applications.filter((a) => !a.sales_agent_name && a.source !== 'sales').length,
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
        app.class_applied_for.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.sales_agent_name && app.sales_agent_name.toLowerCase().includes(searchTerm.toLowerCase()))

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

      const isSalesAttributed = Boolean(app.sales_agent_name || app.source === 'sales')
      const matchAttribution =
        attributionFilter === 'all' ||
        (attributionFilter === 'website' && !isSalesAttributed) ||
        (attributionFilter === 'sales' && isSalesAttributed)

      return matchSearch && matchStatus && matchCurriculum && matchAttribution
    })
  }, [applications, searchTerm, statusFilter, curriculumFilter, attributionFilter])

  const openModal = (app: AdmissionApplication) => {
    setSelectedApp(app)
    setNotesInput(app.notes || '')
    setTargetClassId('')
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
        setStatusMessage({
          text: `Application status updated to "${STATUS_CONFIG[nextStatus]?.label || nextStatus}"`,
          type: 'success',
        })
      } else {
        setStatusMessage({
          text: res.error || 'Failed to update application',
          type: 'error',
        })
      }
    })
  }

  const handleEnrollLearner = (appId: string, classId?: string) => {
    startTransition(async () => {
      setStatusMessage(null)
      const res = await enrollLearnerAction(appId, classId, notesInput || undefined)
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appId
              ? {
                  ...a,
                  status: 'enrolled',
                  notes: notesInput || a.notes,
                  enrolled_student_id: res.student_user_id || a.enrolled_student_id,
                }
              : a
          )
        )
        if (selectedApp && selectedApp.id === appId) {
          setSelectedApp((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'enrolled',
                  notes: notesInput || prev.notes,
                  enrolled_student_id: res.student_user_id || prev.enrolled_student_id,
                }
              : null
          )
        }
        setStatusMessage({
          text: `✓ Success! Learner enrolled with Student ID: ${res.student_id}. They now appear on the Students List and can be assigned to classes and invoiced!`,
          type: 'success',
        })
      } else {
        setStatusMessage({
          text: res.error || 'Failed to enroll learner',
          type: 'error',
        })
      }
    })
  }

  const handleDeleteApplication = (app: AdmissionApplication) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete application "${app.application_no}" for ${app.first_name} ${app.last_name}? This action cannot be undone.`
      )
    ) {
      return
    }

    startTransition(async () => {
      setStatusMessage(null)
      const res = await deleteApplicationAction(app.id)
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== app.id))
        if (selectedApp?.id === app.id) setSelectedApp(null)
        setStatusMessage({
          text: `Application "${app.application_no}" deleted successfully.`,
          type: 'info',
        })
      } else {
        setStatusMessage({
          text: res.error || 'Failed to delete application',
          type: 'error',
        })
      }
    })
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      setStatusMessage(null)
      const res = await registerLearnerAction(regForm)
      if (res.ok && res.application) {
        setApplications((prev) => [res.application, ...prev])
        setIsRegisterOpen(false)
        setStatusMessage({
          text: `✓ Learner "${res.application.first_name} ${res.application.last_name}" registered successfully! Attributed to: ${res.application.sales_agent_name || 'Sales Agent'}. Application #: ${res.application.application_no}`,
          type: 'success',
        })
        // Reset form
        setRegForm({
          firstName: '',
          lastName: '',
          middleName: '',
          gender: 'Male',
          dob: '',
          classAppliedFor: 'Cambridge Year 1',
          curriculum: 'Cambridge',
          academicYear: '2026/2027',
          startTerm: 'Term 1',
          parentName: '',
          parentPhone: '',
          parentEmail: '',
          parentRelationship: 'Parent',
          parentAddress: '',
          feePlan: 'Standard Termly',
          transportRequired: false,
          additionalNotes: '',
        })
      } else {
        setStatusMessage({
          text: res.error || 'Failed to register learner',
          type: 'error',
        })
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
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '1.85rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
              Student Admissions Desk
            </h1>
            {currentUser?.isSales && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Sales Agent Portal
              </span>
            )}
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', margin: 0 }}>
            Online submissions from website, sales agent registrations, 1-click student enrollment, and official 2027 PDF forms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>+ Register Learner</span>
          </button>

          <Link
            href="/dashboard/students"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <GraduationCap size={16} className="text-slate-500" />
            <span>Students List</span>
          </Link>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border shadow-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-sky-50 text-sky-900 border-sky-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={20} className="text-sky-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
          <div className="text-[11px] text-slate-400 mt-0.5">All registered learners</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">New / Received</span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-[Outfit]">
            {metrics.submitted}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting staff review</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Enrolled Students</span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-[Outfit]">
            {metrics.enrolled}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Placed in students list</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-teal-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Sales Attribution</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <User size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-[Outfit]">
            {metrics.salesCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered by sales agents</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Website Direct</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-[Outfit]">
            {metrics.websiteCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Attributed to (website)</div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
            placeholder="Search by learner name, parent, phone, class, or sales agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">New / Received</option>
            <option value="under_review">Under Review</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="accepted">Accepted</option>
            <option value="enrolled">Enrolled in School</option>
            <option value="rejected">Declined</option>
          </select>

          {/* Attribution Filter */}
          <select
            value={attributionFilter}
            onChange={(e) => setAttributionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">All Attributions</option>
            <option value="website">Attributed to: (website)</option>
            <option value="sales">Attributed to: Sales Agents</option>
          </select>

          {/* Curriculum Filter */}
          <select
            value={curriculumFilter}
            onChange={(e) => setCurriculumFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="all">All Curricula</option>
            <option value="cambridge">Cambridge</option>
            <option value="necta">NECTA</option>
          </select>
        </div>
      </div>

      {/* 4. Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[130px]">
                  Application #
                </th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[210px]">
                  Candidate / Student
                </th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[160px]">
                  Class & Curriculum
                </th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[200px]">
                  Parent / Contact
                </th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[140px]">
                  Attributed To
                </th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[140px]">
                  Status
                </th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right whitespace-nowrap min-w-[260px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 px-4 text-slate-500">
                    <FileText size={38} className="mx-auto mb-3 text-slate-300" />
                    <div className="font-bold text-base text-slate-800">No admission applications found</div>
                    <p className="mt-1 text-xs text-slate-500">Adjust your search query or filters to inspect incoming forms.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const conf = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted
                  const isSales = Boolean(app.sales_agent_name || app.source === 'sales')
                  const isEnrolled = app.status === 'enrolled'

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-sky-50/40 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {/* Application No */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                          <FileText size={12} className="text-slate-400 shrink-0" />
                          <span>{app.application_no}</span>
                        </span>
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-600 to-blue-800 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ring-2 ring-white">
                            {app.first_name?.[0] || 'S'}
                            {app.last_name?.[0] || ''}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-snug">
                              {app.first_name} {app.last_name}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                              {app.gender && (
                                <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                                  {app.gender}
                                </span>
                              )}
                              {app.date_of_birth && <span className="whitespace-nowrap">DOB: {app.date_of_birth}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 leading-snug">{app.class_applied_for}</div>
                        <div className="mt-1">
                          {app.curriculum?.toLowerCase().includes('cambridge') || !app.curriculum ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span>Cambridge</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>NECTA</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Parent Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 truncate" title={app.parent_name}>
                          {app.parent_name}
                        </div>
                        <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            <span>{app.parent_phone}</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <a
                              href={`mailto:${app.parent_email}`}
                              className="truncate max-w-[170px] text-sky-600 hover:underline"
                            >
                              {app.parent_email}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Attribution */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isSales ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs"
                            title={`Attributed to: ${app.sales_agent_name || 'Sales Agent'}`}
                          >
                            <User size={12} className="text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[130px]">{app.sales_agent_name || 'Sales Agent'}</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
                            title="Direct Online Website Application"
                          >
                            <Sparkles size={12} className="text-emerald-600 shrink-0" />
                            <span>(website)</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold shadow-2xs whitespace-nowrap ${conf.badgeClass}`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${conf.dotClass}`} />
                          <span>{conf.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* View Form PDF in Modal */}
                          <button
                            type="button"
                            onClick={() => setPreviewPdfApp(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-2xs transition-all active:scale-95"
                            title="Preview 3-Page PDF Form"
                          >
                            <Eye size={13} />
                            <span>Form</span>
                          </button>

                          {/* Direct PDF Download */}
                          <a
                            href={`/api/admissions/apply?reference=${encodeURIComponent(app.application_no)}&download=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                            title="Download PDF"
                          >
                            <Download size={13} />
                          </a>

                          {/* Review Details */}
                          <button
                            type="button"
                            onClick={() => openModal(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-2xs transition-all"
                            title="Review Application & Manage Enrollment"
                          >
                            <span>Review</span>
                          </button>

                          {/* 1-Click Enroll Button (if not already enrolled) */}
                          {!isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => handleEnrollLearner(app.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all active:scale-95"
                              title="Enroll Student in Classes & Students List"
                            >
                              <GraduationCap size={13} />
                              <span>Enroll</span>
                            </button>
                          ) : (
                            <Link
                              href="/dashboard/students"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
                              title="View Enrolled Student in Students List"
                            >
                              <Check size={13} />
                              <span>Enrolled</span>
                            </Link>
                          )}

                          {/* Delete Application Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteApplication(app)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Application"
                          >
                            <Trash2 size={15} />
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

      {/* 5. Detailed Review & Enrollment Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              backgroundColor: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--color-primary)', fontWeight: 700 }}>
                    {selectedApp.first_name} {selectedApp.last_name}
                  </h2>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {selectedApp.application_no}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_CONFIG[selectedApp.status]?.badgeClass}`}>
                    {STATUS_CONFIG[selectedApp.status]?.label}
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Applying for: <strong>{selectedApp.class_applied_for}</strong> ({selectedApp.curriculum || 'Cambridge'}) • Submitted:{' '}
                  {new Date(selectedApp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a
                  href={`/api/admissions/apply?reference=${encodeURIComponent(selectedApp.application_no)}&download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={14} /> Download PDF
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Attribution Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Attribution:</span>
                {selectedApp.sales_agent_name ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                    <User size={13} className="text-indigo-600" />
                    <span>{selectedApp.sales_agent_name}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>Direct Website Submission (website)</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Source: <strong>{selectedApp.source || 'website'}</strong>
              </div>
            </div>

            {/* Enrollment Action Box (Requirement 3) */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap size={18} className="text-teal-700" />
                  <span className="text-sm font-bold text-teal-900">School Enrollment & Class Placement</span>
                </div>
                {selectedApp.status === 'enrolled' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-2xs">
                    <Check size={13} /> Active Student
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-teal-700 bg-teal-100/60 px-2.5 py-0.5 rounded-md">
                    Not Yet Enrolled
                  </span>
                )}
              </div>

              {selectedApp.status === 'enrolled' ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-teal-800 m-0">
                    This learner is enrolled in the school student database! They appear in the active student directory, are placed in class, and invoices can be generated.
                  </p>
                  <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                    <Link
                      href="/dashboard/students"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white transition-colors"
                    >
                      <span>View in Students List</span>
                      <ArrowRight size={13} />
                    </Link>
                    <Link
                      href="/dashboard/accountant/invoices"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-teal-300 text-teal-800 hover:bg-teal-50 transition-colors"
                    >
                      <Receipt size={13} />
                      <span>Invoices & Fee Statements</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-teal-800 m-0">
                    Marking as enrolled will create the student's official account, student ID, assign them to a class, link parents, and make them available for invoicing.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-teal-900 block mb-1">
                        Select Class for Placement
                      </label>
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-teal-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Auto-match class ({selectedApp.class_applied_for})</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.class_name} {c.section ? `(${c.section})` : ''} - {c.grade_level || ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleEnrollLearner(selectedApp.id, targetClassId || undefined)}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md hover:shadow-lg active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <GraduationCap size={15} />
                      <span>Enroll Learner Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Candidate & Parent Information Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* Student Details */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2">
                <div className="text-xs font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1.5">
                  <School size={14} className="text-slate-600" />
                  <span>Student Information</span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <div><strong>Full Name:</strong> {selectedApp.first_name} {selectedApp.middle_name ? `${selectedApp.middle_name} ` : ''}{selectedApp.last_name}</div>
                  <div><strong>Gender:</strong> {selectedApp.gender || 'Not specified'}</div>
                  <div><strong>Date of Birth:</strong> {selectedApp.date_of_birth || 'Not specified'}</div>
                  <div><strong>Place of Birth:</strong> {selectedApp.place_of_birth || 'Not specified'}</div>
                  <div><strong>Nationality:</strong> {selectedApp.nationality || 'Tanzanian'}</div>
                  <div><strong>Curriculum:</strong> {selectedApp.curriculum || 'Cambridge'}</div>
                  <div><strong>Class Applied:</strong> {selectedApp.class_applied_for}</div>
                  <div><strong>Previous School:</strong> {selectedApp.previous_school || 'None'}</div>
                </div>
              </div>

              {/* Parent Details */}
              <div className="p-3.5 rounded-xl border border-slate-200 flex flex-col gap-2">
                <div className="text-xs font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1.5">
                  <User size={14} className="text-slate-600" />
                  <span>Parent / Guardian</span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-700">
                  <div><strong>Name:</strong> {selectedApp.parent_name} ({selectedApp.parent_relationship || 'Parent'})</div>
                  <div><strong>Phone:</strong> {selectedApp.parent_phone}</div>
                  <div><strong>Email:</strong> {selectedApp.parent_email}</div>
                  {selectedApp.parent_whatsapp && <div><strong>WhatsApp:</strong> {selectedApp.parent_whatsapp}</div>}
                  {selectedApp.parent_occupation && <div><strong>Occupation:</strong> {selectedApp.parent_occupation}</div>}
                  {selectedApp.parent_employer && <div><strong>Employer:</strong> {selectedApp.parent_employer}</div>}
                  {selectedApp.parent_address && <div><strong>Address:</strong> {selectedApp.parent_address}</div>}
                </div>
              </div>
            </div>

            {/* Status & Staff Notes */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    Change Status
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
                    <option value="enrolled">Enrolled in School</option>
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

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteApplication(selectedApp)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold p-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Register Learner Modal (For Sales Persons / Staff) */}
      {isRegisterOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsRegisterOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '750px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              backgroundColor: 'var(--color-surface)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">Register New Learner</h2>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Attributed to:{' '}
                  <strong>
                    {currentUser?.name || 'Sales Staff'} ({currentUser?.isSales ? 'Sales' : 'Staff'})
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 mt-4">
              {/* Learner Info */}
              <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                1. Learner Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">First Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    value={regForm.firstName}
                    onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Middle Name</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    value={regForm.middleName}
                    onChange={(e) => setRegForm({ ...regForm, middleName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    value={regForm.lastName}
                    onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Gender</label>
                  <select
                    className="input-field text-sm"
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Date of Birth</label>
                  <input
                    type="date"
                    className="input-field text-sm"
                    value={regForm.dob}
                    onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Curriculum</label>
                  <select
                    className="input-field text-sm"
                    value={regForm.curriculum}
                    onChange={(e) => setRegForm({ ...regForm, curriculum: e.target.value })}
                  >
                    <option value="Cambridge">Cambridge</option>
                    <option value="NECTA">NECTA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Class Applied For *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cambridge Year 1, Nursery, Grade 1"
                    className="input-field text-sm"
                    value={regForm.classAppliedFor}
                    onChange={(e) => setRegForm({ ...regForm, classAppliedFor: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Academic Year</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    value={regForm.academicYear}
                    onChange={(e) => setRegForm({ ...regForm, academicYear: e.target.value })}
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="text-xs font-bold uppercase text-slate-500 tracking-wider pt-2 border-t border-slate-100">
                2. Parent / Guardian Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Parent / Guardian Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field text-sm"
                    value={regForm.parentName}
                    onChange={(e) => setRegForm({ ...regForm, parentName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Relationship</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Father, Mother, Guardian"
                    value={regForm.parentRelationship}
                    onChange={(e) => setRegForm({ ...regForm, parentRelationship: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+255..."
                    className="input-field text-sm"
                    value={regForm.parentPhone}
                    onChange={(e) => setRegForm({ ...regForm, parentPhone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    className="input-field text-sm"
                    value={regForm.parentEmail}
                    onChange={(e) => setRegForm({ ...regForm, parentEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-semibold">Notes / Special Preferences</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Transport route, fees agreement, or special notes..."
                  value={regForm.additionalNotes}
                  onChange={(e) => setRegForm({ ...regForm, additionalNotes: e.target.value })}
                />
              </div>

              {/* Attribution confirmation */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
                <User size={15} className="text-indigo-600 shrink-0" />
                <span>
                  This registration will be attributed to{' '}
                  <strong>{currentUser?.name || 'Sales Staff'}</strong> as the registered sales person.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary text-sm inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <UserPlus size={16} />
                  <span>{isPending ? 'Registering...' : 'Register Learner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PDF Form Preview Modal */}
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
                    <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs leading-normal whitespace-nowrap">
                      {previewPdfApp.application_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Candidate: <strong className="text-slate-800">{previewPdfApp.first_name} {previewPdfApp.last_name}</strong> •{' '}
                    {previewPdfApp.class_applied_for} ({previewPdfApp.curriculum || 'Cambridge Curriculum'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/admissions/apply?reference=${encodeURIComponent(previewPdfApp.application_no)}&download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs hover:shadow transition-all active:scale-95"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfApp(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
