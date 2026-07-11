import { NextResponse } from 'next/server';
import { getBillingReport } from '@/lib/billing';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate') ?? undefined;
  const endDate = url.searchParams.get('endDate') ?? undefined;
  const studentId = url.searchParams.get('studentId') ?? undefined;
  const status = url.searchParams.get('status') as 'paid' | 'unpaid' | 'overdue' | undefined;

  const filters = { startDate, endDate, studentId, status };
  try {
    const data = await getBillingReport(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating billing report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
