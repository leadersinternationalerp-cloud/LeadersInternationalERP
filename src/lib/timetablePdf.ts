import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

export interface TimetablePDFOptions {
  title: string;
  type: 'class' | 'teacher' | 'summary';
  entityName: string; // "Grade 3A" or "John Doe" or "All Classes"
  slots: {
    id: string;
    period_number: number;
    name: string;
    start_time: string;
    end_time: string;
    is_break: boolean;
  }[];
  entries: {
    day_of_week: string;
    slot_id: string;
    subjectName?: string;
    teacherName?: string;
    className?: string;
    room?: string;
  }[];
}

export function loadLogoBuffer() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (fs.existsSync(logoPath)) {
    return fs.readFileSync(logoPath)
  }
  return null
}

export async function generateTimetablePdf(opts: TimetablePDFOptions): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 35, bottom: 30, left: 40, right: 40 },
    bufferPages: true
  })

  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const logoBuffer = loadLogoBuffer()
  const startX = 40
  const startY = 35
  const contentWidth = 762 // A4 landscape width = 842 - 80 margins

  // 1. Header Area
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, startX, startY, { width: 45, height: 45 })
    } catch (e) {
      console.error(e)
    }
  }

  const textStartX = logoBuffer ? startX + 55 : startX

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#00264b')
     .text('LEADERS INTERNATIONAL SCHOOL', textStartX, startY)
  
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#475569')
     .text(`${opts.title.toUpperCase()} - ${opts.entityName.toUpperCase()}`, textStartX, startY + 18)

  doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
     .text('Kisakasaka, Zanzibar | info@leaders.ac.tz | +255 777 123 456', textStartX, startY + 32)

  // Separator Line
  doc.lineWidth(1).strokeColor('#00264b').moveTo(startX, startY + 48).lineTo(startX + contentWidth, startY + 48).stroke()

  // 2. Timetable Grid Layout (Days as Rows, Periods as Columns)
  const gridStartY = startY + 62
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const slotsCount = opts.slots.length

  // Sizing:
  // First column (Day name): 85pt
  // Other columns (Slots): remaining space divided by slots count
  const dayColWidth = 85
  const slotColWidth = slotsCount > 0 ? (contentWidth - dayColWidth) / slotsCount : 0

  // Draw Grid Header Row (Slots headers)
  const headerHeight = 32
  doc.rect(startX, gridStartY, contentWidth, headerHeight).fill('#00264b')
  
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
  doc.text('DAY', startX + 10, gridStartY + 12, { width: dayColWidth - 15 })

  opts.slots.forEach((slot, idx) => {
    const x = startX + dayColWidth + idx * slotColWidth
    const timeStr = `${slot.start_time.substring(0, 5)}-${slot.end_time.substring(0, 5)}`
    
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
       .text(slot.name.toUpperCase(), x, gridStartY + 5, { width: slotColWidth, align: 'center' })
    doc.fontSize(7).font('Helvetica').fillColor('#cbd5e1')
       .text(timeStr, x, gridStartY + 18, { width: slotColWidth, align: 'center' })
  })

  let currentY = gridStartY + headerHeight
  const rowHeight = 60 // Generous row height for multi-line details

  days.forEach((day, dayIdx) => {
    // Alternate row shading (light gray-blue background)
    if (dayIdx % 2 === 1) {
      doc.rect(startX, currentY, contentWidth, rowHeight).fill('#f8fafc')
    }

    // Render breaks on this day row
    opts.slots.forEach((slot, sIdx) => {
      if (slot.is_break) {
        const x = startX + dayColWidth + sIdx * slotColWidth
        doc.rect(x, currentY, slotColWidth, rowHeight).fill('#f1f5f9')
      }
    })

    // Draw horizontal line separator
    doc.lineWidth(0.5).strokeColor('#cbd5e1')
       .moveTo(startX, currentY + rowHeight)
       .lineTo(startX + contentWidth, currentY + rowHeight).stroke()

    // 1. Day Column Text
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00264b')
       .text(day.toUpperCase(), startX + 10, currentY + (rowHeight - 10) / 2, { width: dayColWidth - 15 })

    // 2. Slots Columns Text
    opts.slots.forEach((slot, sIdx) => {
      const x = startX + dayColWidth + sIdx * slotColWidth
      const entry = opts.entries.find(e => e.day_of_week.toLowerCase() === day.toLowerCase() && e.slot_id === slot.id)

      if (slot.is_break) {
        // Render break/lunch name centered
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#64748b')
           .text(slot.name.toUpperCase(), x + 5, currentY + (rowHeight - 10) / 2, { width: slotColWidth - 10, align: 'center' })
      } else if (entry) {
        if (opts.type === 'class') {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
             .text(entry.subjectName || 'Lesson', x + 5, currentY + 12, { width: slotColWidth - 10, align: 'center' })
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#475569')
             .text(entry.teacherName || '', x + 5, currentY + 26, { width: slotColWidth - 10, align: 'center' })
          if (entry.room) {
            doc.fontSize(6).font('Helvetica').fillColor('#64748b')
               .text(`[Room: ${entry.room}]`, x + 5, currentY + 38, { width: slotColWidth - 10, align: 'center' })
          }
        } else if (opts.type === 'teacher') {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
             .text(entry.className || 'Class', x + 5, currentY + 12, { width: slotColWidth - 10, align: 'center' })
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#475569')
             .text(entry.subjectName || '', x + 5, currentY + 26, { width: slotColWidth - 10, align: 'center' })
          if (entry.room) {
            doc.fontSize(6).font('Helvetica').fillColor('#64748b')
               .text(`[Room: ${entry.room}]`, x + 5, currentY + 38, { width: slotColWidth - 10, align: 'center' })
          }
        } else {
          // School Summary
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a')
             .text(`${entry.className || 'Class'} (${entry.room || ''})`, x + 5, currentY + 12, { width: slotColWidth - 10, align: 'center' })
          doc.fontSize(7).font('Helvetica').fillColor('#475569')
             .text(entry.subjectName || '', x + 5, currentY + 26, { width: slotColWidth - 10, align: 'center' })
        }
      } else {
        // Empty slot cell
        doc.fontSize(7.5).font('Helvetica').fillColor('#cbd5e1')
           .text('-', x, currentY + (rowHeight - 8) / 2, { width: slotColWidth, align: 'center' })
      }
    })

    // Draw vertical cell separator lines
    let xOffset = startX
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(xOffset, currentY).lineTo(xOffset, currentY + rowHeight).stroke()
    xOffset += dayColWidth
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(xOffset, currentY).lineTo(xOffset, currentY + rowHeight).stroke()

    for (let c = 0; c < slotsCount; c++) {
      xOffset += slotColWidth
      doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(xOffset, currentY).lineTo(xOffset, currentY + rowHeight).stroke()
    }

    currentY += rowHeight
  })

  // Outer border box around grid
  doc.lineWidth(1).strokeColor('#00264b').rect(startX, gridStartY, contentWidth, currentY - gridStartY).stroke()

  // 3. Footer Page Numbers
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(startX, 535).lineTo(startX + contentWidth, 535).stroke()
    
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8')
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })} | Leaders International School`, startX, 542)
    doc.text(`Page ${i + 1} of ${range.count}`, startX + contentWidth - 100, 542, { width: 100, align: 'right' })
  }

  doc.end()
  return pdfBufferPromise
}
