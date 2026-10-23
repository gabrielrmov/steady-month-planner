-- Move TODOS os lancamentos e categorias atuais para a aba PJ (scope = 'business').
-- Nada e apagado. O estado anterior fica guardado em scope_backup (para desfazer, veja o fim do arquivo).

CREATE TABLE IF NOT EXISTS public.scope_backup (
  tbl TEXT NOT NULL,
  id UUID NOT NULL,
  scope TEXT NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tbl, id)
);

INSERT INTO public.scope_backup (tbl, id, scope)
  SELECT 'transactions', id, scope FROM public.transactions
  ON CONFLICT DO NOTHING;
INSERT INTO public.scope_backup (tbl, id, scope)
  SELECT 'categories', id, scope FROM public.categories
  ON CONFLICT DO NOTHING;

UPDATE public.transactions SET scope = 'business' WHERE scope = 'personal';
UPDATE public.categories SET scope = 'business' WHERE scope = 'personal';

-- Conferencia: quanto foi movido e as entradas (candidatas a clientes).
SELECT 'transactions' AS tabela, count(*) AS em_pj FROM public.transactions WHERE scope = 'business'
UNION ALL
SELECT 'categories', count(*) FROM public.categories WHERE scope = 'business';

-- Para DESFAZER (rode separado, so se precisar):
--   UPDATE public.transactions t SET scope = b.scope FROM public.scope_backup b WHERE b.tbl = 'transactions' AND b.id = t.id;
--   UPDATE public.categories c SET scope = b.scope FROM public.scope_backup b WHERE b.tbl = 'categories' AND b.id = c.id;
