import { NextResponse } from 'next/server';
import { getBillingReport } from '@/lib/billing';
import { generateCSV } from '@/lib/csvExport';
import { generatePDF } from '@/lib/pdfExport';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const startDate = url.searchParams.get('startDate') ?? undefined;
  const endDate = url.searchParams.get('endDate') ?? undefined;
  const studentId = url.searchParams.get('studentId') ?? undefined;
  const status = url.searchParams.get('status') as 'paid' | 'unpaid' | 'overdue' | undefined;

  const filters = { startDate, endDate, studentId, status };
  try {
    const report = await getBillingReport(filters);
    if (format === 'csv') {
      const csv = generateCSV(report);
      return new NextResponse(csv, {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="billing_report.csv"' },
      });
    }
    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(report);
      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="billing_report.pdf"' },
      });
    }
    // Default JSON response
    return NextResponse.json(report);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
