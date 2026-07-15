-- 1. ACCOUNTING CORE
CREATE TABLE IF NOT EXISTS fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL, -- e.g. "2026", "2026-2027"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year_id UUID REFERENCES fiscal_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- e.g. "January 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fiscal_year_id, name)
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    account_sub_type VARCHAR(100),
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(100) NOT NULL,
    entry_type VARCHAR(50) NOT NULL, -- e.g. 'MANUAL', 'FEE_PAYMENT', 'EXPENSE', 'PAYROLL'
    description TEXT,
    posting_date DATE NOT NULL,
    period_id UUID REFERENCES accounting_periods(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    debit_amount NUMERIC(15, 2) DEFAULT 0.00,
    credit_amount NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACCOUNTS PAYABLE & BANKING
CREATE TABLE IF NOT EXISTS vendor_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(150) NOT NULL,
    invoice_number VARCHAR(100),
    bill_date DATE NOT NULL,
    due_date DATE,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'PAID', 'PARTIAL', 'CANCELLED')),
    expense_account_id UUID REFERENCES chart_of_accounts(id),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES vendor_bills(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(50),
    reference VARCHAR(100),
    bank_account_id UUID REFERENCES chart_of_accounts(id),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    reference VARCHAR(100),
    bank_account_id UUID REFERENCES chart_of_accounts(id),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ALLOCATED', 'RECONCILED')),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FIXED ASSETS
CREATE TABLE IF NOT EXISTS fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    asset_code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100),
    purchase_date DATE NOT NULL,
    purchase_price NUMERIC(15, 2) NOT NULL,
    salvage_value NUMERIC(15, 2) DEFAULT 0.00,
    useful_life_years INT NOT NULL,
    asset_account_id UUID REFERENCES chart_of_accounts(id),
    accumulated_depreciation_account_id UUID REFERENCES chart_of_accounts(id),
    depreciation_expense_account_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS depreciation_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES fixed_assets(id) ON DELETE CASCADE,
    depreciation_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED')),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTORY & KITCHEN
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'STATIONERY' CHECK (category IN ('STATIONERY', 'UNIFORM', 'FURNITURE', 'CLEANING', 'ELECTRONICS', 'KITCHEN', 'OTHER')),
    quantity NUMERIC(10, 2) DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'pcs',
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    reorder_level NUMERIC(10, 2) DEFAULT 10.00,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID REFERENCES stock_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(10) CHECK (movement_type IN ('IN', 'OUT')),
    quantity NUMERIC(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    issued_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRANSPORT
CREATE TABLE IF NOT EXISTS transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    route_fee NUMERIC(12, 2) DEFAULT 0.00,
    capacity INT DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WHATSAPP & INTEGRATION
CREATE TABLE IF NOT EXISTS integration_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    whatsapp_provider VARCHAR(20) DEFAULT 'TWILIO' CHECK (whatsapp_provider IN ('TWILIO', 'AFRICASTALKING', 'META')),
    whatsapp_api_url VARCHAR(255),
    whatsapp_api_key VARCHAR(255),
    whatsapp_sender_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- e.g. 'RECEIPT', 'FEE_REMINDER'
    reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SENT',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link operational tables to journals
ALTER TABLE payments ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL;

-- SEED INTEGRATION CONFIG
INSERT INTO integration_config (id, whatsapp_provider) VALUES (1, 'TWILIO') ON CONFLICT (id) DO NOTHING;

-- SEED CHART OF ACCOUNTS (BASIC TANZANIAN SCHOOL GL)
INSERT INTO chart_of_accounts (code, name, account_type, account_sub_type, normal_balance, is_system)
VALUES 
    ('1000', 'Cash & Equivalents', 'ASSET', 'Bank', 'DEBIT', true),
    ('1010', 'Main Operating Bank', 'ASSET', 'Bank', 'DEBIT', false),
    ('1100', 'Accounts Receivable - Tuition', 'ASSET', 'Receivable', 'DEBIT', true),
    ('1500', 'Fixed Assets', 'ASSET', 'Fixed Asset', 'DEBIT', true),
    ('1510', 'Accumulated Depreciation', 'ASSET', 'Fixed Asset Contra', 'CREDIT', true),
    ('2000', 'Accounts Payable', 'LIABILITY', 'Payable', 'CREDIT', true),
    ('2100', 'Payroll Payable (Net Salary)', 'LIABILITY', 'Payable', 'CREDIT', true),
    ('2110', 'PAYE Tax Payable', 'LIABILITY', 'Tax Payable', 'CREDIT', true),
    ('2120', 'ZSSF / NSSF Payable', 'LIABILITY', 'Tax Payable', 'CREDIT', true),
    ('3000', 'Retained Earnings', 'EQUITY', 'Equity', 'CREDIT', true),
    ('4000', 'Tuition Fee Revenue', 'REVENUE', 'Operating Revenue', 'CREDIT', true),
    ('4010', 'Transport Fee Revenue', 'REVENUE', 'Operating Revenue', 'CREDIT', false),
    ('5000', 'Operating Expenses', 'EXPENSE', 'Operating Expense', 'DEBIT', true),
    ('5100', 'Salary Expense (Gross)', 'EXPENSE', 'Payroll Expense', 'DEBIT', true),
    ('5110', 'Employer ZSSF / NSSF Contribution', 'EXPENSE', 'Payroll Expense', 'DEBIT', true),
    ('5200', 'Kitchen & Food Supplies', 'EXPENSE', 'Operating Expense', 'DEBIT', false),
    ('5210', 'Stationery & Academic Supplies', 'EXPENSE', 'Operating Expense', 'DEBIT', false),
    ('5300', 'Depreciation Expense', 'EXPENSE', 'Non-Cash Expense', 'DEBIT', true),
    ('5400', 'Bank Charges & Fees', 'EXPENSE', 'Operating Expense', 'DEBIT', false)
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE depreciation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for Accountant, Director, Principal, System Admin
CREATE OR REPLACE FUNCTION is_finance_manager() RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
    roles_arr text[];
BEGIN
    SELECT role, roles INTO user_role, roles_arr FROM profiles WHERE id = auth.uid();
    RETURN user_role IN ('Accountant', 'Director', 'System Admin') 
        OR (roles_arr IS NOT NULL AND ('Accountant' = ANY(roles_arr) OR 'Director' = ANY(roles_arr) OR 'System Admin' = ANY(roles_arr)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_inventory_manager() RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
    roles_arr text[];
BEGIN
    SELECT role, roles INTO user_role, roles_arr FROM profiles WHERE id = auth.uid();
    RETURN user_role IN ('Accountant', 'Director', 'System Admin', 'Principal') 
        OR (roles_arr IS NOT NULL AND ('Accountant' = ANY(roles_arr) OR 'Director' = ANY(roles_arr) OR 'System Admin' = ANY(roles_arr) OR 'Principal' = ANY(roles_arr)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finance Policies (Accounting tables)
CREATE POLICY "Finance managers full access to accounting" ON chart_of_accounts FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to journals" ON journal_entries FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to journal lines" ON journal_entry_lines FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to fiscal years" ON fiscal_years FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to periods" ON accounting_periods FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to vendor bills" ON vendor_bills FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to vendor payments" ON vendor_bill_payments FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to deposits" ON bank_deposits FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to assets" ON fixed_assets FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to depreciation" ON depreciation_schedules FOR ALL TO authenticated USING (is_finance_manager());

-- Inventory & Transport Policies
CREATE POLICY "Inventory managers full access to stock items" ON stock_items FOR ALL TO authenticated USING (is_inventory_manager());
CREATE POLICY "Inventory managers full access to stock movements" ON stock_movements FOR ALL TO authenticated USING (is_inventory_manager());
CREATE POLICY "Inventory managers full access to transport" ON transport_routes FOR ALL TO authenticated USING (is_inventory_manager());

-- Config & Logs
CREATE POLICY "Finance managers full access to config" ON integration_config FOR ALL TO authenticated USING (is_finance_manager());
CREATE POLICY "Finance managers full access to whatsapp logs" ON whatsapp_logs FOR ALL TO authenticated USING (is_finance_manager());
I N S E R T   I N T O   s t o r a g e . b u c k e t s   ( i d ,   n a m e ,   p u b l i c )   V A L U E S   ( ' r e c e i p t s ' ,   ' r e c e i p t s ' ,   t r u e )   O N   C O N F L I C T   ( i d )   D O   N O T H I N G ; 
 
 