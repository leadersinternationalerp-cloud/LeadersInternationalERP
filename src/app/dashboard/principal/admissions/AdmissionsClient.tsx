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
  Camera,
  Upload,
  Paperclip,
  FileCheck,
} from 'lucide-react'
import {
  updateApplicationStatusAction,
  enrollLearnerAction,
  deleteApplicationAction,
  registerLearnerAction,
  type RegisterLearnerInput,
  type EnrollLearnerDetailsInput,
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
  isReceptionist?: boolean
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

const STREAM_PRESETS = ['A', 'B', 'C', 'Blue', 'Gold', 'East', 'West']

export default function AdmissionsClient({ initialApplications, classes = [], currentUser }: Props) {
  const [applications, setApplications] = useState<AdmissionApplication[]>(initialApplications)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all')
  const [attributionFilter, setAttributionFilter] = useState<string>('all') // 'all' | 'website' | 'sales' | 'walk_in'
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null)
  const [previewPdfApp, setPreviewPdfApp] = useState<AdmissionApplication | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const [targetClassId, setTargetClassId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info'; invoiceUrl?: string } | null>(null)

  // Enroll & Admit Student to Class Modal State
  const [enrollingApp, setEnrollingApp] = useState<AdmissionApplication | null>(null)
  const [isEnrollingSubmit, setIsEnrollingSubmit] = useState(false)
  const [enrollForm, setEnrollForm] = useState<EnrollLearnerDetailsInput>({
    targetClassId: '',
    gradeLevel: '',
    section: 'A',
    admissionDate: new Date().toISOString().split('T')[0],
    dob: '',
    gender: 'Male',
    nationality: 'Tanzanian',
    languageAtHome: 'English',
    previousSchool: '',
    emergencyContact: '',
    medicalInfo: '',
    allergies: '',
    notes: '',
  })
  const [enrollPhotoFile, setEnrollPhotoFile] = useState<File | null>(null)
  const [enrollPhotoPreview, setEnrollPhotoPreview] = useState<string>('')
  const [enrollDocs, setEnrollDocs] = useState<{ label: string; file: File }[]>([])
  const [customDocLabel, setCustomDocLabel] = useState<string>('Additional Admission Document')

  // Registration Modal State for Sales Persons / Staff
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [showClassBreakdown, setShowClassBreakdown] = useState(false)
  const [regForm, setRegForm] = useState<RegisterLearnerInput>({
    firstName: '',
    lastName: '',
    middleName: '',
    gender: 'Male',
    dob: '',
    nationality: 'Tanzanian',
    classAppliedFor: classes[0]?.class_name || classes[0]?.name || 'Cambridge Year 1',
    curriculum: 'Cambridge',
    academicYear: '2026/2027',
    startTerm: 'Term 1',
    previousSchool: '',
    parentName: '',
    parentPhone: '',
    parentWhatsapp: '',
    parentEmail: '',
    parentRelationship: 'Mother',
    parentAddress: '',
    feePlan: 'Standard Termly',
    transportRequired: false,
    medicalConditions: '',
    additionalNotes: '',
    enrollImmediately: false,
  })

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: applications.length,
      submitted: applications.filter((a) => a.status === 'submitted').length,
      underReview: applications.filter((a) => a.status === 'under_review').length,
      enrolled: applications.filter((a) => a.status === 'enrolled').length,
      walkInCount: applications.filter(
        (a) => a.source === 'walk_in' || a.sales_agent_name?.toUpperCase() === 'WALK IN'
      ).length,
      salesCount: applications.filter(
        (a) =>
          (a.sales_agent_name && a.sales_agent_name.toUpperCase() !== 'WALK IN') ||
          a.source === 'sales'
      ).length,
      websiteCount: applications.filter(
        (a) => !a.sales_agent_name && a.source !== 'sales' && a.source !== 'walk_in'
      ).length,
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

      const isWalkIn = Boolean(app.source === 'walk_in' || app.sales_agent_name?.toUpperCase() === 'WALK IN')
      const isSalesAttributed = Boolean(!isWalkIn && (app.sales_agent_name || app.source === 'sales'))
      const matchAttribution =
        attributionFilter === 'all' ||
        (attributionFilter === 'walk_in' && isWalkIn) ||
        (attributionFilter === 'website' && !isSalesAttributed && !isWalkIn) ||
        (attributionFilter === 'sales' && isSalesAttributed)

      return matchSearch && matchStatus && matchCurriculum && matchAttribution
    })
  }, [applications, searchTerm, statusFilter, curriculumFilter, attributionFilter])

  const classGenderBreakdown = useMemo(() => {
    const map = new Map<string, { classroom: string; male: number; female: number; enrolled: number; total: number }>()
    for (const app of filtered) {
      const cls = (app.class_applied_for || 'Unassigned').trim()
      const row = map.get(cls) || { classroom: cls, male: 0, female: 0, enrolled: 0, total: 0 }
      const g = (app.gender || '').toLowerCase()
      if (g === 'male') row.male += 1
      else if (g === 'female') row.female += 1
      if (app.status === 'enrolled') row.enrolled += 1
      row.total += 1
      map.set(cls, row)
    }
    return Array.from(map.values()).sort((a, b) => a.classroom.localeCompare(b.classroom))
  }, [filtered])

  const openModal = (app: AdmissionApplication) => {
    setSelectedApp(app)
    setNotesInput(app.notes || '')
    setTargetClassId('')
    setStatusMessage(null)
  }

  const openEnrollModal = (app: AdmissionApplication, preselectedClassId?: string) => {
    const appliedLower = (app.class_applied_for || '').toLowerCase()
    const matchedClass =
      (preselectedClassId && classes.find((c) => c.id === preselectedClassId)) ||
      classes.find(
        (c) =>
          (c.name || c.class_name || '').toLowerCase() === appliedLower ||
          (c.grade_level || '').toLowerCase() === appliedLower ||
          (c.name || c.class_name || '').toLowerCase().includes(appliedLower) ||
          appliedLower.includes((c.name || c.class_name || '').toLowerCase())
      )

    setEnrollingApp(app)
    setEnrollForm({
      targetClassId: matchedClass?.id || preselectedClassId || '',
      gradeLevel: matchedClass?.grade_level || matchedClass?.name || app.class_applied_for || 'Cambridge Year 1',
      section: matchedClass?.section || 'A',
      admissionDate: new Date().toISOString().split('T')[0],
      dob: app.date_of_birth || '',
      gender: app.gender || 'Male',
      nationality: app.nationality || 'Tanzanian',
      languageAtHome: 'English',
      previousSchool: app.previous_school || '',
      emergencyContact:
        app.guardian2_name && app.guardian2_phone
          ? `${app.guardian2_name} (${app.guardian2_phone})`
          : `${app.parent_name} (${app.parent_phone})`,
      medicalInfo: app.medical_conditions || '',
      allergies: '',
      notes: app.notes || app.additional_notes || '',
    })
    setEnrollPhotoFile(null)
    setEnrollPhotoPreview('')
    setEnrollDocs([])
    setCustomDocLabel('Additional Admission Document')
    setStatusMessage(null)
  }

  const handleEnrollPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEnrollPhotoFile(file)
    setEnrollPhotoPreview(URL.createObjectURL(file))
  }

  const handleSlotDocSelect = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEnrollDocs((prev) => {
      const withoutExistingSlot = prev.filter((d) => d.label !== label)
      return [...withoutExistingSlot, { label, file }]
    })
  }

  const handleAdditionalDocsSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const labelBase = customDocLabel.trim() || 'Supporting Document'
    setEnrollDocs((prev) => [
      ...prev,
      ...files.map((file, idx) => ({
        label: files.length > 1 ? `${labelBase} (${idx + 1})` : labelBase,
        file,
      })),
    ])
    e.target.value = ''
  }

  const removeEnrollDoc = (index: number) => {
    setEnrollDocs((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleConfirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollingApp) return

    setIsEnrollingSubmit(true)
    setStatusMessage(null)

    try {
      const res = await enrollLearnerAction(enrollingApp.id, enrollForm, enrollForm.notes || undefined)
      if (!res.ok) {
        setStatusMessage({
          text: res.error || 'Failed to enroll learner into class',
          type: 'error',
        })
        setIsEnrollingSubmit(false)
        return
      }

      const studentUuid = res.student_user_id
      let photoUploaded = false
      let docsUploadedCount = 0

      if (studentUuid) {
        // 1. Upload Passport Photo if provided
        if (enrollPhotoFile) {
          try {
            const photoFd = new FormData()
            photoFd.append('student_id', studentUuid)
            photoFd.append('photo', enrollPhotoFile)
            const photoRes = await fetch('/api/students/photo', {
              method: 'POST',
              body: photoFd,
            })
            if (photoRes.ok) photoUploaded = true
          } catch (err) {
            console.warn('[AdmissionsClient] Photo upload warning:', err)
          }
        }

        // 2. Upload Supporting Documents if provided
        for (const docItem of enrollDocs) {
          try {
            const docFd = new FormData()
            docFd.append('student_id', studentUuid)
            docFd.append('label', docItem.label)
            docFd.append('file', docItem.file)
            const docRes = await fetch('/api/students/documents', {
              method: 'POST',
              body: docFd,
            })
            if (docRes.ok) docsUploadedCount++
          } catch (err) {
            console.warn('[AdmissionsClient] Document upload warning:', err)
          }
        }
      }

      setApplications((prev) =>
        prev.map((a) =>
          a.id === enrollingApp.id
            ? {
                ...a,
                status: 'enrolled',
                notes: enrollForm.notes || a.notes,
                enrolled_student_id: studentUuid || a.enrolled_student_id,
              }
            : a
        )
      )

      if (selectedApp && selectedApp.id === enrollingApp.id) {
        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                status: 'enrolled',
                notes: enrollForm.notes || prev.notes,
                enrolled_student_id: studentUuid || prev.enrolled_student_id,
              }
            : null
        )
      }

      const attachmentParts: string[] = []
      if (photoUploaded) attachmentParts.push('passport photo')
      if (docsUploadedCount > 0) attachmentParts.push(`${docsUploadedCount} document(s)`)
      const attachmentSummary =
        attachmentParts.length > 0 ? ` Uploaded ${attachmentParts.join(' & ')}.` : ''

      const invoiceDownloadUrl = res.invoice_id
        ? `/api/accountant/invoices/pdf?invoice_id=${encodeURIComponent(res.invoice_id)}&download=1`
        : studentUuid
        ? `/api/accountant/invoices/pdf?student_id=${encodeURIComponent(studentUuid)}&download=1`
        : undefined

      setStatusMessage({
        text: `✓ Success! ${enrollingApp.first_name} ${enrollingApp.last_name} admitted to ${enrollForm.gradeLevel || enrollingApp.class_applied_for} (Stream ${enrollForm.section || 'A'}) with Student ID: ${res.student_id}.${attachmentSummary}${res.invoice_generated ? ` Invoice generated (TZS ${Number(res.invoice_total || 0).toLocaleString()}).` : ''}`,
        type: 'success',
        invoiceUrl: res.invoice_generated ? invoiceDownloadUrl : undefined,
      })
      setEnrollingApp(null)
    } catch (err: any) {
      setStatusMessage({
        text: err?.message || 'Unexpected error during student enrollment',
        type: 'error',
      })
    } finally {
      setIsEnrollingSubmit(false)
    }
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
          text: ('error' in res ? res.error : undefined) || 'Failed to update application',
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
        const attributionLabel = res.application.sales_agent_name || (currentUser?.isReceptionist ? 'WALK IN' : 'Sales Agent')
        setStatusMessage({
          text: res.enrolled
            ? `✓ Learner "${res.application.first_name} ${res.application.last_name}" registered & enrolled! Student ID: ${res.student_id} • Attributed to: ${attributionLabel}.`
            : `✓ Learner "${res.application.first_name} ${res.application.last_name}" registered successfully! Attributed to: ${attributionLabel}. Application #: ${res.application.application_no}`,
          type: 'success',
        })
        // Reset form
        setRegForm({
          firstName: '',
          lastName: '',
          middleName: '',
          gender: 'Male',
          dob: '',
          nationality: 'Tanzanian',
          classAppliedFor: classes[0]?.class_name || classes[0]?.name || 'Cambridge Year 1',
          curriculum: 'Cambridge',
          academicYear: '2026/2027',
          startTerm: 'Term 1',
          previousSchool: '',
          parentName: '',
          parentPhone: '',
          parentWhatsapp: '',
          parentEmail: '',
          parentRelationship: 'Mother',
          parentAddress: '',
          feePlan: 'Standard Termly',
          transportRequired: false,
          medicalConditions: '',
          additionalNotes: '',
          enrollImmediately: false,
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 style={{ fontSize: '1.85rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
              Student Admissions Desk
            </h1>
            {currentUser?.isSales && (
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold leading-snug bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                Sales Agent Portal
              </span>
            )}
            {currentUser?.isReceptionist && (
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold leading-snug bg-amber-100 text-amber-900 border border-amber-200 whitespace-nowrap">
                Receptionist Desk • Walk-In Admissions
              </span>
            )}
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', margin: 0 }}>
            {currentUser?.isSales
              ? `Register new learner applications and track learners attributed to ${currentUser.name}.`
              : currentUser?.isReceptionist
              ? 'Admit applicants, register walk-in students (automatically attributed to "WALK IN"), and view student bio data.'
              : 'Online submissions from website, walk-in & sales agent registrations, student class admission modal, and official 2027 PDF forms.'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <UserPlus size={16} className="shrink-0" />
            <span>+ Register Learner</span>
          </button>

          <button
            type="button"
            onClick={() => setShowClassBreakdown((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors shadow-2xs whitespace-nowrap cursor-pointer ${
              showClassBreakdown
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <School size={16} className={showClassBreakdown ? 'text-amber-400 shrink-0' : 'text-slate-500 shrink-0'} />
            <span>Class &amp; Gender Breakdown</span>
          </button>

          {!currentUser?.isSales && (
            <>
              <Link
                href="/dashboard/students"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
              >
                <GraduationCap size={16} className="text-slate-500 shrink-0" />
                <span>Students List</span>
              </Link>
              <Link
                href="/dashboard/accountant/invoices"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap"
              >
                <Receipt size={16} className="text-emerald-600 shrink-0" />
                <span>Student Invoices</span>
              </Link>
            </>
          )}
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
          <div className="flex items-center gap-3 flex-wrap">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={20} className="text-sky-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
            {statusMessage.invoiceUrl && (
              <a
                href={statusMessage.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
              >
                <Download size={13} />
                <span>Download Invoice (PDF)</span>
              </a>
            )}
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
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${currentUser?.isSales ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4`}>
        <div className="p-5 pt-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-snug">
              {currentUser?.isSales ? 'My Registered Learners' : 'Total Applications'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200/80 transition-colors flex items-center justify-center shrink-0">
              <FileText size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 font-[Outfit] leading-tight">
              {metrics.total}
            </div>
            <div
              className="text-xs text-slate-500 mt-1 truncate"
              title={currentUser?.isSales ? `Attributed to ${currentUser.name}` : 'All registered learners'}
            >
              {currentUser?.isSales ? `Attributed to ${currentUser.name}` : 'All registered learners'}
            </div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-5 pt-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 leading-snug">New / Received</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 font-[Outfit] leading-tight">
              {metrics.submitted}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">Awaiting staff review</div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="p-5 pt-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 leading-snug">Enrolled Students</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors flex items-center justify-center shrink-0">
              <GraduationCap size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 font-[Outfit] leading-tight">
              {metrics.enrolled}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">Placed in school classes</div>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-teal-600 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        {!currentUser?.isSales && (
          <>
            <div className="p-5 pt-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 leading-snug">Sales Attribution</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors flex items-center justify-center shrink-0">
                  <User size={18} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 font-[Outfit] leading-tight">
                  {metrics.salesCount}
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">Registered by sales agents</div>
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="p-5 pt-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 leading-snug">Website Direct</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors flex items-center justify-center shrink-0">
                  <Sparkles size={18} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 font-[Outfit] leading-tight">
                  {metrics.websiteCount}
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">Attributed to (website)</div>
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        )}
      </div>

      {/* Collapsible Classroom & Gender Breakdown */}
      {showClassBreakdown && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Classroom &amp; Gender Breakdown
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Live breakdown of filtered applications ({filtered.length} total) across classrooms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowClassBreakdown(false)}
              className="text-slate-400 hover:text-slate-700 p-1"
              aria-label="Close breakdown"
            >
              <X size={16} />
            </button>
          </div>
          {classGenderBreakdown.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">
              No applications match the current filters.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Classroom</th>
                    <th className="text-right">Male</th>
                    <th className="text-right">Female</th>
                    <th className="text-right">Enrolled</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {classGenderBreakdown.map((row) => (
                    <tr key={row.classroom}>
                      <td className="font-semibold text-slate-900">{row.classroom}</td>
                      <td className="text-right">{row.male}</td>
                      <td className="text-right">{row.female}</td>
                      <td className="text-right text-emerald-700 font-semibold">{row.enrolled}</td>
                      <td className="text-right font-bold text-slate-900">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Search and Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all bg-slate-50/50 hover:bg-white"
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
            className="px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">New / Received</option>
            <option value="under_review">Under Review</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="accepted">Accepted</option>
            <option value="enrolled">Enrolled in School</option>
            <option value="rejected">Declined</option>
          </select>

          {/* Attribution Filter (Management & Receptionist) */}
          {!currentUser?.isSales && (
            <select
              value={attributionFilter}
              onChange={(e) => setAttributionFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Attributions</option>
              <option value="walk_in">Attributed to: WALK IN</option>
              <option value="website">Attributed to: (website)</option>
              <option value="sales">Attributed to: Sales Agents</option>
            </select>
          )}

          {/* Curriculum Filter */}
          <select
            value={curriculumFilter}
            onChange={(e) => setCurriculumFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
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
                  const isWalkIn = Boolean(app.source === 'walk_in' || app.sales_agent_name?.toUpperCase() === 'WALK IN')
                  const isSales = Boolean(!isWalkIn && (app.sales_agent_name || app.source === 'sales'))
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
                        {isWalkIn ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                            title="Attributed to: WALK IN (Registered at Reception Desk)"
                          >
                            <User size={12} className="text-amber-600 shrink-0" />
                            <span>WALK IN</span>
                          </span>
                        ) : isSales ? (
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

                          {/* Enroll Action Button (Opens Additional Details Modal) */}
                          {!currentUser?.isSales && (
                            !isEnrolled ? (
                              <button
                                type="button"
                                onClick={() => openEnrollModal(app)}
                                disabled={isPending || isEnrollingSubmit}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Open Admission Modal to Select Class, Stream, Photo & Documents"
                              >
                                <GraduationCap size={13} />
                                <span>Enroll</span>
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                {app.enrolled_student_id && (
                                  <a
                                    href={`/api/accountant/invoices/pdf?student_id=${encodeURIComponent(app.enrolled_student_id)}&download=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                                    title="Download Student Fee Invoice PDF"
                                  >
                                    <Receipt size={13} />
                                    <span>Invoice</span>
                                  </a>
                                )}
                                <Link
                                  href="/dashboard/students"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
                                  title="View Enrolled Student in Students List"
                                >
                                  <Check size={13} />
                                  <span>Enrolled</span>
                                </Link>
                              </div>
                            )
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
                {selectedApp.source === 'walk_in' || selectedApp.sales_agent_name?.toUpperCase() === 'WALK IN' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    <User size={13} className="text-amber-600" />
                    <span>WALK IN</span>
                  </span>
                ) : selectedApp.sales_agent_name ? (
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
                Source: <strong>{selectedApp.source === 'walk_in' ? 'WALK IN' : selectedApp.source || 'website'}</strong>
              </div>
            </div>

            {/* Enrollment Action Box (Management & Receptionist) */}
            {!currentUser?.isSales && (
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
                      {selectedApp.enrolled_student_id && (
                        <a
                          href={`/api/accountant/invoices/pdf?student_id=${encodeURIComponent(selectedApp.enrolled_student_id)}&download=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                        >
                          <Download size={13} />
                          <span>Download Student Invoice (PDF)</span>
                        </a>
                      )}
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
                      Click <strong>Enroll Learner Now</strong> to open the Class Admission Form where you can specify Class, Stream, Passport Photo, and Supporting Documents.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[220px]">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-teal-900 block mb-1">
                          Pre-Select Class for Placement
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
                        disabled={isPending || isEnrollingSubmit}
                        onClick={() => openEnrollModal(selectedApp, targetClassId || undefined)}
                        className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-md hover:shadow-lg active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <GraduationCap size={15} />
                        <span>Enroll Learner Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                {!currentUser?.isSales && (
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
                )}

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {currentUser?.isSales ? 'Application Notes' : 'Internal Staff Notes'}
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

      {/* 5B. ENROLL & ADMIT STUDENT TO CLASS MODAL (Asks for Class, Stream, Photo, and Other Documents) */}
      {enrollingApp && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-5"
          onClick={() => !isEnrollingSubmit && setEnrollingApp(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '860px',
              width: '100%',
              maxHeight: '93vh',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              backgroundColor: 'var(--color-surface)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0">
                      Admit & Enroll Student to Class
                    </h2>
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      {enrollingApp.application_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 m-0 mt-1">
                    Complete student class placement, stream, passport photo, and supporting documents for{' '}
                    <strong className="text-slate-800">
                      {enrollingApp.first_name} {enrollingApp.middle_name ? `${enrollingApp.middle_name} ` : ''}
                      {enrollingApp.last_name}
                    </strong>
                    .
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isEnrollingSubmit}
                onClick={() => setEnrollingApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmEnrollment} className="flex flex-col gap-5 mt-5">
              {/* SECTION 1: CLASS, STREAM & ADMISSION PLACEMENT */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col gap-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    <School size={15} className="text-teal-700" />
                    <span>1. Class & Stream Placement</span>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-800 bg-white/80 px-2.5 py-0.5 rounded-full border border-teal-200">
                    Applied for: {enrollingApp.class_applied_for} ({enrollingApp.curriculum || 'Cambridge'})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* School Class Dropdown */}
                  <div className="form-group sm:col-span-2">
                    <label className="form-label text-xs font-semibold text-slate-800">
                      Assign School Class *
                    </label>
                    <select
                      className="input-field text-sm bg-white"
                      value={enrollForm.targetClassId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        const found = classes.find((c) => c.id === selectedId)
                        setEnrollForm((prev) => ({
                          ...prev,
                          targetClassId: selectedId,
                          gradeLevel: found ? found.grade_level || found.name || prev.gradeLevel : prev.gradeLevel,
                          section: found?.section ? found.section : prev.section,
                        }))
                      }}
                    >
                      <option value="">
                        Auto-create / match "{enrollForm.gradeLevel || enrollingApp.class_applied_for}" (Stream {enrollForm.section || 'A'})
                      </option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.class_name} {c.section ? `— Stream ${c.section}` : ''} ({c.grade_level || 'Class'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grade / Class Level */}
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold text-slate-800">
                      Class / Grade Level *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cambridge Year 1"
                      className="input-field text-sm bg-white"
                      value={enrollForm.gradeLevel || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, gradeLevel: e.target.value })}
                    />
                  </div>

                  {/* Stream / Section */}
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold text-slate-800">
                      Stream / Section *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        placeholder="e.g. A, B, Blue, Gold"
                        className="input-field text-sm bg-white flex-1"
                        value={enrollForm.section || ''}
                        onChange={(e) => setEnrollForm({ ...enrollForm, section: e.target.value })}
                      />
                      <select
                        aria-label="Stream presets"
                        className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setEnrollForm({ ...enrollForm, section: e.target.value })
                          }
                        }}
                      >
                        <option value="">Presets</option>
                        {STREAM_PRESETS.map((st) => (
                          <option key={st} value={st}>
                            Stream {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold text-slate-800">Admission Date *</label>
                    <input
                      type="date"
                      required
                      className="input-field text-sm bg-white"
                      value={enrollForm.admissionDate || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, admissionDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold text-slate-800">Date of Birth</label>
                    <input
                      type="date"
                      className="input-field text-sm bg-white"
                      value={enrollForm.dob || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, dob: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold text-slate-800">Gender</label>
                    <select
                      className="input-field text-sm bg-white"
                      value={enrollForm.gender || 'Male'}
                      onChange={(e) => setEnrollForm({ ...enrollForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: STUDENT PASSPORT PHOTO & SUPPORTING ADMISSION DOCUMENTS */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col gap-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Camera size={15} className="text-indigo-600" />
                  <span>2. Student Passport Photo & Supporting Admission Documents</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Passport Photo Upload Box */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col items-center text-center gap-2.5">
                    <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative">
                      {enrollPhotoPreview ? (
                        <img
                          src={enrollPhotoPreview}
                          alt="Student passport preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400 p-2">
                          <Camera size={26} />
                          <span className="text-[10px] font-semibold mt-1">Passport Photo</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Student Passport Photo</div>
                      <p className="text-[11px] text-slate-500 m-0">JPG, PNG or WebP (Max 5MB)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors">
                        <Upload size={13} />
                        <span>{enrollPhotoFile ? 'Change Photo' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handleEnrollPhotoSelect}
                        />
                      </label>
                      {enrollPhotoFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollPhotoFile(null)
                            setEnrollPhotoPreview('')
                          }}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Supporting Documents Upload Slots */}
                  <div className="md:col-span-2 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        'Birth Certificate / Passport',
                        'Transfer / Previous Report Card',
                        'Medical / Immunization Record',
                      ].map((slotLabel) => {
                        const attached = enrollDocs.find((d) => d.label === slotLabel)
                        return (
                          <label
                            key={slotLabel}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                              attached
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                                : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="text-xs font-bold leading-snug">{slotLabel}</span>
                              {attached ? (
                                <FileCheck size={15} className="text-emerald-600 shrink-0" />
                              ) : (
                                <Paperclip size={14} className="text-slate-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] truncate text-slate-500">
                              {attached ? attached.file.name : 'Click to attach PDF/Image'}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,image/*,.doc,.docx"
                              className="hidden"
                              onChange={(e) => handleSlotDocSelect(slotLabel, e)}
                            />
                          </label>
                        )
                      })}
                    </div>

                    {/* Custom / Additional Document Uploader */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Document label (e.g. National ID, Visa, Fee Receipt)"
                        className="input-field text-xs flex-1 min-w-[180px]"
                        value={customDocLabel}
                        onChange={(e) => setCustomDocLabel(e.target.value)}
                      />
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer transition-colors shrink-0">
                        <Paperclip size={13} />
                        <span>+ Attach Other Document(s)</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,image/*,.doc,.docx"
                          className="hidden"
                          onChange={handleAdditionalDocsSelect}
                        />
                      </label>
                    </div>

                    {/* Attached Documents Pill List */}
                    {enrollDocs.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[11px] font-bold uppercase text-slate-500">
                          Attached Documents ({enrollDocs.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {enrollDocs.map((doc, idx) => (
                            <span
                              key={`${doc.label}-${idx}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-900 border border-indigo-200"
                            >
                              <FileCheck size={12} className="text-indigo-600 shrink-0" />
                              <strong className="font-semibold">{doc.label}:</strong>
                              <span className="truncate max-w-[150px]">{doc.file.name}</span>
                              <button
                                type="button"
                                onClick={() => removeEnrollDoc(idx)}
                                className="text-slate-400 hover:text-rose-600 ml-1"
                                title="Remove document"
                              >
                                <X size={13} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADDITIONAL STUDENT BIO & HEALTH DETAILS */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col gap-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <HeartHandshake size={15} className="text-rose-600" />
                  <span>3. Additional Bio-Data, Welfare & Emergency Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Nationality</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="e.g. Tanzanian"
                      value={enrollForm.nationality || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, nationality: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Language Spoken at Home</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="e.g. English, Swahili"
                      value={enrollForm.languageAtHome || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, languageAtHome: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Previous School</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Previous school attended"
                      value={enrollForm.previousSchool || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, previousSchool: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Emergency Contact (Name & Phone)</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Emergency contact person & phone"
                      value={enrollForm.emergencyContact || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, emergencyContact: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Medical Conditions</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Any medical conditions (or None)"
                      value={enrollForm.medicalInfo || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, medicalInfo: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-xs font-semibold">Known Allergies</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Food/medication allergies (or None)"
                      value={enrollForm.allergies || ''}
                      onChange={(e) => setEnrollForm({ ...enrollForm, allergies: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Admission / Class Placement Notes</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Optional admission remarks or special class instructions..."
                    value={enrollForm.notes || ''}
                    onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 flex-wrap gap-3">
                <div className="text-xs text-slate-500">
                  Parent Linked: <strong className="text-slate-800">{enrollingApp.parent_name}</strong> ({enrollingApp.parent_phone})
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isEnrollingSubmit}
                    onClick={() => setEnrollingApp(null)}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEnrollingSubmit}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <GraduationCap size={17} />
                    <span>
                      {isEnrollingSubmit
                        ? 'Admitting & Uploading...'
                        : `Confirm & Admit to ${enrollForm.gradeLevel || enrollingApp.class_applied_for} (${enrollForm.section || 'A'})`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
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
                    {currentUser?.isReceptionist
                      ? 'WALK IN (Receptionist Desk)'
                      : `${currentUser?.name || 'Sales Staff'} (${currentUser?.isSales ? 'Sales' : 'Staff'})`}
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
                1. Learner Information <span className="font-normal text-slate-400">/ Taarifa za Mwanafunzi</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                  <label className="form-label text-xs font-semibold">Nationality</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Tanzanian"
                    value={regForm.nationality || ''}
                    onChange={(e) => setRegForm({ ...regForm, nationality: e.target.value })}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Class Applied For *</label>
                  <select
                    required
                    className="input-field text-sm"
                    value={regForm.classAppliedFor}
                    onChange={(e) => setRegForm({ ...regForm, classAppliedFor: e.target.value })}
                  >
                    {classes.length > 0 ? (
                      classes.map((cls) => {
                        const label = cls.class_name || cls.name
                        return (
                          <option key={cls.id} value={label}>
                            {label}
                          </option>
                        )
                      })
                    ) : (
                      <>
                        <option value="Nursery">Nursery</option>
                        <option value="Reception">Reception</option>
                        <option value="Cambridge Year 1">Cambridge Year 1</option>
                        <option value="Cambridge Year 2">Cambridge Year 2</option>
                        <option value="Cambridge Year 3">Cambridge Year 3</option>
                        <option value="Cambridge Year 4">Cambridge Year 4</option>
                        <option value="Cambridge Year 5">Cambridge Year 5</option>
                        <option value="Cambridge Year 6">Cambridge Year 6</option>
                        <option value="Cambridge Year 7">Cambridge Year 7</option>
                        <option value="Cambridge Year 8">Cambridge Year 8</option>
                        <option value="Cambridge Year 9">Cambridge Year 9</option>
                        <option value="Form 1">Form 1</option>
                        <option value="Form 2">Form 2</option>
                        <option value="Form 3">Form 3</option>
                        <option value="Form 4">Form 4</option>
                      </>
                    )}
                  </select>
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
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Start Term</label>
                  <select
                    className="input-field text-sm"
                    value={regForm.startTerm || 'Term 1'}
                    onChange={(e) => setRegForm({ ...regForm, startTerm: e.target.value })}
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Previous School (if any)</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Name of previous school"
                    value={regForm.previousSchool || ''}
                    onChange={(e) => setRegForm({ ...regForm, previousSchool: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Medical / Dietary Notes</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Allergies, dietary preference, or medical notes"
                    value={regForm.medicalConditions || ''}
                    onChange={(e) => setRegForm({ ...regForm, medicalConditions: e.target.value })}
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="text-xs font-bold uppercase text-slate-500 tracking-wider pt-2 border-t border-slate-100">
                2. Parent / Guardian Information <span className="font-normal text-slate-400">/ Taarifa za Mzazi</span>
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
                  <label className="form-label text-xs font-semibold">Relationship to Student</label>
                  <select
                    className="input-field text-sm"
                    value={regForm.parentRelationship || 'Mother'}
                    onChange={(e) => setRegForm({ ...regForm, parentRelationship: e.target.value })}
                  >
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Parent">Parent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Primary Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="07XXXXXXXX or +255..."
                    className="input-field text-sm"
                    value={regForm.parentPhone}
                    onChange={(e) => setRegForm({ ...regForm, parentPhone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="Optional if different"
                    className="input-field text-sm"
                    value={regForm.parentWhatsapp || ''}
                    onChange={(e) => setRegForm({ ...regForm, parentWhatsapp: e.target.value })}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Residential Address</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="e.g. Mbweni, Kinondoni, Dar es Salaam"
                    value={regForm.parentAddress || ''}
                    onChange={(e) => setRegForm({ ...regForm, parentAddress: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Fee Plan</label>
                  <select
                    className="input-field text-sm"
                    value={regForm.feePlan || 'Standard Termly'}
                    onChange={(e) => setRegForm({ ...regForm, feePlan: e.target.value })}
                  >
                    <option value="Standard Termly">Standard Termly</option>
                    <option value="Monthly Installment">Monthly Installment</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Notes / Special Preferences</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    placeholder="Transport route, clubs, or special notes..."
                    value={regForm.additionalNotes || ''}
                    onChange={(e) => setRegForm({ ...regForm, additionalNotes: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2.5 p-2.5 mt-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(regForm.transportRequired)}
                    onChange={(e) => setRegForm({ ...regForm, transportRequired: e.target.checked })}
                    className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold">School Transport Required</span>
                </label>
              </div>

              {!currentUser?.isSales && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(regForm.enrollImmediately)}
                    onChange={(e) => setRegForm({ ...regForm, enrollImmediately: e.target.checked })}
                    className="rounded border-teal-400 text-teal-700 focus:ring-teal-500"
                  />
                  <span>
                    <strong>Admit & Enroll Immediately into School</strong> — Create student ID, place in class, and add to Students List right now.
                  </span>
                </label>
              )}

              {/* Attribution confirmation */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center gap-2">
                <User size={15} className="text-indigo-600 shrink-0" />
                <span>
                  {currentUser?.isReceptionist ? (
                    <>
                      This registration will be attributed to <strong>WALK IN</strong> (Registered by Receptionist).
                    </>
                  ) : (
                    <>
                      This registration will be attributed to{' '}
                      <strong>{currentUser?.name || 'Sales Staff'}</strong> as the registered sales person.
                    </>
                  )}
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
