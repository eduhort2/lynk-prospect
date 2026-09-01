# LYNK Hub — migração, testes e publicação

## Objetivo

Esta evolução transforma o LYNK Prospect no sistema interno LYNK Hub sem reconstruir a aplicação e sem alterar migrations antigas já executadas.

## Ordem de atualização

1. Faça backup do banco Supabase antes das migrations.
2. Publique/teste primeiro a branch `feat/lynk-hub` em Preview na Vercel.
3. No Supabase do ambiente de teste, execute `supabase/migrations/005_lynk_hub.sql`.
4. Execute também `supabase/migrations/006_google_calendar.sql` para habilitar a conexão segura do Google Calendar.
5. Valide autenticação, organização, RLS e os módulos abaixo.
6. Somente depois promova a versão para produção.

## Migrations

Arquivos:

```text
supabase/migrations/005_lynk_hub.sql
supabase/migrations/006_google_calendar.sql
```

A migration `005_lynk_hub.sql`:

- preserva leads, clientes, tarefas e projetos existentes;
- remove os triggers que limitavam membros/leads por plano;
- deixa projetos acessíveis por organização, sem depender de feature de plano;
- expande clientes e projetos;
- expande tarefas para cliente/projeto/prioridade;
- cria `services`, `proposals`, `proposal_items`, `contracts`, `payments`, `care_subscriptions` e `documents`;
- cria índices, triggers de `updated_at` e RLS;
- mantém a conversão de lead fechado em cliente;
- cria o catálogo inicial de serviços por organização.

A migration `006_google_calendar.sql` cria `google_calendar_connections`. Essa tabela guarda os tokens OAuth somente para rotas server-side e não possui policy de leitura para `authenticated` ou `anon`.

## Variáveis obrigatórias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
```

A `SUPABASE_SERVICE_ROLE_KEY`, o Client Secret do Google e os tokens OAuth nunca podem ser enviados ao browser.

## Configuração do Google OAuth e Calendar

1. No Google Cloud Console, crie ou selecione o projeto usado pela LYNK.
2. Habilite a **Google Calendar API**.
3. Configure a tela de consentimento OAuth e adicione o escopo `https://www.googleapis.com/auth/calendar.events`.
4. Crie um OAuth Client do tipo **Web application**.
5. Em **Authorized redirect URIs**, adicione o callback exibido no provider Google do seu projeto Supabase, normalmente no formato `https://<project-ref>.supabase.co/auth/v1/callback`.
6. No Supabase Dashboard, abra Authentication → Providers → Google, habilite o provider e informe o mesmo Client ID e Client Secret.
7. Em Authentication → URL Configuration, adicione os callbacks do Hub na Redirect Allow List, incluindo o preview da branch e o domínio de produção quando for publicado.
8. Na Vercel, cadastre `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` apenas como variáveis server-side.

O login do Hub solicita `access_type=offline` e `prompt=consent` para que o Google forneça refresh token. O callback salva os tokens no servidor e a aplicação renova o access token quando necessário.

## Funcionamento da Agenda integrada

- o login possui a opção **Continuar com Google**;
- a Agenda mostra o estado da conexão com o Google;
- eventos do calendário principal do usuário aparecem na visualização mensal, semanal e diária;
- eventos vindos do Google são destacados visualmente e podem ser abertos no Google Calendar;
- ao criar uma nova tarefa no Hub com o Google conectado, o sistema cria também um evento de 1 hora no calendário principal;
- se a criação no Google falhar, a tarefa do Hub é preservada e o usuário recebe um aviso.

Nesta etapa, alterações de status/exclusões de tarefas já existentes no Hub não removem automaticamente o evento correspondente no Google porque ainda não existe um `google_event_id` persistido em `tasks`. Isso pode ser adicionado em uma etapa posterior caso seja necessário sincronismo bidirecional completo.

## Variáveis que deixam de ser necessárias para o fluxo interno

