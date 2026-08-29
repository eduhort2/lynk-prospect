# LYNK Hub — migração, testes e publicação

## Objetivo

Esta evolução transforma o LYNK Prospect no sistema interno LYNK Hub sem reconstruir a aplicação e sem alterar migrations antigas já executadas.

## Ordem de atualização

1. Faça backup do banco Supabase antes da migration.
2. Publique/teste primeiro a branch `feat/lynk-hub` em Preview na Vercel.
3. No Supabase do ambiente de teste, execute `supabase/migrations/005_lynk_hub.sql`.
4. Valide autenticação, organização, RLS e os módulos abaixo.
5. Somente depois promova a versão para produção.

## Migration

Arquivo:

```text
supabase/migrations/005_lynk_hub.sql
```

A migration:

- preserva leads, clientes, tarefas e projetos existentes;
- remove os triggers que limitavam membros/leads por plano;
- deixa projetos acessíveis por organização, sem depender de feature de plano;
- expande clientes e projetos;
- expande tarefas para cliente/projeto/prioridade;
- cria `services`, `proposals`, `proposal_items`, `contracts`, `payments`, `care_subscriptions` e `documents`;
- cria índices, triggers de `updated_at` e RLS;
- mantém a conversão de lead fechado em cliente;
- cria o catálogo inicial de serviços por organização.

## Variáveis obrigatórias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` é opcional e somente deve existir no servidor quando alguma rotina administrativa/legada realmente precisar dela. Nunca exponha essa chave no frontend.

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

- entrar com usuário válido;
- validar organização atual;
- validar que um usuário não consulta registros de outra organização;
- confirmar que nenhuma service role é enviada ao browser.

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

1. Faça push da branch `feat/lynk-hub` (já criada no repositório).
2. Gere um Preview Deployment da branch.
3. Cadastre as variáveis Supabase e `NEXT_PUBLIC_APP_URL` no ambiente Preview.
4. Execute a migration `005_lynk_hub.sql` no banco de teste/preview.
5. Rode o checklist acima.
6. Corrija qualquer erro de typecheck/build antes do merge.
7. Faça merge do PR somente após a validação.
8. Aplique a migration no Supabase de produção.
9. Promova/deploy a `main` na Vercel.
10. Faça smoke test de login, leads, clientes, propostas, projetos e financeiro em produção.

## Legado

As rotas/códigos de Stripe, prospecção automática, IA, WhatsApp e e-mail externo não foram apagados de forma destrutiva nesta etapa. Eles foram retirados da experiência principal e deixados isolados para uma limpeza posterior, depois de confirmar que não existem usos necessários em produção.
