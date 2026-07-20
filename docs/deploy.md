# Deploy na Vercel

## 1. Criar o repositório

No GitHub, crie um repositório privado chamado `lynk-prospect`. Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: LYNK Prospect v1.0"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Não envie `.env.local` ao GitHub. O arquivo já está ignorado.

## 2. Importar na Vercel

1. Acesse a Vercel e escolha **Add New > Project**.
2. Importe o repositório `lynk-prospect`.
3. Confirme o framework **Next.js**.
4. Mantenha os comandos padrão de build e output.

## 3. Variáveis de ambiente

Cadastre em **Project Settings > Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_APENAS_NO_SERVIDOR
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO.vercel.app

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...

GOOGLE_PLACES_API_KEY=...
```

Comece com chaves de teste da Stripe. Não use uma variável `NEXT_PUBLIC_` para service role, Stripe ou Google Places.

## 4. Atualizar o banco comercial

No SQL Editor, execute `supabase/migrations/003_commercial_saas.sql`. As organizações já existentes são preservadas como contas fundadoras Business; cadastros novos começam no Gratuito.

## 5. Configurar Stripe

1. Crie os três produtos recorrentes e copie os Price IDs.
2. Cadastre o endpoint `https://SEU-DOMINIO/api/billing/webhook`.
3. Escute eventos `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`.
4. Copie o segredo do webhook para `STRIPE_WEBHOOK_SECRET`.
5. Faça primeiro uma assinatura completa em modo de teste.

## 6. Configurar Google Places

Ative Places API (New), habilite faturamento e restrinja a chave para essa API. A chave deve existir somente na Vercel. Defina alertas e cotas no Google Cloud antes de liberar clientes.

## 7. Atualizar o Supabase

Em **Authentication > URL Configuration**:

- Troque o Site URL para o domínio de produção.
- Adicione `https://SEU-DOMINIO.vercel.app/auth/callback` em Redirect URLs.
- Adicione também o domínio personalizado, quando houver.

## 8. Publicar

Clique em **Deploy**. Depois do primeiro deploy:

1. Abra `/login`.
2. Faça login.
3. Crie um lead.
4. Arraste o lead no pipeline.
5. Crie uma tarefa na agenda.
6. Gere e salve um prompt.

## Domínio próprio

Em **Project Settings > Domains**, adicione o domínio. Atualize `NEXT_PUBLIC_APP_URL` e as URLs permitidas no Supabase após o DNS ser validado.

## Segurança

- As tabelas usam Row Level Security e isolamento por organização.
- Nunca coloque a `SUPABASE_SERVICE_ROLE_KEY` no navegador.
- Tokens futuros de WhatsApp e deploy devem ser usados somente em rotas de servidor.
- Ative MFA na conta administrativa do Supabase e da Vercel.
- Ative confirmação de e-mail, proteção contra senhas vazadas e limites de autenticação.
- Habilite alertas de uso na Stripe, Google Cloud, Supabase e Vercel.
