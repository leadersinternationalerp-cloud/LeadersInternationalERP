import { createClient } from '@/utils/supabase/server';
import { ChartOfAccount, JournalEntryLine } from './types';

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  total_debit: number;
  total_credit: number;
  balance: number; // positive means normal balance, negative means opposite
}

export class TrialBalanceService {
  /**
   * Calculate Trial Balance up to a certain date.
   */
  static async getTrialBalance(asOfDate?: string, startDate?: string): Promise<AccountBalance[]> {
    const supabase = await createClient();

    let query = supabase
      .from('journal_entry_lines')
      .select(`
        debit_amount,
        credit_amount,
        journal_id,
        journal_entries!inner(posting_date, status),
        chart_of_accounts!inner(id, code, name, account_type, normal_balance)
      `)
      .eq('journal_entries.status', 'POSTED');

    if (asOfDate) {
      query = query.lte('journal_entries.posting_date', asOfDate);
    }
    if (startDate) {
      query = query.gte('journal_entries.posting_date', startDate);
    }

    const { data: lines, error } = await query;

    if (error || !lines) {
      throw new Error(`Failed to fetch trial balance data: ${error?.message}`);
    }

    const balances = new Map<string, AccountBalance>();

    for (const line of lines as any[]) {
      const acc = line.chart_of_accounts;
      if (!balances.has(acc.id)) {
        balances.set(acc.id, {
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.account_type,
          normal_balance: acc.normal_balance,
          total_debit: 0,
          total_credit: 0,
          balance: 0
        });
      }

      const bal = balances.get(acc.id)!;
      bal.total_debit += Number(line.debit_amount);
      bal.total_credit += Number(line.credit_amount);

      if (bal.normal_balance === 'DEBIT') {
        bal.balance = bal.total_debit - bal.total_credit;
      } else {
        bal.balance = bal.total_credit - bal.total_debit;
      }
    }

    return Array.from(balances.values()).sort((a, b) => a.account_code.localeCompare(b.account_code));
  }

  /**
   * Generates a basic P&L statement
   */
  static async getProfitAndLoss(startDate?: string, endDate?: string) {
    const tb = await this.getTrialBalance(endDate, startDate);
    
    // In a real P&L, you would only sum up revenues and expenses within the period.
    // For simplicity, assuming the TB is for the period.
    const revenueAccounts = tb.filter(a => a.account_type === 'REVENUE');
    const expenseAccounts = tb.filter(a => a.account_type === 'EXPENSE');

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);

    return {
      revenue: revenueAccounts,
      expenses: expenseAccounts,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses
    };
  }

  /**
   * Generates a basic Balance Sheet
   */
  static async getBalanceSheet(asOfDate?: string) {
    const tb = await this.getTrialBalance(asOfDate);

    const assetAccounts = tb.filter(a => a.account_type === 'ASSET');
    const liabilityAccounts = tb.filter(a => a.account_type === 'LIABILITY');
    const equityAccounts = tb.filter(a => a.account_type === 'EQUITY');

    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.balance, 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0);

    // Compute Net Income to add to Retained Earnings
    const pl = await this.getProfitAndLoss(undefined, asOfDate);
    const totalEquityWithNetIncome = totalEquity + pl.netIncome;

    return {
      assets: assetAccounts,
      liabilities: liabilityAccounts,
      equity: equityAccounts,
      totalAssets,
      totalLiabilities,
      totalEquity: totalEquityWithNetIncome
    };
  }
}
