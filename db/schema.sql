-- FINLIST — schema PostgreSQL puro (sem Supabase). Idempotente: pode rodar várias vezes.
-- A autorização (antes RLS) agora é feita no servidor: toda consulta é filtrada por user_id.


CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  google_sub TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users (lower(email));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563EB',
  kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('income','expense')),
  monthly_budget NUMERIC(14,2) CHECK (monthly_budget IS NULL OR monthly_budget >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563EB',
  closing_day INT,
  due_day INT,
  credit_limit NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'file',
  file_name TEXT,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
  installment_number INT,
  installment_total INT,
  purchase_group_id UUID,
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  fingerprint TEXT,
  recurrence_day INTEGER,
  invoice_month DATE,
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_user_due_idx ON public.transactions (user_id, due_date);
CREATE INDEX IF NOT EXISTS transactions_card_id_idx ON public.transactions (card_id);
CREATE INDEX IF NOT EXISTS transactions_purchase_group_idx ON public.transactions (purchase_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_fingerprint_key
  ON public.transactions (user_id, fingerprint) WHERE fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  match_type TEXT NOT NULL DEFAULT 'contains',
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  applies_to TEXT NOT NULL DEFAULT 'expense',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pluggy',
  external_item_id TEXT,
  institution_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inactive',
  plan TEXT NOT NULL DEFAULT 'trial',
  profile_type TEXT NOT NULL DEFAULT 'pf',
  trial_ends_at TIMESTAMPTZ,
  paddle_subscription_id TEXT,
  paddle_customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563EB',
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estrutura inferida do uso em divisao-ganhos.tsx; conferir com o banco real antes de migrar os dados.
CREATE TABLE IF NOT EXISTS public.income_split_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percentage NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Meu trabalho (PJ) =====
-- Mesma regra do resto: toda tabela tem user_id e o servidor filtra por ele (src/server/query.ts).

CREATE TABLE IF NOT EXISTS public.pj_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  doc TEXT,
  phone TEXT,
  email TEXT,
  city TEXT,
  address TEXT,
  pix TEXT,
  logo TEXT,
  regime TEXT NOT NULL DEFAULT '' CHECK (regime IN ('', 'MEI', 'Simples Nacional', 'Outro')),
  annual_limit NUMERIC(14,2),
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 6 CHECK (tax_rate >= 0 AND tax_rate < 100),
  monthly_goal NUMERIC(14,2),
  desired_income NUMERIC(14,2),
  fixed_costs NUMERIC(14,2),
  billable_hours NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pj_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  company TEXT,
  doc TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pj_clients_user_idx ON public.pj_clients (user_id);

CREATE TABLE IF NOT EXISTS public.pj_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  service TEXT,
  value NUMERIC(14,2) NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'Novo lead' CHECK (stage IN (
    'Novo lead', 'Primeiro contato', 'Reunião marcada', 'Proposta enviada',
    'Aguardando resposta', 'Em negociação', 'Fechado', 'Perdido')),
  contact TEXT,
  follow_up DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pj_leads_user_idx ON public.pj_leads (user_id);

CREATE TABLE IF NOT EXISTS public.pj_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Proposta Comercial',
  proposal_date DATE,
  validity TEXT,
  client_id UUID REFERENCES public.pj_clients(id) ON DELETE SET NULL,
  client_name TEXT,
  company TEXT,
  intro TEXT,
  scope_of_work TEXT,
  deliverables TEXT,
  timeline TEXT,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Enviada', 'Aprovada', 'Recusada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pj_proposals_user_idx ON public.pj_proposals (user_id);

CREATE TABLE IF NOT EXISTS public.pj_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'pontual' CHECK (contract_type IN ('pontual', 'mensal', 'terceirizado', 'imagem')),
  client_id UUID REFERENCES public.pj_clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_doc TEXT,
  client_address TEXT,
  representative TEXT,
  object TEXT,
  deliverables TEXT,
  value NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  term TEXT,
  revisions INTEGER NOT NULL DEFAULT 2,
  cancel_fee TEXT,
  contract_date DATE,
  proposal_id UUID REFERENCES public.pj_proposals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pj_contracts_user_idx ON public.pj_contracts (user_id);

CREATE TABLE IF NOT EXISTS public.pj_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_id UUID REFERENCES public.pj_clients(id) ON DELETE SET NULL,
  client_name TEXT,
  project_type TEXT NOT NULL DEFAULT 'Outro',
  stage TEXT NOT NULL DEFAULT 'Pré-produção' CHECK (stage IN (
    'Pré-produção', 'Captação', 'Edição', 'Revisão', 'Entregue', 'Pago')),
  value NUMERIC(14,2) NOT NULL DEFAULT 0,
  shoot_date DATE,
  due_date DATE,
  delivery_link TEXT,
  delivery_message TEXT,
  notes TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  videos JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposal_id UUID REFERENCES public.pj_proposals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pj_projects_user_idx ON public.pj_projects (user_id);

CREATE TABLE IF NOT EXISTS public.pj_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Câmera',
  cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  purchased_at DATE,
  life_months INTEGER NOT NULL DEFAULT 36 CHECK (life_months > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pj_equipment_user_idx ON public.pj_equipment (user_id);

-- Financeiro PJ reaproveita transactions/categories, separado por "scope".
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'business'));
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.pj_projects(id) ON DELETE SET NULL;
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'business'));
CREATE INDEX IF NOT EXISTS transactions_user_scope_idx ON public.transactions (user_id, scope, due_date);
CREATE INDEX IF NOT EXISTS transactions_project_idx ON public.transactions (project_id);

