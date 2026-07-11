// src/lib/pdfExport.ts
import PDFDocument from 'pdfkit';
import getStream from 'get-stream';

/**
 * Generate a simple PDF report from billing data.
 * Returns a Buffer containing the PDF file.
 */
export async function generatePDF(report: any): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  // Collect the PDF data into a buffer
  const buffers: Buffer[] = [];
  doc.on('data', (chunk) => buffers.push(chunk));

  // Title
  doc.fontSize(20).text('Billing Report', { align: 'center' }).moveDown(1);

  // Summary table
  const entries: Array<[string, string | number]> = [
    ['Total Billed', formatCurrency(report.totalBilled)],
    ['Total Collected', formatCurrency(report.totalCollected)],
    ['Total Expenses', formatCurrency(report.totalExpenses)],
    ['Outstanding Balance', formatCurrency(report.outstandingBalance)],
    ['Collection Rate', `${report.collectionRate}%`],
    ['Net Cashflow', formatCurrency(report.netCashflow)],
  ];

  doc.fontSize(12);
  entries.forEach(([label, value]) => {
    doc.text(`${label}:`, { continued: true, width: 150 }).text(`${value}`, { align: 'right' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  // Payments by method
  doc.fontSize(14).text('Payments by Method', { underline: true }).moveDown(0.5);
  Object.entries(report.methodTotals ?? {}).forEach(([method, amount]) => {
    doc.text(`${method}: ${formatCurrency(amount)}`);
  });

  doc.moveDown(1);

  // Expenses by category
  doc.fontSize(14).text('Expenses by Category', { underline: true }).moveDown(0.5);
  Object.entries(report.categoryTotals ?? {}).forEach(([cat, amount]) => {
    doc.text(`${cat}: ${formatCurrency(amount)}`);
  });

  doc.end();
  // Wait for the stream to finish and return a Buffer
  await new Promise((resolve) => doc.on('end', resolve));
  return Buffer.concat(buffers);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
