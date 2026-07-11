import { createClient } from '@/utils/supabase/server';

export type ReportFilters = {
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
  studentId?: string;
  status?: 'paid' | 'unpaid' | 'overdue';
};

/**
 * Retrieves aggregated billing data based on optional filters.
 * Returns totals for billed, collected, expenses and breakdowns.
 */
export async function getBillingReport(filters: ReportFilters = {}) {
  const supabase = await createClient();
  const { startDate, endDate, studentId, status } = filters;
  // Build base query for invoices
  let invoiceQuery = supabase.from('invoices').select('net_amount, student_id, created_at, status');
  if (studentId) invoiceQuery = invoiceQuery.eq('student_id', studentId);
  if (status) invoiceQuery = invoiceQuery.eq('status', status);
  if (startDate) invoiceQuery = invoiceQuery.gte('created_at', startDate);
  if (endDate) invoiceQuery = invoiceQuery.lte('created_at', endDate);

  const { data: invoices, error: invError } = await invoiceQuery;
  if (invError) throw invError;

  // Payments
  let paymentQuery = supabase.from('payments').select('amount, payment_method, created_at, student_id');
  if (studentId) paymentQuery = paymentQuery.eq('student_id', studentId);
  if (startDate) paymentQuery = paymentQuery.gte('created_at', startDate);
  if (endDate) paymentQuery = paymentQuery.lte('created_at', endDate);
  const { data: payments, error: payError } = await paymentQuery;
  if (payError) throw payError;

  // Expenses
  let expenseQuery = supabase.from('expenses').select('amount, category, created_at');
  if (startDate) expenseQuery = expenseQuery.gte('created_at', startDate);
  if (endDate) expenseQuery = expenseQuery.lte('created_at', endDate);
  const { data: expenses, error: expError } = await expenseQuery;
  if (expError) throw expError;

  const totalBilled = invoices?.reduce((sum, inv) => sum + Number(inv.net_amount), 0) ?? 0;
  const totalCollected = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const outstandingBalance = totalBilled - totalCollected;
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;
  const netCashflow = totalCollected - totalExpenses;

  const categoryTotals: Record<string, number> = {};
  expenses?.forEach(e => {
    const cat = e.category ?? 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount);
  });

  const methodTotals: Record<string, number> = {};
  payments?.forEach(p => {
    const method = p.payment_method ?? 'Other';
    methodTotals[method] = (methodTotals[method] || 0) + Number(p.amount);
  });

  return {
    totalBilled,
    totalCollected,
    totalExpenses,
    outstandingBalance,
    collectionRate,
    netCashflow,
    categoryTotals,
    methodTotals,
    invoices,
    payments,
    expenses,
  };
}
