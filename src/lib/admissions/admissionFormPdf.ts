import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface AdmissionApplicationData {
  applicationNo: string
  dateReceived?: string
  firstName: string
  lastName: string
  dob?: string
  gender?: 'Male' | 'Female' | string
  placeOfBirth?: string
  nationality?: string
  idNumber?: string
  curriculum?: 'NECTA' | 'Cambridge' | string
  classAppliedFor: string
  previousSchool?: string

  // Parent / Guardian
  parentName: string
  relationship: string
  occupation?: string
  employer?: string
  phone: string
  whatsapp?: string
  email: string
  address?: string

  // Optional Guardian 2
  guardian2Name?: string
  guardian2Relationship?: string
  guardian2Phone?: string
  guardian2Email?: string
  guardian2Occupation?: string
  guardian2Employer?: string
  guardian2Address?: string

  // Services & Clubs
  transportRequired?: boolean | string
  clubs?: string[]
  paymentPlan?: string
  startTerm?: string
  medicalInfo?: string
  additionalInfo?: string
}

function formatDateDisplay(dStr?: string): string {
  if (!dStr) return new Date().toLocaleDateString('en-GB')
  try {
    const d = new Date(dStr)
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    }
    return dStr
  } catch {
    return dStr
  }
}

/**
 * Fills applicant data onto the official Leaders International School 2027 Admission Form PDF.
 * Returns a Buffer of the generated 3-page PDF.
 */
