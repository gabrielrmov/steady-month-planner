# Finlist

Organizador financeiro com checklist mes a mes de contas a pagar, controle do que foi pago,
dashboard de quanto vai entrar e quanto vai sair.

## Stack

- TanStack Start (React 19)
- Supabase (auth + banco de dados Postgres)
- Tailwind CSS

## Desenvolvimento local

Requer Node.js e Bun (ou npm).

```sh
git clone <url-deste-repositorio>
cd steady-month-planner
bun install   # ou: npm install
bun run dev   # ou: npm run dev
```

## Configuracao do Supabase

Copie `.env.example` para `.env` e preencha com as credenciais do seu projeto Supabase
(URL, publishable key e, se necessario no servidor, a service role key):

```sh
cp .env.example .env
```

As migracoes do banco estao em `supabase/migrations`. Para aplica-las no seu proprio
projeto Supabase, use a Supabase CLI:

```sh
supabase link --project-ref <seu-project-ref>
supabase db push
```

Para login social (Google), configure o provider em
Supabase Dashboard > Authentication > Providers > Google, com as credenciais OAuth do
seu proprio app.
