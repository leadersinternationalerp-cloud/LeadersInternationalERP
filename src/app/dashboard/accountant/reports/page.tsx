import styles from './page.module.css';
import { getBillingReport, ReportFilters } from '@/lib/billing';
import Filters from './filters';
import { useSearchParams } from 'next/navigation';

export default async function FinancialReportsPage() {
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? '';
  // Build filters from query params (simple parsing)
  const filters: ReportFilters = {};
  if (searchParams?.get('startDate')) filters.startDate = searchParams.get('startDate')!;
  if (searchParams?.get('endDate')) filters.endDate = searchParams.get('endDate')!;
  if (searchParams?.get('studentId')) filters.studentId = searchParams.get('studentId')!;
  if (searchParams?.get('status')) filters.status = searchParams.get('status') as any;

  const {
    totalBilled,
    totalCollected,
    totalExpenses,
    outstandingBalance,
    collectionRate,
    netCashflow,
    categoryTotals,
    methodTotals,
  } = await getBillingReport(filters);

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.title}>Financial Reports & Analytics</h1>

      {/* Export Buttons */}
      <div className={styles.exportButtons}>
        <a href={`/api/accountant/reports/export?format=csv&${query}`} className={styles.exportLink} target="_blank" rel="noopener noreferrer">
          Export CSV
        </a>
        <a href={`/api/accountant/reports/export?format=pdf&${query}`} className={styles.exportLink} target="_blank" rel="noopener noreferrer">
          Export PDF
        </a>
      </div>

      {/* Filter Controls */}
      <Filters />

      {/* KPI Cards Row */}
      <div className={styles.kpiGrid}>
        <div className="glass-panel">
          <h3>Total Billed</h3>
          <p>{formatTZS(totalBilled)}</p>
        </div>
        <div className="glass-panel">
          <h3>Total Collected</h3>
          <p>{formatTZS(totalCollected)}</p>
          <div>Collection Rate: <strong>{collectionRate}%</strong></div>
        </div>
        <div className="glass-panel">
          <h3>Outstanding Balance</h3>
          <p>{formatTZS(outstandingBalance)}</p>
        </div>
        <div className="glass-panel">
          <h3>Net Cashflow</h3>
          <p style={{ color: netCashflow >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatTZS(netCashflow)}</p>
          <div>After <strong>{formatTZS(totalExpenses)}</strong> expenses</div>
        </div>
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Collection Progress & Methods */}
        <div className="glass-panel">
          <h2>Fee Collection Progress</h2>
          <div className={styles.progressBarWrapper}>
            <div
              className={styles.progressBar}
              style={{ width: `${collectionRate}%`, backgroundColor: collectionRate >= 80 ? 'var(--color-success)' : collectionRate >= 50 ? 'var(--color-accent)' : 'var(--color-error)' }}
            />
            <span className={styles.progressLabel}>{collectionRate}% Collected</span>
          </div>
          <h3>Collection by Method</h3>
          <div className={styles.listContainer}>
            {Object.entries(methodTotals).map(([method, total]) => (
              <div key={method} className={styles.listItem}>
                <span>{method}</span>
                <span>{formatTZS(total)}</span>
              </div>
            ))}
            {Object.keys(methodTotals).length === 0 && <p>No payment records available.</p>}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="glass-panel">
          <h2>Expense Breakdown</h2>
          <div className={styles.listContainer}>
            {Object.entries(categoryTotals).map(([cat, total]) => {
              const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
              return (
                <div key={cat} className={styles.listItem}>
                  <span>{cat}</span>
                  <span>{formatTZS(total)} ({pct}%)</span>
                </div>
              );
            })}
            {Object.keys(categoryTotals).length === 0 && <p>No expenditures recorded.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
