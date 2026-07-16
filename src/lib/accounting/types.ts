export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type MovementType = 'IN' | 'OUT';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  account_sub_type?: string;
  normal_balance: NormalBalance;
  is_system: boolean;
  is_active: boolean;
  parent_id?: string;
}

export interface JournalEntry {
  id: string;
  reference: string;
  entry_type: string;
  description?: string;
  posting_date: string;
  period_id?: string;
  status: JournalStatus;
}

export interface JournalEntryLine {
  id: string;
  journal_id: string;
  account_id: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
}
