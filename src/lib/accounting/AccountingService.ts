import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { JournalStatus } from './types';

export class AccountingService {
  /**
   * Posts a new double-entry journal to the general ledger.
   * Enforces the Dr = Cr accounting equation constraint.
   */
  static async postEntry(
    reference: string,
    entryType: string,
    description: string,
    postingDate: string,
    lines: { accountCode: string; description?: string; debitAmount: number; creditAmount: number }[]
  ) {
    const supabase = await createClient();

    // 1. Enforce Dr = Cr constraint
    const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);

    // Using a tiny epsilon to handle floating point precision issues
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Unbalanced journal entry: Debits (${totalDebit}) do not equal Credits (${totalCredit})`);
    }

    if (totalDebit === 0 && totalCredit === 0) {
      throw new Error('Journal entry must have a non-zero value');
    }

    // 2. Resolve account codes to IDs
    const codes = lines.map(l => l.accountCode);
    const { data: accounts, error: accError } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .in('code', codes);

    if (accError || !accounts) {
      throw new Error('Failed to fetch chart of accounts');
    }

    const accountMap = new Map(accounts.map(a => [a.code, a.id]));
    
    // Check if all codes were found
    for (const code of codes) {
      if (!accountMap.has(code)) {
        throw new Error(`Account code ${code} not found in Chart of Accounts`);
      }
    }

    // 3. Create the journal entry
    const { data: journal, error: journalError } = await supabase
      .from('journal_entries')
      .insert({
        reference,
        entry_type: entryType,
        description,
        posting_date: postingDate,
        status: 'POSTED' as JournalStatus
      })
      .select('id')
      .single();

    if (journalError || !journal) {
      throw new Error(`Failed to create journal entry: ${journalError?.message}`);
    }

    // 4. Create the journal entry lines
    const journalLines = lines.map(line => ({
      journal_id: journal.id,
      account_id: accountMap.get(line.accountCode),
      description: line.description || description,
      debit_amount: line.debitAmount,
      credit_amount: line.creditAmount
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(journalLines);

    if (linesError) {
      // In a real transactional system (like a postgres function or RPC), this would rollback automatically.
      // Since we are using standard supabase HTTP calls, if lines fail we should ideally delete the header or use RPC.
      // For now, throw the error.
      await supabase.from('journal_entries').delete().eq('id', journal.id);
      throw new Error(`Failed to create journal lines: ${linesError.message}`);
    }

    // 5. Log the action
    await supabase.from('audit_logs').insert({
      action: 'POST_JOURNAL',
      entity: 'journal_entries',
      entity_id: journal.id,
      details: { reference, total: totalDebit }
    });

    return journal.id;
  }

  static async recordFeePayment(paymentId: string, amount: number, reference: string, date: string) {
    // Dr 1000 Cash/Bank
    // Cr 1100 Accounts Receivable (or directly 4000 Revenue for cash basis)
    // Here we'll use Dr 1000 Bank, Cr 4000 Tuition Fee Revenue to mirror Python's simpler direct logic
    const journalId = await this.postEntry(
      reference,
      'FEE_PAYMENT',
      `Fee payment received: ${reference}`,
      date,
      [
        { accountCode: '1000', debitAmount: amount, creditAmount: 0 },
        { accountCode: '4000', debitAmount: 0, creditAmount: amount }
      ]
    );

    const supabase = await createClient();
    await supabase.from('payments').update({ journal_entry_id: journalId }).eq('id', paymentId);
    return journalId;
  }

  /**
   * Posts a double-entry journal for a paid TZS 30,000 admission application invoice:
   *   Dr Cash / Bank (1000 or 1010)
   *   Cr Admission Application Fee Revenue (4020, fallback 4000)
   */
  static async recordAdmissionInvoicePayment(params: {
    invoiceId: string;
    invoiceNo: string;
    amount: number;
    paymentMethod?: string | null;
    paymentReference?: string | null;
    postingDate: string;
    postedBy?: string | null;
  }) {
    const supabase = createServiceClient();

    // Prevent duplicate journal posting for the same invoice
    const { data: existingInv } = await supabase
      .from('admission_invoices')
      .select('journal_entry_id')
      .eq('id', params.invoiceId)
      .single();

    if (existingInv?.journal_entry_id) {
      return existingInv.journal_entry_id as string;
    }

    const { data: accounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .in('code', ['1000', '1010', '4020', '4000']);

    if (accErr || !accounts?.length) {
      throw new Error('Failed to resolve Chart of Accounts for admission invoice posting');
    }

    const byCode = new Map(accounts.map((a) => [a.code, a.id]));
    const isBank = (params.paymentMethod || '').toLowerCase().includes('bank');
    const debitAccountId = (isBank ? byCode.get('1010') : null) || byCode.get('1000') || byCode.get('1010');
    const creditAccountId = byCode.get('4020') || byCode.get('4000');

    if (!debitAccountId || !creditAccountId) {
      throw new Error('Required Cash/Bank (1000/1010) or Revenue (4020/4000) account missing in Chart of Accounts');
    }

    const refSuffix = params.paymentReference ? ` (${params.paymentReference})` : '';
    const desc = `Admission fee paid: ${params.invoiceNo} via ${params.paymentMethod || 'Cash'}${refSuffix}`;
    const postingDateOnly = params.postingDate.slice(0, 10);

    const { data: journal, error: journalErr } = await supabase
      .from('journal_entries')
      .insert({
        reference: params.invoiceNo,
        entry_type: 'ADMISSION_FEE',
        description: desc,
        posting_date: postingDateOnly,
        status: 'POSTED' as JournalStatus,
        created_by: params.postedBy || null,
        posted_by: params.postedBy || null,
        posted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (journalErr || !journal) {
      throw new Error(`Failed to create admission fee journal entry: ${journalErr?.message}`);
    }

    const { error: linesErr } = await supabase.from('journal_entry_lines').insert([
      {
        journal_id: journal.id,
        account_id: debitAccountId,
        description: desc,
        debit_amount: params.amount,
        credit_amount: 0,
      },
      {
        journal_id: journal.id,
        account_id: creditAccountId,
        description: desc,
        debit_amount: 0,
        credit_amount: params.amount,
      },
    ]);

    if (linesErr) {
      await supabase.from('journal_entries').delete().eq('id', journal.id);
      throw new Error(`Failed to create admission fee journal lines: ${linesErr.message}`);
    }

    await supabase
      .from('admission_invoices')
      .update({ journal_entry_id: journal.id })
      .eq('id', params.invoiceId);

    await supabase.from('audit_logs').insert({
      action: 'POST_JOURNAL',
      entity: 'journal_entries',
      entity_id: journal.id,
      details: { reference: params.invoiceNo, entry_type: 'ADMISSION_FEE', total: params.amount },
    });

    return journal.id as string;
  }

  static async recordExpense(expenseId: string, amount: number, description: string, date: string, category: string) {
    // Determine expense account based on category (simplified mapping)
    let accountCode = '5000'; // Generic Operating Expense
    if (category.toLowerCase().includes('salary')) accountCode = '5100';
    if (category.toLowerCase().includes('kitchen') || category.toLowerCase().includes('food')) accountCode = '5200';
    if (category.toLowerCase().includes('stationery')) accountCode = '5210';
    if (category.toLowerCase().includes('bank')) accountCode = '5400';

    // Dr 5000 Expense
    // Cr 1000 Cash/Bank
    const journalId = await this.postEntry(
      `EXP-${expenseId.substring(0,6)}`,
      'EXPENSE',
      `Expense logged: ${description}`,
      date,
      [
        { accountCode: accountCode, debitAmount: amount, creditAmount: 0 },
        { accountCode: '1000', debitAmount: 0, creditAmount: amount }
      ]
    );

    const supabase = await createClient();
    await supabase.from('expenses').update({ journal_entry_id: journalId }).eq('id', expenseId);
    return journalId;
  }

  static async recordPayroll(payrollId: string, netAmount: number, payeTax: number, zssfTax: number, date: string) {
    const grossAmount = netAmount + payeTax + zssfTax;
    
    // Dr 5100 Salary Expense (Gross)
    // Cr 2100 Payroll Payable (Net)
    // Cr 2110 PAYE Tax Payable
    // Cr 2120 ZSSF/NSSF Payable
    const lines = [
      { accountCode: '5100', debitAmount: grossAmount, creditAmount: 0 },
      { accountCode: '2100', debitAmount: 0, creditAmount: netAmount }
    ];

    if (payeTax > 0) lines.push({ accountCode: '2110', debitAmount: 0, creditAmount: payeTax });
    if (zssfTax > 0) lines.push({ accountCode: '2120', debitAmount: 0, creditAmount: zssfTax });

    const journalId = await this.postEntry(
      `PRL-${payrollId.substring(0,6)}`,
      'PAYROLL',
      `Payroll generated for ${date}`,
      date,
      lines
    );

    const supabase = await createClient();
    await supabase.from('payrolls').update({ journal_entry_id: journalId }).eq('id', payrollId);
    return journalId;
  }
}
