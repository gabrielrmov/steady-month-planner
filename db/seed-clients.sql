-- Cadastra clientes da aba PJ a partir das entradas ja lancadas e liga cada entrada a um projeto "Historico".
-- Assim "Clientes" mostra quanto cada um pagou e "Relatorios" mostra quem mais pagou.
-- Nao apaga nada e pode rodar de novo (nao duplica). So ASCII (escapes U&'...').

DO $$
DECLARE uid uuid; r record; cid uuid; pid uuid;
BEGIN
  SELECT id INTO uid FROM public.users ORDER BY created_at LIMIT 1;
  FOR r IN SELECT * FROM (VALUES
      ('ALMA', '% - alma'),
      (U&'AG\00caNCIA NOS', U&'AG\00caNCIA NOS%')
    ) AS v(name, pat)
  LOOP
    SELECT id INTO cid FROM public.pj_clients WHERE user_id = uid AND lower(name) = lower(r.name) LIMIT 1;
    IF cid IS NULL THEN
      INSERT INTO public.pj_clients (user_id, name, company) VALUES (uid, r.name, r.name) RETURNING id INTO cid;
    END IF;

    SELECT id INTO pid FROM public.pj_projects
      WHERE user_id = uid AND client_id = cid AND title = U&'Hist\00f3rico - ' || r.name LIMIT 1;
    IF pid IS NULL THEN
      INSERT INTO public.pj_projects (user_id, title, client_id, client_name, project_type, stage, value)
      VALUES (uid, U&'Hist\00f3rico - ' || r.name, cid, r.name, 'Outro', 'Pago', 0) RETURNING id INTO pid;
    END IF;

    UPDATE public.transactions SET project_id = pid
      WHERE user_id = uid AND type = 'income' AND description ILIKE r.pat AND project_id IS NULL;
    UPDATE public.pj_projects
      SET value = COALESCE((SELECT sum(amount) FROM public.transactions WHERE project_id = pid AND type = 'income'), 0)
      WHERE id = pid;
  END LOOP;
END $$;

SELECT c.name AS cliente, count(t.id) AS entradas, COALESCE(sum(t.amount), 0) AS total
FROM public.pj_clients c
LEFT JOIN public.pj_projects p ON p.client_id = c.id
LEFT JOIN public.transactions t ON t.project_id = p.id AND t.type = 'income'
GROUP BY c.name ORDER BY total DESC;
