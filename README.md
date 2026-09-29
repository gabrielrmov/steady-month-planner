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

| Variável | Onde usa | Observação |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_PROJECT_ID` | servidor | do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | servidor | chave `sb_publishable_...`, feita para ser pública |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` | navegador | os mesmos valores, com prefixo `VITE_` |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor | dá acesso total ao banco. Nunca exponha nem versione |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | só servidor | necessárias só para o Open Finance |

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

## Deploy

Este projeto está conectado ao Lovable. Commits na branch conectada sincronizam com o editor,
então evite reescrever o histórico já publicado (force push, rebase, amend).
