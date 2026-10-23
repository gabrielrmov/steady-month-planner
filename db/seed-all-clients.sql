-- Cadastra os CLIENTES das suas entradas (type = income) e os TRABALHOS de cada um como projetos.
-- Regras pelo nome da entrada (sem diferenciar maiuscula/minuscula, datas no fim sao ignoradas):
--   "FREELA JP - MELT"        -> cliente JP,       projeto Melt
--   "FREELA PL"               -> cliente PL,       projeto Freela
--   "RICHARD - LIVE"          -> cliente Richard,  projeto Live
--   "Casamento Richard"       -> cliente Richard,  projeto Casamento
--   "ROXO JP AO VIVO"         -> cliente JP,       projeto Roxo Ao Vivo
--   "KERO+ - ALMA"            -> cliente Kero+,    projeto Geral, etiqueta "via ALMA"
--   "AGENCIA NOS", "Dr Jorge" -> cliente com o proprio nome, projeto Geral
-- Etiquetas nas observacoes do cliente: Fixo (categoria Fixos), Recorrente (lancamento recorrente), Avulso.
-- Tambem desfaz o cadastro anterior (projetos "Historico - ..." e os clientes que so tinham eles).
-- Nao apaga lancamentos e pode rodar de novo sem duplicar. So ASCII (escapes U&'...').

DO $$
DECLARE
  uid uuid; t record; base text; rest text; cname text; job text; via boolean;
  cid uuid; pid uuid; tags text[]; touched_c uuid[] := '{}'; touched_p uuid[] := '{}';
  tagonly constant text := '^(Fixo|Recorrente|Avulso|via ALMA)( \| (Fixo|Recorrente|Avulso|via ALMA))*$';
BEGIN
  SELECT id INTO uid FROM public.users ORDER BY created_at LIMIT 1;

  DELETE FROM public.pj_projects WHERE user_id = uid AND title LIKE U&'Hist\00f3rico - %';
  DELETE FROM public.pj_clients c
    WHERE c.user_id = uid AND c.notes ~ tagonly
      AND NOT EXISTS (SELECT 1 FROM public.pj_projects p WHERE p.client_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.pj_proposals q WHERE q.client_id = c.id);

  FOR t IN
    SELECT x.id, x.description, x.is_recurring, c.name AS cat
    FROM public.transactions x LEFT JOIN public.categories c ON c.id = x.category_id
    WHERE x.user_id = uid AND x.type = 'income' AND x.project_id IS NULL
    ORDER BY x.due_date
  LOOP
    base := trim(regexp_replace(t.description, '\s*-?\s*\d{1,2}[./]\d{1,2}\s*$', ''));
    CONTINUE WHEN base = '';
    via := false; job := 'Geral';
    IF base ~* '^freela\s+' THEN
      rest := trim(regexp_replace(base, '^freela\s+', '', 'i')); job := 'Freela';
    ELSIF base ~* '^casamento\s+' THEN
      rest := trim(regexp_replace(base, '^casamento\s+', '', 'i')); job := 'Casamento';
    ELSIF base ~* '^roxo\s+.+\s+ao vivo$' THEN
      rest := trim(regexp_replace(regexp_replace(base, '^roxo\s+', '', 'i'), '\s+ao vivo$', '', 'i')); job := 'Roxo ao vivo';
    ELSE
      rest := base;
    END IF;
    IF rest ~* '\s-\s*alma$' THEN
      via := true; rest := trim(regexp_replace(rest, '\s*-\s*alma$', '', 'i'));
    ELSIF rest ~ '\s-\s' THEN
      job := trim(substring(rest from '\s-\s(.*)$')); rest := trim(regexp_replace(rest, '\s-\s.*$', ''));
    END IF;
    CONTINUE WHEN rest = '';
    cname := CASE WHEN length(rest) <= 3 THEN upper(rest) ELSE initcap(lower(rest)) END;
    job := CASE WHEN length(job) <= 3 THEN upper(job) ELSE initcap(lower(job)) END;

    SELECT id INTO cid FROM public.pj_clients WHERE user_id = uid AND lower(name) = lower(cname) LIMIT 1;
    IF cid IS NULL THEN
      INSERT INTO public.pj_clients (user_id, name, company, notes) VALUES (uid, cname, '', '') RETURNING id INTO cid;
    END IF;
    SELECT id INTO pid FROM public.pj_projects WHERE user_id = uid AND client_id = cid AND lower(title) = lower(job) LIMIT 1;
    IF pid IS NULL THEN
      INSERT INTO public.pj_projects (user_id, title, client_id, client_name, project_type, stage, value)
      VALUES (uid, job, cid, cname, 'Outro', 'Pago', 0) RETURNING id INTO pid;
    END IF;
    UPDATE public.transactions SET project_id = pid WHERE id = t.id;

    tags := ARRAY[]::text[];
    IF t.cat ILIKE 'fixo%' THEN tags := array_append(tags, 'Fixo'); END IF;
    IF t.is_recurring THEN tags := array_append(tags, 'Recorrente'); END IF;
    IF via THEN tags := array_append(tags, 'via ALMA'); END IF;
    UPDATE public.pj_clients SET notes = (
        SELECT string_agg(tag, ' | ' ORDER BY CASE tag WHEN 'Fixo' THEN 1 WHEN 'Recorrente' THEN 2 WHEN 'Avulso' THEN 3 ELSE 4 END)
        FROM (SELECT DISTINCT unnest(string_to_array(COALESCE(notes, ''), ' | ') || tags) AS tag) s WHERE tag <> '')
      WHERE id = cid AND (COALESCE(notes, '') = '' OR notes ~ tagonly);
    touched_c := array_append(touched_c, cid); touched_p := array_append(touched_p, pid);
  END LOOP;

  UPDATE public.pj_clients SET notes = concat_ws(' | ', 'Avulso', NULLIF(notes, ''))
    WHERE id = ANY(touched_c) AND (COALESCE(notes, '') = '' OR notes ~ tagonly) AND COALESCE(notes, '') !~ '(Fixo|Recorrente|Avulso)';
  UPDATE public.pj_projects p
    SET value = COALESCE((SELECT sum(amount) FROM public.transactions WHERE project_id = p.id AND type = 'income'), 0)
    WHERE id = ANY(touched_p);
END $$;

SELECT c.name AS cliente, c.notes AS tipo, string_agg(DISTINCT p.title, ', ') AS projetos,
       count(t.id) AS entradas, COALESCE(sum(t.amount), 0) AS total
FROM public.pj_clients c
LEFT JOIN public.pj_projects p ON p.client_id = c.id
LEFT JOIN public.transactions t ON t.project_id = p.id AND t.type = 'income'
GROUP BY c.name, c.notes ORDER BY total DESC;