export async function generateAdmissionFormPdf(data: AdmissionApplicationData): Promise<Buffer> {
  // Load template from public/templates or fallback
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'Leaders_Admission_Form_2027.pdf')
  if (!fs.existsSync(templatePath)) {
    throw new Error('Admission Form PDF template not found at ' + templatePath)
  }
  const templateBytes = fs.readFileSync(templatePath)

  const pdfDoc = await PDFDocument.load(templateBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const textDark = rgb(0.12, 0.16, 0.22)
  const navyAccent = rgb(0.08, 0.24, 0.44)
  const tickColor = rgb(0.08, 0.45, 0.28) // deep green for checkmarks

  const dateStr = formatDateDisplay(data.dateReceived)
  const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim()
  const isMale = String(data.gender).toLowerCase().startsWith('m')
  const isFemale = String(data.gender).toLowerCase().startsWith('f')

  // Auto-detect curriculum from classAppliedFor or explicit curriculum field
  const curriculumLower = String(data.curriculum || data.classAppliedFor).toLowerCase()
  const isNecta = curriculumLower.includes('necta')
  const isCambridge = !isNecta || curriculumLower.includes('cambridge')

  // --------------------------------------------------------------------------
  // PAGE 1: Student Information & Parent / Guardian Information
  // --------------------------------------------------------------------------
  const page1 = pdfDoc.getPage(0)

  // Header Metadata
  page1.drawText(data.applicationNo || 'LIS-2027-NEW', { x: 75, y: 578, size: 9, font: boldFont, color: navyAccent })
  page1.drawText(dateStr, { x: 195, y: 578, size: 9, font, color: textDark })
  page1.drawText(data.classAppliedFor || 'Primary', { x: 295, y: 578, size: 9, font: boldFont, color: navyAccent })

  // 1. Student Information
  page1.drawText(fullName, { x: 263, y: 520, size: 10, font: boldFont, color: textDark })
  page1.drawText(formatDateDisplay(data.dob), { x: 263, y: 498, size: 9.5, font, color: textDark })

  // Gender tick
  if (isMale) {
    page1.drawText('X', { x: 264.5, y: 476, size: 9, font: boldFont, color: tickColor })
  } else if (isFemale) {
    page1.drawText('X', { x: 309.5, y: 476, size: 9, font: boldFont, color: tickColor })
  }

  page1.drawText(data.placeOfBirth || 'Zanzibar', { x: 263, y: 454, size: 9.5, font, color: textDark })
  page1.drawText(data.nationality || 'Tanzanian', { x: 263, y: 432, size: 9.5, font, color: textDark })
  if (data.idNumber) {
    page1.drawText(data.idNumber, { x: 263, y: 410, size: 9.5, font, color: textDark })
  }

  // Curriculum tick
  if (isNecta) {
    page1.drawText('X', { x: 264.5, y: 388, size: 9, font: boldFont, color: tickColor })
  } else {
    page1.drawText('X', { x: 321.5, y: 388, size: 9, font: boldFont, color: tickColor })
  }

  page1.drawText(data.classAppliedFor || '', { x: 263, y: 366, size: 9.5, font: boldFont, color: textDark })

  // 2. Parent / Guardian Information
  // Choose column based on relationship: Father -> Col 1 (x: 155), Mother -> Col 2 (x: 285), Other -> Col 3 (x: 415)
  const relLower = String(data.relationship || '').toLowerCase()
  let colX = 155
  if (relLower.includes('mother')) {
    colX = 285
  } else if (relLower.includes('guardian') || relLower.includes('other') || relLower.includes('grandparent')) {
    colX = 415
  }

  page1.drawText(data.parentName || '', { x: colX, y: 275, size: 9, font: boldFont, color: textDark })
  page1.drawText(data.relationship || 'Parent', { x: colX, y: 247, size: 9, font, color: textDark })
  if (data.occupation) page1.drawText(data.occupation, { x: colX, y: 219, size: 8.5, font, color: textDark })
  if (data.employer) page1.drawText(data.employer, { x: colX, y: 197, size: 8.5, font, color: textDark })
  
  const phoneText = data.whatsapp && data.whatsapp !== data.phone 
    ? `${data.phone} / WA: ${data.whatsapp}` 
    : data.phone || ''
  page1.drawText(phoneText, { x: colX, y: 175, size: 8.5, font, color: textDark })
  page1.drawText(data.email || '', { x: colX, y: 153, size: 8.5, font, color: textDark })
  if (data.address) page1.drawText(data.address.slice(0, 32), { x: colX, y: 131, size: 8, font, color: textDark })

  // If guardian 2 is present, populate the secondary column
  if (data.guardian2Name) {
    const col2X = colX === 285 ? 155 : 285
    page1.drawText(data.guardian2Name, { x: col22(col2X), y: 275, size: 9, font: boldFont, color: textDark })
    page1.drawText(data.guardian2Relationship || 'Parent', { x: col2X, y: 247, size: 9, font, color: textDark })
    if (data.guardian2Occupation) page1.drawText(data.guardian2Occupation, { x: col2X, y: 219, size: 8.5, font, color: textDark })
    if (data.guardian2Employer) page1.drawText(data.guardian2Employer, { x: col2X, y: 197, size: 8.5, font, color: textDark })
    if (data.guardian2Phone) page1.drawText(data.guardian2Phone, { x: col2X, y: 175, size: 8.5, font, color: textDark })
    if (data.guardian2Email) page1.drawText(data.guardian2Email, { x: col2X, y: 153, size: 8.5, font, color: textDark })
    if (data.guardian2Address) page1.drawText(data.guardian2Address.slice(0, 32), { x: col2X, y: 131, size: 8, font, color: textDark })
  }

  // --------------------------------------------------------------------------
  // PAGE 2: Services, Clubs, Checklist & Declaration
  // --------------------------------------------------------------------------
  const page2 = pdfDoc.getPage(1)

  // School Transport
  const transportNeeded = 
    data.transportRequired === true || 
    String(data.transportRequired).toLowerCase().includes('yes') ||
    String(data.transportRequired).toLowerCase().includes('required')

  if (transportNeeded) {
    page2.drawText('X', { x: 264.5, y: 665, size: 9, font: boldFont, color: tickColor })
  } else {
    page2.drawText('X', { x: 327.5, y: 665, size: 9, font: boldFont, color: tickColor })
  }

  // Clubs
  const clubsList = (data.clubs || []).map(c => c.toLowerCase())
  if (clubsList.some(c => c.includes('football') || c.includes('sport'))) page2.drawText('X', { x: 264.5, y: 643, size: 9, font: boldFont, color: tickColor })
  if (clubsList.some(c => c.includes('robotics') || c.includes('coding') || c.includes('code'))) page2.drawText('X', { x: 323.5, y: 643, size: 9, font: boldFont, color: tickColor })
  if (clubsList.some(c => c.includes('music') || c.includes('piano'))) page2.drawText('X', { x: 384.5, y: 643, size: 9, font: boldFont, color: tickColor })
  if (clubsList.some(c => c.includes('science') || c.includes('innovation') || c.includes('home'))) page2.drawText('X', { x: 264.5, y: 631, size: 9, font: boldFont, color: tickColor })
  if (clubsList.some(c => c.includes('debate') || c.includes('speaking'))) page2.drawText('X', { x: 351.5, y: 631, size: 9, font: boldFont, color: tickColor })

  // Other Support / Service Requested
  const servicesNote = [
    data.startTerm ? `Term: ${data.startTerm}` : '',
    data.paymentPlan ? `Plan: ${data.paymentPlan}` : '',
    data.medicalInfo ? `Medical: ${data.medicalInfo}` : '',
    data.additionalInfo ? `Notes: ${data.additionalInfo}` : '',
  ].filter(Boolean).join(' | ').slice(0, 75)

  if (servicesNote) {
    page2.drawText(servicesNote, { x: 263, y: 609, size: 8, font, color: textDark })
  }

  // 4. Parent / Guardian Declaration
  page2.drawText(data.parentName || fullName, { x: 60, y: 308, size: 9.5, font: boldFont, color: textDark })
  page2.drawText(data.relationship || 'Parent/Guardian', { x: 300, y: 308, size: 9.5, font, color: textDark })
  page2.drawText('Verified Online Submission', { x: 60, y: 259, size: 8.5, font: boldFont, color: navyAccent })
  page2.drawText(dateStr, { x: 300, y: 259, size: 9.5, font, color: textDark })

  // --------------------------------------------------------------------------
  // PAGE 3: School Use Only
  // --------------------------------------------------------------------------
  const page3 = pdfDoc.getPage(2)
  page3.drawText(data.applicationNo || 'LIS-2027-NEW', { x: 263, y: 662, size: 9.5, font: boldFont, color: navyAccent })
  page3.drawText(dateStr, { x: 263, y: 638, size: 9.5, font, color: textDark })
  page3.drawText('Online Portal (Admissions Desk)', { x: 263, y: 614, size: 9, font, color: textDark })
  page3.drawText(data.classAppliedFor || '', { x: 263, y: 542, size: 9.5, font: boldFont, color: textDark })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

function col22(col: number): number {
  return col
}
