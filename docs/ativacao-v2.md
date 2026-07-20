# Ativação segura da versão comercial v2.0

Não publique a branch comercial antes de concluir este checklist.

## 1. Banco de dados

Faça um backup do Supabase e execute no SQL Editor:

```text
supabase/migrations/003_commercial_saas.sql
```

Confirme que existem as tabelas `plans`, `subscriptions`, `usage_events`, `prospecting_jobs`, `audit_logs` e `webhook_events`. As organizações que já existiam antes da migração recebem o plano Business como contas fundadoras. Novos cadastros começam no Gratuito.

## 2. Supabase Auth

- Mantenha confirmação de e-mail ativa.
- Exija senha mínima de 8 caracteres no aplicativo e uma política forte no Supabase.
- Ative proteção contra senhas vazadas e CAPTCHA quando disponível.
- Revise Site URL e Redirect URLs.
- Ative MFA nas contas administrativas do Supabase.

## 3. Stripe em teste

Crie produtos mensais Starter, Pro e Business. Cadastre na Vercel:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
```

Webhook:

```text
https://lynk-prospect.vercel.app/api/billing/webhook
```

Eventos: `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`.

Faça compra, troca de plano, cancelamento e falha de pagamento no ambiente de teste antes de usar chaves reais.

## 4. Google Places

Ative Places API (New), habilite faturamento, limite a chave a essa API e configure alertas de custo. Cadastre somente no ambiente de servidor:

```env
GOOGLE_PLACES_API_KEY=...
```

Teste primeiro com 5 leads. Confirme telefone, site, endereço, duplicidade, créditos e exportação antes de aumentar o volume.

## 5. Variáveis essenciais

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://lynk-prospect.vercel.app
```

Nunca use `NEXT_PUBLIC_` em service role, Stripe ou Google Places.

## 6. Publicação

1. Crie uma Preview Deployment da branch `feature/commercial-saas-v2`.
2. Cadastre um usuário de teste novo e confirme que ele recebe Gratuito.
3. Confirme bloqueio de prospecção, projetos e relatórios conforme o plano.
4. Faça checkout Stripe em teste e confirme a liberação automática.
5. Gere e exporte uma prospecção pequena.
6. Teste em celular e desktop.
7. Somente depois faça merge na `main`.

## 7. Monitoramento inicial

- Acompanhe erros de API e webhooks.
- Configure alertas de gasto do Google Cloud.
- Monitore falhas e tentativas excessivas na Vercel.
- Revise mensalmente RLS, membros, créditos e eventos de auditoria.
