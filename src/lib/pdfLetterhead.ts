import { createClient } from '@/utils/supabase/server'
import path from 'path'
import fs from 'fs'

// Load logo buffer from public/logo.png
export function loadLogoBuffer() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (fs.existsSync(logoPath)) {
    return fs.readFileSync(logoPath)
  }
  return null
}

export async function drawLetterhead(
  doc: PDFKit.PDFDocument,
  startX: number = 40,
  contentWidth: number = 515,
  showCambridge: boolean = false
) {
  let schoolName = 'LEADERS INTERNATIONAL SCHOOL'
  let schoolMotto = 'LEARNING TODAY, LEADING TOMORROW'
  let schoolEmail = 'info@leaders.ac.tz'
  let schoolPhone = '+255 123 456 789'
  let schoolAddress = 'P.O. Box 123, Dar es Salaam'

  try {
    const supabase = await createClient()
    const { data } = await supabase.from('system_settings').select('*')
    if (data) {
      data.forEach(item => {
        if (item.key === 'school_name' && item.value) schoolName = item.value
        if (item.key === 'school_motto' && item.value) schoolMotto = item.value
        if (item.key === 'contact_email' && item.value) schoolEmail = item.value
        if (item.key === 'contact_phone' && item.value) schoolPhone = item.value
        if (item.key === 'school_address' && item.value) schoolAddress = item.value
      })
    }
  } catch (err) {
    console.error('Failed to load system settings in letterhead:', err)
  }

  // Draw code-provided logo (always public/logo.png)
  const logoBuffer = loadLogoBuffer()
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, startX, 25, { width: 50, height: 50 })
    } catch (e) {
      console.error('Failed to draw logo in letterhead:', e)
    }
  }

  // Draw Cambridge logo if required
  if (showCambridge) {
    // Look for cambridge-logo.png in public folder
    const cambridgePath = path.join(process.cwd(), 'public', 'cambridge-logo.png')
    if (fs.existsSync(cambridgePath)) {
      try {
        const cambridgeBuffer = fs.readFileSync(cambridgePath)
        doc.image(cambridgeBuffer, startX + contentWidth - 85, 27, { width: 85, height: 40 })
      } catch (e) {
        console.error('Failed to draw Cambridge logo:', e)
      }
    }
  }

  const textStartX = startX + 55
  const textWidth = showCambridge ? contentWidth - 145 : contentWidth - 65

  // Center texts
  doc.fillColor('#00264b').fontSize(14).font('Helvetica-Bold')
  doc.text(schoolName.toUpperCase(), textStartX, 25, { width: textWidth, align: 'center' })
  
  doc.fillColor('#3bb3c3').fontSize(8.5).font('Helvetica')
  doc.text(schoolMotto.toUpperCase(), textStartX, 41, { width: textWidth, align: 'center' })

  doc.fillColor('#475569').fontSize(7.5)
  doc.text(`${schoolPhone} | ${schoolEmail.toUpperCase()}`, textStartX, 51, { width: textWidth, align: 'center' })
  doc.text(schoolAddress.toUpperCase(), textStartX, 61, { width: textWidth, align: 'center' })

  // Separation double line
  doc.strokeColor('#00264b').lineWidth(1.2).moveTo(startX, 78).lineTo(startX + contentWidth, 78).stroke()
  doc.lineWidth(0.5).moveTo(startX, 81).lineTo(startX + contentWidth, 81).stroke()

  return 92 // Returns Y position below header
}