-- ===== Links públicos para o cliente =====
-- O token é o segredo do link (64 hex = 244 bits). Quem tem o link lê; ninguém lista.
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  kind TEXT NOT NULL CHECK (kind IN ('proposal', 'delivery')),
  ref_id UUID,
  title TEXT NOT NULL DEFAULT '',
  brand JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  UNIQUE (user_id, kind, ref_id)
);
CREATE INDEX IF NOT EXISTS shares_user_idx ON public.shares (user_id);

CREATE TABLE IF NOT EXISTS public.share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'approval', 'reply', 'view')),
  name TEXT CHECK (name IS NULL OR char_length(name) <= 80),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 2000),
  video INTEGER CHECK (video IS NULL OR video BETWEEN 0 AND 99),
  time_seconds INTEGER CHECK (time_seconds IS NULL OR time_seconds BETWEEN 0 AND 86400),
  decision TEXT CHECK (decision IS NULL OR decision IN ('approved', 'changes')),
  done BOOLEAN NOT NULL DEFAULT false,
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- o evento só existe dentro de um link do mesmo dono
  FOREIGN KEY (share_id, user_id) REFERENCES public.shares (id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS share_events_share_idx ON public.share_events (share_id, created_at);
CREATE INDEX IF NOT EXISTS share_events_user_unseen_idx ON public.share_events (user_id) WHERE NOT seen;

-- Limite de requisições das rotas públicas (por impressão digital do IP, janela fixa).
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Triggers updated_at
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','transactions','cards','category_rules','bank_connections',
                           'subscriptions','savings_goals','income_split_categories',
                           'pj_profile','pj_clients','pj_leads','pj_proposals','pj_contracts',
                           'pj_projects','pj_equipment','shares']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
                   t || '_updated_at', t);
  END LOOP;
END $$;

-- Novo usuário: perfil + categorias padrão (antes: handle_new_user em auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name) VALUES (NEW.id, NEW.email, NEW.full_name)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.categories (user_id, name, color, kind) VALUES
    (NEW.id, 'Moradia', '#2563EB', 'expense'),
    (NEW.id, 'Alimentação', '#10B981', 'expense'),
    (NEW.id, 'Transporte', '#F59E0B', 'expense'),
    (NEW.id, 'Lazer', '#EC4899', 'expense'),
    (NEW.id, 'Salário', '#059669', 'income'),
    (NEW.id, 'Outros', '#6B7280', 'expense');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Perfil novo: assinatura de teste de 30 dias
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan, trial_ends_at)
  VALUES (NEW.id, 'trialing', 'trial', now() + interval '30 days');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
