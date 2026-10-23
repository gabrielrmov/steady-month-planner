-- Links públicos (proposta e entrega) com comentários e aprovação do cliente.
-- O acesso sem login é feito só pelo servidor (service_role); o cliente nunca consulta estas tabelas direto.

-- ===== Links públicos para o cliente =====
-- O token é o segredo do link (64 hex = 244 bits). Quem tem o link lê; ninguém lista.
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shares TO authenticated;
GRANT ALL ON public.shares TO service_role;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shares" ON public.shares
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shares_updated_at BEFORE UPDATE ON public.shares
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own share_events" ON public.share_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
