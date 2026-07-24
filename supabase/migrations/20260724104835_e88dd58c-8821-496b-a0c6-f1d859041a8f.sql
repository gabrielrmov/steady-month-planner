
CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563EB',
  closing_day INT,
  due_day INT,
  credit_limit NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own cards" ON public.cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER cards_set_updated_at BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transactions
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'pix',
  ADD COLUMN card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  ADD COLUMN installment_number INT,
  ADD COLUMN installment_total INT,
  ADD COLUMN purchase_group_id UUID;

CREATE INDEX transactions_card_id_idx ON public.transactions(card_id);
CREATE INDEX transactions_purchase_group_idx ON public.transactions(purchase_group_id);
