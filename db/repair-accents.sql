-- Reparo dos acentos: o schema foi colado no Neon com a codificacao errada (ex.: "Reuniao" virou texto quebrado).
-- Este arquivo usa so ASCII (escapes U&'...') para nao depender da codificacao da area de transferencia.
-- Idempotente e sem apagar dados.

ALTER TABLE public.pj_leads DROP CONSTRAINT IF EXISTS pj_leads_stage_check;
ALTER TABLE public.pj_leads ADD CONSTRAINT pj_leads_stage_check CHECK (stage IN (
  'Novo lead', 'Primeiro contato', U&'Reuni\00e3o marcada', 'Proposta enviada',
  'Aguardando resposta', U&'Em negocia\00e7\00e3o', 'Fechado', 'Perdido'));

ALTER TABLE public.pj_projects DROP CONSTRAINT IF EXISTS pj_projects_stage_check;
ALTER TABLE public.pj_projects ADD CONSTRAINT pj_projects_stage_check CHECK (stage IN (
  U&'Pr\00e9-produ\00e7\00e3o', U&'Capta\00e7\00e3o', U&'Edi\00e7\00e3o', U&'Revis\00e3o', 'Entregue', 'Pago'));
ALTER TABLE public.pj_projects ALTER COLUMN stage SET DEFAULT U&'Pr\00e9-produ\00e7\00e3o';

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name) VALUES (NEW.id, NEW.email, NEW.full_name)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.categories (user_id, name, color, kind) VALUES
    (NEW.id, 'Moradia', '#2563EB', 'expense'),
    (NEW.id, U&'Alimenta\00e7\00e3o', '#10B981', 'expense'),
    (NEW.id, 'Transporte', '#F59E0B', 'expense'),
    (NEW.id, 'Lazer', '#EC4899', 'expense'),
    (NEW.id, U&'Sal\00e1rio', '#059669', 'income'),
    (NEW.id, 'Outros', '#6B7280', 'expense');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
