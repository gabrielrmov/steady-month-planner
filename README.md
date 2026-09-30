# FINLIST

Seu dinheiro, em ordem. Dashboard de gestão financeira com checklist mensal de contas a pagar,
entradas, cartões, parcelas, metas de economia e relatórios.

FINLIST não é banco, corretora nem consultoria.

## Stack

- TanStack Start (React 19) e TanStack Router
- Supabase (autenticação e Postgres, com RLS)
- Tailwind CSS 4, Radix UI e Recharts
- Open Finance via Pluggy (opcional)

## Como rodar

Requer Node.js e Bun (ou npm).

```sh
git clone https://github.com/gabrielrmov/steady-month-planner.git
cd steady-month-planner
cp .env.example .env   # preencha os valores (veja abaixo)
bun install            # ou: npm install
bun run dev            # ou: npm run dev
```

Outros comandos: `npm run build`, `npm run lint`, `npm run format`.

## Variáveis de ambiente

O arquivo `.env` não é versionado. Use o `.env.example` como modelo.

| Variável                                                                         | Onde usa    | Observação                                           |
| -------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_PROJECT_ID`                                            | servidor    | do projeto Supabase                                  |
| `SUPABASE_PUBLISHABLE_KEY`                                                       | servidor    | chave `sb_publishable_...`, feita para ser pública   |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` | navegador   | os mesmos valores, com prefixo `VITE_`               |
| `SUPABASE_SERVICE_ROLE_KEY`                                                      | só servidor | dá acesso total ao banco. Nunca exponha nem versione |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`                                       | só servidor | necessárias só para o Open Finance                   |

## Banco de dados

As migrações estão em `supabase/migrations`. Para aplicá-las no seu projeto:

```sh
supabase link --project-ref <seu-project-ref>
supabase db push
```

Para login com Google, configure o provedor em Supabase Dashboard > Authentication > Providers >
Google, com as credenciais OAuth do seu próprio app.

## Design

O visual segue o padrão da Column: azul-marinho `#111a4a`, fundo `#f6f6f8` com cartões brancos,
seafoam para dados e um único laranja `#ec652b` por página. Fonte Inter, raio de 8px e tema escuro.
Os tokens ficam em `src/styles.css`, e a landing em `src/routes/index.tsx`.

- Valores em dinheiro usam algarismos tabulares (classe `num`) e ficam alinhados à direita em tabelas.
- Status nunca aparece só pela cor: sempre há uma palavra ou seta.
- Os dados e nomes da landing são de exemplo e estão marcados como "Exemplo ilustrativo".

## Deploy (GitHub Pages)

O site é publicado como arquivos estáticos pelo GitHub Pages, a cada push na `main`
(workflow em `.github/workflows/pages.yml`). Endereço: `https://gabrielrmov.github.io/steady-month-planner/`.

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
