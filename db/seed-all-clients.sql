-- Cadastra como CLIENTE todo nome que aparece nas suas entradas (type = income) e liga cada entrada a um
-- projeto "Historico - <cliente>" (assim "Clientes" mostra quanto cada um pagou).
-- Marca em "Observacoes" do cliente: Fixo (categoria Fixos), Recorrente (lancamento recorrente), Avulso
-- (nenhum dos dois) e "via ALMA" quando o nome termina em "- ALMA".
-- Datas no fim do nome ("Aparavo 21.09") sao ignoradas, entao viram o mesmo cliente. Nao apaga nada,
-- nao duplica ao rodar de novo. So ASCII (escapes U&'...').

DO $$
DECLARE uid uuid; r record; cid uuid; pid uuid; flags text;
BEGIN
  SELECT id INTO uid FROM public.users ORDER BY created_at LIMIT 1;
  FOR r IN
    WITH inc AS (
      SELECT t.id, t.amount, t.is_recurring, c.name AS cat,
             trim(regexp_replace(t.description, '\s*-?\s*\d{1,2}[./]\d{1,2}\s*$', '')) AS base
      FROM public.transactions t
      LEFT JOIN public.categories c ON c.id = t.category_id
      WHERE t.user_id = uid AND t.type = 'income'
    ), named AS (
      SELECT *,
             (base ~* '\s-\s*alma$') AS via_alma,
             CASE WHEN base ~* '\s-\s*alma$' THEN trim(regexp_replace(base, '\s*-\s*alma$', '', 'i')) ELSE base END AS cname
      FROM inc
    )
    SELECT min(cname) AS cname,
           COALESCE(bool_or(cat ILIKE 'fixo%'), false) AS fixo,
           COALESCE(bool_or(is_recurring), false) AS rec,
           bool_or(via_alma) AS alma,
           array_agg(id) AS ids
    FROM named
    WHERE cname <> ''
    GROUP BY lower(cname)
  LOOP
    SELECT id INTO cid FROM public.pj_clients WHERE user_id = uid AND lower(name) = lower(r.cname) LIMIT 1;
    IF cid IS NULL THEN
      flags := concat_ws(' | ',
        CASE WHEN r.fixo THEN 'Fixo' END,
        CASE WHEN r.rec THEN 'Recorrente' END,
        CASE WHEN NOT r.fixo AND NOT r.rec THEN 'Avulso' END,
        CASE WHEN r.alma THEN 'via ALMA' END);
      INSERT INTO public.pj_clients (user_id, name, company, notes) VALUES (uid, r.cname, '', flags) RETURNING id INTO cid;
    END IF;

    SELECT id INTO pid FROM public.pj_projects
      WHERE user_id = uid AND client_id = cid AND title = U&'Hist\00f3rico - ' || r.cname LIMIT 1;
    IF pid IS NULL THEN
      INSERT INTO public.pj_projects (user_id, title, client_id, client_name, project_type, stage, value)
      VALUES (uid, U&'Hist\00f3rico - ' || r.cname, cid, r.cname, 'Outro', 'Pago', 0) RETURNING id INTO pid;
    END IF;

    UPDATE public.transactions SET project_id = pid WHERE id = ANY(r.ids) AND project_id IS NULL;
    UPDATE public.pj_projects
      SET value = COALESCE((SELECT sum(amount) FROM public.transactions WHERE project_id = pid AND type = 'income'), 0)
      WHERE id = pid;
  END LOOP;
END $$;

SELECT c.name AS cliente, c.notes AS tipo, count(t.id) AS entradas, COALESCE(sum(t.amount), 0) AS total
FROM public.pj_clients c
LEFT JOIN public.pj_projects p ON p.client_id = c.id
LEFT JOIN public.transactions t ON t.project_id = p.id AND t.type = 'income'
GROUP BY c.name, c.notes ORDER BY total DESC;
