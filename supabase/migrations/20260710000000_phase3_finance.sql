-- Migration: Phase 3 Finance & Billing
-- Creates tables: fee_structures, invoices, invoice_items, payments, expenses, student_parents
-- Sets up RLS policies, indexes, and automatic invoice generation helper logic.

-- 1. Helper function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- 2. Create student_parents relationship table if not exists
CREATE TABLE IF NOT EXISTS public.student_parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (student_id, parent_id)
);

-- Enable RLS on student_parents
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- Drop conflicting empty tables to align schema columns
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.fee_structures CASCADE;

-- 3. Create fee_structures table
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text NOT NULL, -- e.g., '2025-2026'
  term text NOT NULL,          -- e.g., 'Term 1', 'Term 2', 'Term 3'
  grade_level text NOT NULL,   -- e.g., 'Grade 1'
  fee_type text NOT NULL,      -- e.g., 'Tuition', 'Transport', 'Uniform', 'Books', 'Activities', 'Other'
  amount numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0), -- TZS
  description text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS on fee_structures
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

-- 4. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  term text NOT NULL,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  discount_reason text,
  net_amount numeric(12, 2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Paid', 'Overdue')),
  due_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  generated_by uuid REFERENCES public.profiles(id),
  UNIQUE (student_id, academic_year, term)
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 5. Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  fee_structure_id uuid REFERENCES public.fee_structures(id),
  amount numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  description text -- Custom label (e.g. 'Previous Balance Carryover')
);

-- Enable RLS on invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- 6. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Mobile Money', 'Cheque')),
  reference_number text,
  receipt_number text NOT NULL UNIQUE,
  notes text,
  payment_date timestamp with time zone DEFAULT now(),
  received_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 7. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('Utilities', 'Supplies', 'Maintenance', 'Transport', 'Events', 'Other')),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  date date NOT NULL,
  receipt_url text,
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;


-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_lookup ON public.fee_structures(academic_year, term, grade_level);
CREATE INDEX IF NOT EXISTS idx_invoices_student ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);


-- 9. RLS POLICIES

-- student_parents policies
CREATE POLICY "Staff and Admins can view/manage student_parents"
  ON public.student_parents TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal'));

CREATE POLICY "Parents can view their own child links"
  ON public.student_parents TO authenticated
  USING (parent_id = auth.uid());

-- fee_structures policies
CREATE POLICY "All authenticated users can view fee structures"
  ON public.fee_structures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins and Accountants can manage fee structures"
  ON public.fee_structures FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- invoices policies
CREATE POLICY "Staff and Accountants can view invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

CREATE POLICY "Parents can view invoices for their children"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_parents
      WHERE student_parents.parent_id = auth.uid()
      AND student_parents.student_id = invoices.student_id
    )
  );

CREATE POLICY "Admins and Accountants can manage invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- invoice_items policies
CREATE POLICY "Staff and Accountants can view invoice items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

CREATE POLICY "Parents can view invoice items for their children"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.student_parents ON student_parents.student_id = invoices.student_id
      WHERE student_parents.parent_id = auth.uid()
      AND invoices.id = invoice_items.invoice_id
    )
  );

CREATE POLICY "Admins and Accountants can manage invoice items"
  ON public.invoice_items FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- payments policies
CREATE POLICY "Staff and Accountants can view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

CREATE POLICY "Parents can view payments for their children"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_parents
      WHERE student_parents.parent_id = auth.uid()
      AND student_parents.student_id = payments.student_id
    )
  );

CREATE POLICY "Admins and Accountants can record payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));

-- expenses policies
CREATE POLICY "Staff and Accountants can view and manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('System Admin', 'Director', 'Principal', 'Accountant'));


-- 10. HELPER FUNCTIONS AND TRIGGERS FOR PAYMENT UPDATES

-- Function to automatically update invoice status after a payment is inserted
CREATE OR REPLACE FUNCTION public.handle_payment_status_update()
RETURNS trigger AS $$
DECLARE
  v_invoice_net numeric(12, 2);
  v_total_paid numeric(12, 2);
BEGIN
  -- Get the net amount of the invoice
  SELECT net_amount INTO v_invoice_net FROM public.invoices WHERE id = NEW.invoice_id;

  -- Get total paid amount for this invoice (including this payment)
  SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid FROM public.payments WHERE invoice_id = NEW.invoice_id;

  -- Update invoice status and balance
  IF v_total_paid >= v_invoice_net THEN
    UPDATE public.invoices SET status = 'Paid' WHERE id = NEW.invoice_id;
  ELSIF v_total_paid > 0 THEN
    UPDATE public.invoices SET status = 'Partially Paid' WHERE id = NEW.invoice_id;
  ELSE
    UPDATE public.invoices SET status = 'Pending' WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment status update
CREATE TRIGGER tr_update_payment_status
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_status_update();
