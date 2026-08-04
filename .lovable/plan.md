Objetivo: elevar o Finlist para um produto SaaS com identidade visual coesa, jornada comercial clara e monetização real.

1. Tema escuro global (midnight)
- Aplicar a classe `dark` no `<html>` e ajustar tokens para que todas as telas (landing, auth, pricing, app autenticado) usem a mesma paleta escura da nova sidebar.
- Revisar componentes que usam cores hardcoded ou cards claros para garantir contraste e consistência.
- Resultado: experiência visual única, premium e SaaS-ready.

2. Landing page comercial
- Reestruturar `/` com hero de impacto, benefícios em grid, seção "Como funciona", prova social (depoimentos/estatísticas), preview de funcionalidades, FAQ e CTA final.
- Manter SEO otimizado com título, descrição, og tags e lazy loading.
- Adicionar navegação clara para `/pricing` e `/auth`.

3. Onboarding pós-cadastro
- Criar rota `/onboarding` exibida no primeiro acesso.
- Fluxo em passos: confirmação do nome, escolha de objetivo financeiro, configuração rápida de categorias e criação do primeiro lançamento.
- Salvar progresso no perfil e redirecionar para `/dashboard` ao final.
- Resultado: reduzir churn, ativar o usuário no primeiro uso.

4. Pagamentos e planos (Paddle)
- Ativar Paddle (provedor recomendado para este produto) após sua confirmação.
- Criar tabela `subscriptions` ligada ao usuário, com status, plano, data de término e metadados do Paddle.
- Ajustar `/pricing` para iniciar checkout do plano Pro.
- Adicionar gatilhos de upgrade no dashboard e em configurações.
- Implementar limites no plano Gratuito (ex: até 2 cartões, relatórios avançados e exportação bloqueados).
- Criar rota de webhook `/api/public/paddle` para sincronizar status de assinatura.
- Resultado: monetização ativa com cobrança real.

Entrega final esperada: identidade visual escura consistente, jornada de conversão aprimorada, ativação de novos usuários e infraestrutura de cobrança funcional.