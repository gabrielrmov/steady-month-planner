-- Área "Meu trabalho (PJ)": perfil, clientes, CRM, propostas, contratos, projetos e equipamentos.
-- transactions/categories ganham "scope" (personal | business) e transactions ganha project_id.

-- ===== Meu trabalho (PJ) =====
-- Mesma regra do resto: toda tabela tem user_id e o servidor filtra por ele (src/server/query.ts).

CREATE TABLE IF NOT EXISTS public.pj_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_profile TO authenticated;
GRANT ALL ON public.pj_profile TO service_role;
ALTER TABLE public.pj_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_profile" ON public.pj_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_profile_updated_at BEFORE UPDATE ON public.pj_profile
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_clients TO authenticated;
GRANT ALL ON public.pj_clients TO service_role;
ALTER TABLE public.pj_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_clients" ON public.pj_clients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_clients_updated_at BEFORE UPDATE ON public.pj_clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_leads TO authenticated;
GRANT ALL ON public.pj_leads TO service_role;
ALTER TABLE public.pj_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_leads" ON public.pj_leads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_leads_updated_at BEFORE UPDATE ON public.pj_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_proposals TO authenticated;
GRANT ALL ON public.pj_proposals TO service_role;
ALTER TABLE public.pj_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_proposals" ON public.pj_proposals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_proposals_updated_at BEFORE UPDATE ON public.pj_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_contracts TO authenticated;
GRANT ALL ON public.pj_contracts TO service_role;
ALTER TABLE public.pj_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_contracts" ON public.pj_contracts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_contracts_updated_at BEFORE UPDATE ON public.pj_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_projects TO authenticated;
GRANT ALL ON public.pj_projects TO service_role;
ALTER TABLE public.pj_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_projects" ON public.pj_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_projects_updated_at BEFORE UPDATE ON public.pj_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pj_equipment TO authenticated;
GRANT ALL ON public.pj_equipment TO service_role;
ALTER TABLE public.pj_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pj_equipment" ON public.pj_equipment
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pj_equipment_updated_at BEFORE UPDATE ON public.pj_equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