O LYNK Hub não precisa destas variáveis para operar os módulos internos:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`
- `GOOGLE_PLACES_API_KEY`
- `OPENAI_API_KEY`
- `WHATSAPP_API_TOKEN`
- `NETLIFY_TOKEN`

Se alguma rota legada ainda for usada manualmente, mantenha apenas a variável exigida por essa rota até a remoção definitiva do legado.

## Checklist de testes

### Autenticação e isolamento

- entrar com usuário válido por e-mail/senha;
- entrar com Google;
- validar consentimento do Google Calendar;
- validar organização atual;
- validar que um usuário não consulta registros de outra organização;
- confirmar que nenhuma service role ou token Google é enviado ao browser.

### Leads e pipeline

- criar lead manualmente;
- importar CSV/XLSX;
- mover pelas etapas do pipeline;
- marcar como `Fechado` e confirmar criação/atualização automática do cliente;
- validar atividades e follow-up.

### Clientes

- criar/editar cliente;
- preencher nome fantasia, razão social, CPF/CNPJ, responsável, telefone, WhatsApp, e-mail, endereço e observações;
- validar vínculo com lead de origem.

### Serviços

- abrir `/configuracoes/servicos`;
- conferir catálogo inicial;
- editar preço-base e modelo de preço;
- confirmar persistência no Supabase.

### Propostas

- abrir `/propostas`;
- criar proposta vinculada a um cliente;
- alterar status, validade, desconto e condição de pagamento;
- confirmar total persistido no banco.

### Contratos

- abrir `/contratos`;
- criar contrato vinculado a cliente e, opcionalmente, proposta;
- alterar status entre rascunho, enviado, assinado, vigente e encerrado;
- registrar URL do documento/assinatura quando existir.

### Projetos

- criar projeto para um cliente;
- testar todos os novos status;
- registrar descrição, escopo, datas, valor, preview, produção e repositório;
- editar projeto existente migrado dos status antigos.

### Tarefas e agenda

- criar tarefa para lead, cliente ou projeto;
- definir responsável, prioridade e prazo;
- concluir e cancelar tarefas;
- conectar o Google Agenda;
- confirmar que eventos do Google aparecem no Hub;
- criar uma tarefa e confirmar criação do evento correspondente no Google Calendar;
- validar visualização na agenda e em `/tarefas`.

### Financeiro

- criar item pendente em `/financeiro/a-receber`;
- registrar item pago em `/financeiro/recebidos`;
- conferir indicadores em `/financeiro`;
- validar valores faturado, recebido, a receber, atrasado e receita recorrente.

### LYNK Care

- criar assinatura em `/lynk-care` ou `/financeiro/recorrencias`;
- vincular cliente/projeto;
- registrar valor mensal, horas incluídas/usadas e dia de cobrança.

### Documentos

- criar registro em `/documentos`;
- validar tipo e URL do arquivo;
- para armazenamento no Supabase Storage, manter bucket/policies privados por organização antes de habilitar upload direto.

## Validação de código

Em uma máquina com Node e dependências instaladas:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

Observação: o script `lint` atual do projeto usa `next lint`. Se a versão instalada do Next não oferecer mais esse comando, ajuste o script para executar ESLint diretamente antes de considerar a validação concluída.

## Publicação na Vercel

1. Faça push da branch `feat/lynk-hub`.
2. Gere um Preview Deployment da branch.
3. Cadastre as variáveis Supabase, Google OAuth e `NEXT_PUBLIC_APP_URL` no ambiente Preview.
4. Execute as migrations `005_lynk_hub.sql` e `006_google_calendar.sql` no banco de teste/preview.
5. Configure o Google provider e as URLs de redirect no Supabase.
6. Rode o checklist acima.
7. Corrija qualquer erro de typecheck/build antes do merge.
8. Faça merge do PR somente após a validação.
9. Aplique as migrations no Supabase de produção.
10. Promova/deploy a `main` na Vercel.
11. Faça smoke test de login Google, Agenda, leads, clientes, propostas, projetos e financeiro em produção.

## Legado

As rotas/códigos de Stripe, prospecção automática, IA, WhatsApp e e-mail externo não foram apagados de forma destrutiva nesta etapa. Eles foram retirados da experiência principal e deixados isolados para uma limpeza posterior, depois de confirmar que não existem usos necessários em produção.
