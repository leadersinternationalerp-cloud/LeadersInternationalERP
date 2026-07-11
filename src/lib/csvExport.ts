// src/lib/csvExport.ts
export function generateCSV(report: any): string {
  const headers = [
    'totalBilled',
    'totalCollected',
    'totalExpenses',
    'outstandingBalance',
    'collectionRate',
    'netCashflow',
  ];
  const rows = [
    report.totalBilled,
    report.totalCollected,
    report.totalExpenses,
    report.outstandingBalance,
    report.collectionRate,
    report.netCashflow,
  ];
  const headerLine = headers.join(',');
  const dataLine = rows.map((v: any) => Number(v).toFixed(2)).join(',');
  return `${headerLine}\n${dataLine}`;
}
