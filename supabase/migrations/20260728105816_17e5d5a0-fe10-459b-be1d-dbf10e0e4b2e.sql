CREATE TABLE public.category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern text NOT NULL,
  match_type text NOT NULL DEFAULT 'contains',
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  applies_to text NOT NULL DEFAULT 'expense',
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_rules TO authenticated;
GRANT ALL ON public.category_rules TO service_role;
ALTER TABLE public.category_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own category rules" ON public.category_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER category_rules_updated_at BEFORE UPDATE ON public.category_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bank_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'pluggy',
  external_item_id text,
  institution_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_connections TO authenticated;
GRANT ALL ON public.bank_connections TO service_role;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bank connections" ON public.bank_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bank_connections_updated_at BEFORE UPDATE ON public.bank_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'file',
  file_name text,
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own import batches" ON public.import_batches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS fingerprint text,
  ADD COLUMN IF NOT EXISTS recurrence_day integer,
  ADD COLUMN IF NOT EXISTS invoice_month date,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_fingerprint_key
  ON public.transactions (user_id, fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_user_due_date_idx ON public.transactions (user_id, due_date);