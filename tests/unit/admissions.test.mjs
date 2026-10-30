import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

test('Admission Form PDF Template: exists in public/templates and has 3 pages', async () => {
  const templatePath = path.resolve('public/templates/Leaders_Admission_Form_2027.pdf')
  assert.ok(fs.existsSync(templatePath), `Template must exist at ${templatePath}`)

  const templateBytes = fs.readFileSync(templatePath)
  const pdfDoc = await PDFDocument.load(templateBytes)
  assert.equal(pdfDoc.getPageCount(), 3, 'Template must have exactly 3 pages')

  // Verify dimensions of Page 1 (A4)
  const page1 = pdfDoc.getPage(0)
  const { width, height } = page1.getSize()
  assert.ok(Math.abs(width - 595.28) < 1, `Width should be ~595.28pt, got ${width}`)
  assert.ok(Math.abs(height - 841.89) < 1, `Height should be ~841.89pt, got ${height}`)
})

test('Admission Form PDF Generation: stamps text fields and generates filled document', async () => {
  const templatePath = path.resolve('public/templates/Leaders_Admission_Form_2027.pdf')
  const templateBytes = fs.readFileSync(templatePath)
  const pdfDoc = await PDFDocument.load(templateBytes)

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const page1 = pdfDoc.getPage(0)
  page1.drawText('LIS-2027-TEST01', { x: 75, y: 578, size: 9, font: boldFont, color: rgb(0.08, 0.24, 0.44) })
  page1.drawText('Fatma Khalfan', { x: 263, y: 520, size: 10, font: boldFont, color: rgb(0.12, 0.16, 0.22) })

  const generatedBytes = await pdfDoc.save()
  assert.ok(generatedBytes.length > 500_000, 'Generated PDF should be at least 500KB')

  const header = Buffer.from(generatedBytes.subarray(0, 5)).toString('ascii')
  assert.equal(header, '%PDF-', 'Should start with %PDF-')
})

test('Admissions Office Target Email Verification', () => {
  const expectedEmail = 'admissions@leaderinternationalschool.ac.tz'
  const applyRouteCode = fs.readFileSync(path.resolve('src/app/api/admissions/apply/route.ts'), 'utf8')
  assert.ok(
    applyRouteCode.includes(expectedEmail),
    `Apply route must send to ${expectedEmail}`
  )
})
