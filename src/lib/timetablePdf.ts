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

  // 2. Timetable Grid Layout
  const gridStartY = startY + 62
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  
  // Column sizing
  // 1. Time / Slot column: 110pt
  // 2. Monday-Friday columns: (762 - 110) / 5 = 130pt each
  const timeColWidth = 110
  const dayColWidth = (contentWidth - timeColWidth) / 5

  // Draw Grid Header row
  doc.rect(startX, gridStartY, contentWidth, 22).fill('#00264b')
  
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
  doc.text('TIME SLOT', startX + 10, gridStartY + 7, { width: timeColWidth - 15 })

  days.forEach((day, idx) => {
    const x = startX + timeColWidth + idx * dayColWidth
    doc.text(day.toUpperCase(), x, gridStartY + 7, { width: dayColWidth, align: 'center' })
  })

  let currentY = gridStartY + 22
  const rowHeight = 44

  opts.slots.forEach((slot, rowIdx) => {
    // Row Fill
    if (slot.is_break) {
      doc.rect(startX, currentY, contentWidth, rowHeight - 12).fill('#f1f5f9')
    } else if (rowIdx % 2 === 1) {
      doc.rect(startX, currentY, contentWidth, rowHeight).fill('#f8fafc')
    }

    const currentHeight = slot.is_break ? rowHeight - 12 : rowHeight

    // Draw grid horizontal line
    doc.lineWidth(0.5).strokeColor('#cbd5e1')
       .moveTo(startX, currentY + currentHeight)
       .lineTo(startX + contentWidth, currentY + currentHeight).stroke()

    // 1. Render Time slot
    const timeRangeStr = `${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00264b')
       .text(slot.name, startX + 10, currentY + 5, { width: timeColWidth - 15 })
    doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
       .text(timeRangeStr, startX + 10, currentY + 17, { width: timeColWidth - 15 })

    // 2. Render schedule for each day
    days.forEach((day, colIdx) => {
      const x = startX + timeColWidth + colIdx * dayColWidth
      const entry = opts.entries.find(e => e.day_of_week.toLowerCase() === day.toLowerCase() && e.slot_id === slot.id)

      if (slot.is_break) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
           .text(slot.name.toUpperCase(), x, currentY + 8, { width: dayColWidth, align: 'center' })
      } else if (entry) {
        // Draw Lesson Box content
        if (opts.type === 'class') {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
             .text(entry.subjectName || 'Lesson', x + 5, currentY + 6, { width: dayColWidth - 10, align: 'center' })
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#475569')
             .text(entry.teacherName || '', x + 5, currentY + 18, { width: dayColWidth - 10, align: 'center' })
          if (entry.room) {
            doc.fontSize(6).font('Helvetica').fillColor('#64748b')
               .text(`[Room: ${entry.room}]`, x + 5, currentY + 28, { width: dayColWidth - 10, align: 'center' })
          }
        } else if (opts.type === 'teacher') {
          doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
             .text(entry.className || 'Class', x + 5, currentY + 6, { width: dayColWidth - 10, align: 'center' })
          doc.fontSize(7).font('Helvetica-Oblique').fillColor('#475569')
             .text(entry.subjectName || '', x + 5, currentY + 18, { width: dayColWidth - 10, align: 'center' })
          if (entry.room) {
            doc.fontSize(6).font('Helvetica').fillColor('#64748b')
               .text(`[Room: ${entry.room}]`, x + 5, currentY + 28, { width: dayColWidth - 10, align: 'center' })
          }
        } else {
          // Summary view
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a')
             .text(`${entry.className || 'Class'} (${entry.room || ''})`, x + 5, currentY + 6, { width: dayColWidth - 10, align: 'center' })
          doc.fontSize(7).font('Helvetica').fillColor('#475569')
             .text(`${entry.subjectName || ''}`, x + 5, currentY + 18, { width: dayColWidth - 10, align: 'center' })
        }
      } else {
        // Empty Slot
        doc.fontSize(7).font('Helvetica').fillColor('#cbd5e1')
           .text('-', x, currentY + 16, { width: dayColWidth, align: 'center' })
      }
    })

    // Draw Column boundary separator lines
    let xOffset = startX
    const cols = [timeColWidth, dayColWidth, dayColWidth, dayColWidth, dayColWidth, dayColWidth]
    cols.forEach(w => {
      xOffset += w
      doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(xOffset, currentY).lineTo(xOffset, currentY + currentHeight).stroke()
    })

    currentY += currentHeight
  })

  // Outer border box
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
