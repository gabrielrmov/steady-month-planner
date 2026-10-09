# FINLIST

Seu dinheiro, em ordem. Dashboard de gestão financeira com checklist mensal de contas a pagar,
entradas, cartões, parcelas, metas de economia e relatórios.

FINLIST não é banco, corretora nem consultoria.

## Stack

- TanStack Start (React 19) e TanStack Router, com servidor Node (Nitro)
- PostgreSQL (Neon) acessado pelo próprio servidor (`pg`); login com Google (OAuth + PKCE) e sessão em cookie assinado (`jose`)
- Tailwind CSS 4, Radix UI e Recharts
- Open Finance via Pluggy (opcional)

Como os dados chegam ao banco: as telas usam `supabase.from(...)` (`src/integrations/supabase/client.ts`),
um cliente compatível que envia a consulta para `/api/db`. O servidor (`src/server/query.ts`) só aceita
as tabelas e colunas conhecidas, usa parâmetros SQL e **restringe toda consulta ao usuário da sessão**
(é isso que substitui o antigo RLS). Testes: `npm run test:server` (PGlite).

## Como rodar

Requer Node.js 22+.

```sh
git clone https://github.com/gabrielrmov/steady-month-planner.git
cd steady-month-planner
cp .env.example .env   # preencha os valores (veja abaixo)
npm install
npm run db:schema      # cria as tabelas no banco apontado por NEON_DATABASE_URL (.env.migracao)
npm run dev
```

Outros comandos: `npm run build` (com `DEPLOY_TARGET=node`), `npm start`, `npm run lint`, `npm run test:server`.

## Variáveis de ambiente

O arquivo `.env` não é versionado. Use o `.env.example` como modelo.

| Variável                                   | Observação                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `DATABASE_URL`                             | string de conexão do PostgreSQL (Neon, "pooled")                        |
| `SESSION_SECRET`                           | 32+ caracteres aleatórios; assina o cookie de sessão                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | cliente OAuth "Aplicativo da Web" do Google Cloud                       |
| `APP_URL`                                  | endereço público, sem barra final (ex.: `https://finlist.onrender.com`) |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | só para o Open Finance                                                  |

No Google Cloud, o cliente precisa da origem `APP_URL` e do redirecionamento `APP_URL/api/auth/callback`.

## Banco de dados

O schema está em `db/schema.sql` (idempotente; inclui os gatilhos que criam perfil, categorias padrão e
o teste de 30 dias para cada novo usuário). `db/migrate-data.mjs` copiou os dados do Supabase para o Neon
(uso único, já executado); o histórico antigo continua em `supabase/migrations`.

## Deploy (Cloudflare Workers)

O site e a API rodam no mesmo Worker (`finlist`). O build (`npm run build`) gera `.output/server` com o
`wrangler.json`; o Cloudflare (Workers Builds) faz o deploy a cada push na branch de produção.
O acesso ao banco usa o driver HTTP da Neon (`@neondatabase/serverless`), que funciona no Worker.

Variáveis de execução (Worker → Settings → Variables and secrets, como **Secret**): `DATABASE_URL`,
`SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`
(e `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` para o Open Finance).

Alternativa em servidor Node (Render, VPS): `DEPLOY_TARGET=node npm run build` e `npm start`; veja `render.yaml`.

Cuidado ao mexer no histórico publicado: há sincronização com o Lovable, então evite force push, rebase e amend.

## Design

O visual segue o padrão da Column: azul-marinho `#111a4a`, fundo `#f6f6f8` com cartões brancos,
seafoam para dados e um único laranja `#ec652b` por página. Fonte Inter, raio de 8px e tema escuro.
Os tokens ficam em `src/styles.css`, e a landing em `src/routes/index.tsx`.

- Valores em dinheiro usam algarismos tabulares (classe `num`) e ficam alinhados à direita em tabelas.
- Status nunca aparece só pela cor: sempre há uma palavra ou seta.
- Os dados e nomes da landing são de exemplo e estão marcados como "Exemplo ilustrativo".

## Deploy (GitHub Pages)

O site é publicado como arquivos estáticos pelo GitHub Pages, a cada push na `main`
(workflow em `.github/workflows/pages.yml`). Endereço: `https://finlist.onrender.com/`.

**Ativar uma vez:** no repositório, `Settings > Pages > Build and deployment > Source: GitHub Actions`.
Em repositório privado, o Pages exige plano GitHub Pro, Team ou Enterprise.

Como funciona o build estático (`GITHUB_PAGES=true`, ver `vite.config.ts`):

- as páginas públicas (`/`, `/pricing`, `/terms`, `/privacy`, `/auth`) são pré-renderizadas em HTML, com metas e JSON-LD;
- o app logado roda no navegador (modo SPA); o `404.html` é o shell do app, então rotas como `/dashboard` abrem ao recarregar;
- o prefixo `/steady-month-planner/` vem de `PAGES_BASE`. Com domínio próprio, use `PAGES_BASE: "/"` no workflow e ajuste `SITE_URL` em `src/lib/seo.ts` e as URLs de `public/robots.txt`, `sitemap.xml` e `llms.txt`;
- as chaves do Supabase no workflow são as **publishable** (públicas). Nunca coloque service role nem segredos do Pluggy ali.

Limites da hospedagem estática:

- **Open Finance (Pluggy)** usa funções de servidor e **não funciona** no GitHub Pages. O restante do app fala direto com o Supabase pelo navegador.
- `robots.txt` só vale na raiz de um domínio. No endereço de projeto do Pages ele fica em `/steady-month-planner/robots.txt` e os buscadores o ignoram; com domínio próprio passa a valer.
- No Supabase (`Authentication > URL Configuration`), inclua o novo endereço em **Site URL** e **Redirect URLs**, senão o login por e-mail e por Google volta para o endereço antigo.

Também há sincronização com o Lovable: evite reescrever o histórico já publicado (force push, rebase, amend).
