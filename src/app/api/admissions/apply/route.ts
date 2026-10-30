import { type NextRequest, NextResponse } from 'next/server'
import { route, ok, parseJson } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/errors'
import { createServiceClient } from '@/utils/supabase/service'
import { generateAdmissionFormPdf, type AdmissionApplicationData } from '@/lib/admissions/admissionFormPdf'
import { sendMail } from '@/lib/email/mailer'

export const runtime = 'nodejs'

const ADMISSIONS_OFFICE_EMAIL = process.env.ADMISSIONS_EMAIL || 'admissions@leaderinternationalschool.ac.tz'

interface ApplyPayload {
  reference?: string
  applicationNo?: string
  kind?: string

  // Student details
  firstName?: string
  lastName?: string
  middleName?: string
  dob?: string
  gender?: string
  placeOfBirth?: string
  nationality?: string
  idNumber?: string
  curriculum?: string
  applyingFor?: string
  classAppliedFor?: string
  academicYear?: string
  startTerm?: string
  previousSchool?: string

  // Parent / Guardian details
  parentName?: string
  relationship?: string
  parentRelationship?: string
  occupation?: string
  parentOccupation?: string
  employer?: string
  parentEmployer?: string
  email?: string
  parentEmail?: string
  phone?: string
  parentPhone?: string
  whatsapp?: string
  parentWhatsapp?: string
  address?: string
  parentAddress?: string

  // Guardian 2
  guardian2Name?: string
  guardian2Relationship?: string
  guardian2Occupation?: string
  guardian2Employer?: string
  guardian2Phone?: string
  guardian2Email?: string
  guardian2Address?: string

  // Preferences & Services
  transport?: string | boolean
  transportRequired?: string | boolean
  transportRoute?: string
  boarding?: string
  feePlan?: string
  subjects?: string | string[]
  clubs?: string | string[]
  medical?: string
  medicalConditions?: string
  additional?: string
  additionalNotes?: string
  source?: string
}

function cleanStr(val: unknown): string {
  if (typeof val === 'string') return val.trim()
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

export const POST = route(
  async ({ req, requestId }) => {
    const body = await parseJson<ApplyPayload>(req)

    const firstName = cleanStr(body.firstName)
    const lastName = cleanStr(body.lastName)
    const parentName = cleanStr(body.parentName)
    const email = cleanStr(body.email || body.parentEmail)
    const phone = cleanStr(body.phone || body.parentPhone)
    const classAppliedFor = cleanStr(body.classAppliedFor || body.applyingFor || 'Primary')

    if (!firstName || !lastName) {
      throw new ApiError('VALIDATION_FAILED', 'Student first and last names are required')
    }
    if (!parentName) {
      throw new ApiError('VALIDATION_FAILED', 'Parent or guardian name is required')
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new ApiError('VALIDATION_FAILED', 'A valid contact email address is required')
    }
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      throw new ApiError('VALIDATION_FAILED', 'A valid phone number is required')
    }

    const applicationNo =
      cleanStr(body.applicationNo || body.reference) ||
      `LIS-2027-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const middleName = cleanStr(body.middleName)
    const dob = cleanStr(body.dob)
    const gender = cleanStr(body.gender)
    const placeOfBirth = cleanStr(body.placeOfBirth)
    const nationality = cleanStr(body.nationality) || 'Tanzanian'
    const idNumber = cleanStr(body.idNumber)
    const curriculum = cleanStr(body.curriculum) || (classAppliedFor.toLowerCase().includes('necta') ? 'NECTA' : 'Cambridge')
    const academicYear = cleanStr(body.academicYear) || '2026/2027'
    const startTerm = cleanStr(body.startTerm) || 'January 2027 Intake'
    const previousSchool = cleanStr(body.previousSchool)

    const relationship = cleanStr(body.relationship || body.parentRelationship) || 'Parent'
    const occupation = cleanStr(body.occupation || body.parentOccupation)
    const employer = cleanStr(body.employer || body.parentEmployer)
    const whatsapp = cleanStr(body.whatsapp || body.parentWhatsapp) || phone
    const address = cleanStr(body.address || body.parentAddress)

    const guardian2Name = cleanStr(body.guardian2Name)
    const guardian2Relationship = cleanStr(body.guardian2Relationship)
    const guardian2Occupation = cleanStr(body.guardian2Occupation)
    const guardian2Employer = cleanStr(body.guardian2Employer)
    const guardian2Phone = cleanStr(body.guardian2Phone)
    const guardian2Email = cleanStr(body.guardian2Email)
    const guardian2Address = cleanStr(body.guardian2Address)

    const rawTransport = body.transportRequired ?? body.transport
    const transportRequired =
      rawTransport === true ||
      cleanStr(rawTransport).toLowerCase().startsWith('y') ||
      cleanStr(rawTransport).toLowerCase().includes('send routes')

    const feePlan = cleanStr(body.feePlan || body.boarding) || 'Standard Termly'
    const medical = cleanStr(body.medical || body.medicalConditions)
    const additional = cleanStr(body.additional || body.additionalNotes)
    const rawClubs = body.clubs ?? body.subjects
    const clubs: string[] = Array.isArray(rawClubs)
      ? rawClubs.map(String)
      : rawClubs
      ? [String(rawClubs)]
      : []

    // 1. Generate 3-page PDF Form overlay
    const pdfData: AdmissionApplicationData = {
      applicationNo,
      dateReceived: new Date().toISOString(),
      firstName,
      lastName,
      dob,
      gender,
      placeOfBirth,
      nationality,
      idNumber,
      curriculum,
      classAppliedFor,
      previousSchool,
      parentName,
      relationship,
      occupation,
      employer,
      phone,
      whatsapp,
      email,
      address,
      guardian2Name,
      guardian2Relationship,
      guardian2Occupation,
      guardian2Employer,
      guardian2Phone,
      guardian2Email,
      guardian2Address,
      transportRequired,
      clubs,
      paymentPlan: feePlan,
      startTerm,
      medicalInfo: medical,
      additionalInfo: additional,
    }

    let pdfBuffer: Buffer
    try {
      pdfBuffer = await generateAdmissionFormPdf(pdfData)
    } catch (pdfErr) {
      console.error('[admissions/apply] PDF generation failed:', pdfErr)
      throw new ApiError('INTERNAL', 'Failed to generate official admission form PDF')
    }

    // 2. Persist in database
    const supabase = createServiceClient()
    const { error: dbError } = await supabase.from('admission_applications').insert({
      application_no: applicationNo,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName || null,
      date_of_birth: dob ? dob.slice(0, 10) : null,
      gender: gender || null,
      place_of_birth: placeOfBirth || null,
      nationality,
      id_number: idNumber || null,
      curriculum,
      class_applied_for: classAppliedFor,
      academic_year: academicYear,
      start_term: startTerm,
      previous_school: previousSchool || null,
      parent_name: parentName,
      parent_relationship: relationship,
      parent_occupation: occupation || null,
      parent_employer: employer || null,
      parent_email: email,
      parent_phone: phone,
      parent_whatsapp: whatsapp || null,
      parent_address: address || null,
      guardian2_name: guardian2Name || null,
      guardian2_relationship: guardian2Relationship || null,
      guardian2_occupation: guardian2Occupation || null,
      guardian2_employer: guardian2Employer || null,
      guardian2_phone: guardian2Phone || null,
      guardian2_email: guardian2Email || null,
      guardian2_address: guardian2Address || null,
      transport_required: transportRequired,
      transport_route: null,
      fee_plan: feePlan || null,
      clubs,
      medical_conditions: medical || null,
      special_talents_interests: clubs.join(', ') || null,
      additional_notes: additional || null,
      source: cleanStr(body.source) || 'website',
      pdf_sent_to_school: false,
      pdf_sent_to_parent: false,
    })

    if (dbError) {
      console.error('[admissions/apply] DB insert error:', dbError)
      // Even if DB has issue, we proceed to dispatch email so application is not lost
    }

    // 3. Dispatch Email to Admissions Office
    const pdfFilename = `Leaders_Admission_Form_${applicationNo}.pdf`
    const emailSubject = `New Admission Application: ${applicationNo} — ${firstName} ${lastName} (${classAppliedFor})`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; color: #1e293b; line-height: 1.6;">
        <div style="background-color: #0f294a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">LEADERS INTERNATIONAL SCHOOL</h1>
          <p style="color: #94a3b8; margin: 5px 0 0; font-size: 13px;">Official Student Admission Application</p>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <div style="background: #f8fafc; border-left: 4px solid #0f294a; padding: 12px 16px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px;"><strong>Application Reference:</strong> <span style="color: #0f294a; font-weight: bold;">${applicationNo}</span></p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Submitted via Website Admissions Desk</p>
          </div>

          <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f294a;">Student Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Full Name:</td><td><strong>${firstName} ${lastName}</strong></td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Applying For:</td><td><strong>${classAppliedFor}</strong> (${curriculum})</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Intake Term:</td><td>${startTerm}</td></tr>
            ${dob ? `<tr><td style="padding: 4px 0; color: #64748b;">Date of Birth:</td><td>${dob}</td></tr>` : ''}
            ${nationality ? `<tr><td style="padding: 4px 0; color: #64748b;">Nationality:</td><td>${nationality}</td></tr>` : ''}
            ${previousSchool ? `<tr><td style="padding: 4px 0; color: #64748b;">Previous School:</td><td>${previousSchool}</td></tr>` : ''}
          </table>

          <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f294a;">Parent / Guardian Contact</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">Name:</td><td><strong>${parentName}</strong> (${relationship})</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Email:</td><td><a href="mailto:${email}" style="color: #0284c7;">${email}</a></td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Phone:</td><td>${phone}</td></tr>
            ${whatsapp ? `<tr><td style="padding: 4px 0; color: #64748b;">WhatsApp:</td><td>${whatsapp}</td></tr>` : ''}
            ${address ? `<tr><td style="padding: 4px 0; color: #64748b;">Address:</td><td>${address}</td></tr>` : ''}
          </table>

          <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f294a;">Services & Notes</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 140px;">School Transport:</td><td>${transportRequired ? 'Yes, required' : 'No'}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Fee Plan:</td><td>${feePlan}</td></tr>
            ${clubs.length > 0 ? `<tr><td style="padding: 4px 0; color: #64748b;">Clubs / Interests:</td><td>${clubs.join(', ')}</td></tr>` : ''}
            ${medical ? `<tr><td style="padding: 4px 0; color: #64748b;">Medical Notes:</td><td>${medical}</td></tr>` : ''}
            ${additional ? `<tr><td style="padding: 4px 0; color: #64748b;">Additional Info:</td><td>${additional}</td></tr>` : ''}
          </table>

          <p style="margin-top: 24px; padding: 12px; background: #eff6ff; border-radius: 6px; font-size: 13px; color: #1e40af;">
            📎 <strong>Official PDF Attached:</strong> The complete 3-page 2027 Admission Form filled with all candidate data is attached to this email.
          </p>
        </div>
      </div>
    `

    const mailResult = await sendMail({
      to: ADMISSIONS_OFFICE_EMAIL,
      subject: emailSubject,
      html: emailHtml,
      replyTo: email,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    // Update database status
    if (!dbError) {
      await supabase
        .from('admission_applications')
        .update({
          pdf_sent_to_school: mailResult.ok,
          email_sent_at: mailResult.ok ? new Date().toISOString() : null,
        })
        .eq('application_no', applicationNo)
    }

    // Also dispatch acknowledgment email to parent with attachment
    try {
      await sendMail({
        to: email,
        subject: `Your Admission Application to Leaders International School (${applicationNo})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; line-height: 1.6;">
            <div style="background-color: #0f294a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Leaders International School</h1>
              <p style="color: #94a3b8; margin: 5px 0 0; font-size: 13px;">Excellence in Cambridge & National Curriculum</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p>Dear ${parentName},</p>
              <p>Thank you for submitting an application for <strong>${firstName} ${lastName}</strong> for admission to <strong>${classAppliedFor}</strong>.</p>
              <p>Your application reference number is <strong>${applicationNo}</strong>.</p>
              <p>The admissions desk has received your application along with the filled official admission form (attached for your records). Our admissions team will contact you within 3–5 business days to confirm assessment details and schedule an interview.</p>
              <p style="margin-top: 24px;">Warm regards,<br><strong>Admissions Team</strong><br>Leaders International School<br><a href="mailto:${ADMISSIONS_OFFICE_EMAIL}">${ADMISSIONS_OFFICE_EMAIL}</a></p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })
    } catch (parentMailErr) {
      console.warn('[admissions/apply] Parent notification email warning:', parentMailErr)
    }

    return ok(
      {
        status: 'received',
        reference: applicationNo,
        studentName: `${firstName} ${lastName}`,
        classAppliedFor,
        emailDispatchedTo: ADMISSIONS_OFFICE_EMAIL,
        message: 'Your application has been received and recorded. The official admission form (PDF) has been generated and dispatched to admissions@leaderinternationalschool.ac.tz.',
      },
      { requestId }
    )
  },
  {
    requireAuth: false,
    rateLimit: { key: 'admissions:apply', max: 30, windowMs: 60_000 },
  }
)

/**
 * GET /api/admissions/apply?reference=LIS-2027-XXXX&download=1
 * Allows downloading the generated PDF by application reference or viewing record details.
 */
export const GET = route(
  async ({ req }) => {
    const url = new URL(req.url)
    const reference = url.searchParams.get('reference') || url.searchParams.get('application_no')
    const download = url.searchParams.get('download') === '1'
    const preview = url.searchParams.get('preview') === '1' || url.searchParams.get('inline') === '1'
    const isPdf = download || preview

    if (!reference) {
      throw new ApiError('BAD_REQUEST', 'Missing reference or application_no parameter')
    }

    const supabase = createServiceClient()
    const { data: record, error } = await supabase
      .from('admission_applications')
      .select('*')
      .eq('application_no', reference)
      .single()

    if (error || !record) {
      throw new ApiError('NOT_FOUND', 'Admission application not found')
    }

    if (isPdf) {
      const pdfBuffer = await generateAdmissionFormPdf({
        applicationNo: record.application_no,
        dateReceived: record.created_at,
        firstName: record.first_name,
        lastName: record.last_name,
        dob: record.date_of_birth,
        gender: record.gender,
        placeOfBirth: record.place_of_birth,
        nationality: record.nationality,
        idNumber: record.id_number,
        curriculum: record.curriculum,
        classAppliedFor: record.class_applied_for,
        previousSchool: record.previous_school,
        parentName: record.parent_name,
        relationship: record.parent_relationship,
        occupation: record.parent_occupation,
        employer: record.parent_employer,
        phone: record.parent_phone,
        whatsapp: record.parent_whatsapp,
        email: record.parent_email,
        address: record.parent_address,
        guardian2Name: record.guardian2_name,
        guardian2Relationship: record.guardian2_relationship,
        guardian2Occupation: record.guardian2_occupation,
        guardian2Employer: record.guardian2_employer,
        guardian2Phone: record.guardian2_phone,
        guardian2Email: record.guardian2_email,
        guardian2Address: record.guardian2_address,
        transportRequired: record.transport_required,
        clubs: record.clubs || [],
        paymentPlan: record.fee_plan,
        startTerm: record.start_term,
        medicalInfo: record.medical_conditions,
        additionalInfo: record.additional_notes,
      })

      const disposition = preview ? 'inline' : 'attachment'

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${disposition}; filename="Leaders_Admission_Form_${record.application_no}.pdf"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      })
    }

    return ok({ application: record })
  },
  {
    requireAuth: false,
  }
)
