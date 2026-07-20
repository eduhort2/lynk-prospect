# Roadmap do LYNK Prospect

## Fase 1 — Operação gratuita

Status: implementada na v1.0.

- Autenticação e recuperação de senha.
- Organizações, equipe e papéis.
- Dashboard comercial.
- CRM de leads e importação Excel/CSV.
- Importação diária completa da planilha padrão de prospecção com deduplicação.
- Pipeline Kanban com histórico de status.
- Agenda diária, semanal e mensal.

## Fase 2 — Produção de landing pages

Status: implementada na v1.0 sem dependências pagas.

- Clientes criados automaticamente após o fechamento.
- Projetos, briefing e etapas de produção.
- Criador determinístico de prompts.
- Histórico de prompts.
- Relatórios básicos e exportação CSV.
- Tabelas preparadas para templates e páginas geradas.

## Fase 3 — Automação e SaaS

Status: fundação comercial implementada na v2.0.

- Planos, limites, créditos e proteção de recursos.
- Stripe Checkout, Customer Portal e webhook assinado.
- Gerador de prospecção com Google Places.
- Exportação XLSX no padrão operacional da LYNK.
- Rate limiting, auditoria e isolamento por organização.
- Novo visual com a identidade oficial da LYNK.

### IA de landing pages

- Provider de IA executado somente no servidor.
- Geração de copy, estrutura, código e imagens.
- Fila assíncrona com tentativas, logs e limites por organização.
- Revisão humana obrigatória antes da publicação.
- Versionamento em `generated_pages`.

### GitHub e deploy

- GitHub App, sem tokens pessoais no cliente.
- Repositório por projeto ou estratégia de monorepo.
- Deploy por Netlify API ou Vercel API.
- Webhooks para atualizar o status de build.
- Domínio, SSL, rollback e histórico em `deployments`.

### WhatsApp oficial

- Meta WhatsApp Cloud API.
- Templates aprovados e opt-in registrado.
- Webhook assinado para entrega, leitura e respostas.
- Fila, rate limit e política de reenvio.
- Histórico em `whatsapp_messages`.
- Não usar automação por navegador.

### Próximos incrementos do produto SaaS

- Convites de equipe e troca de organização.
- Onboarding guiado.
- Painel administrativo da LYNK para suporte e gestão de clientes.
- Painel administrativo interno.
- LGPD: consentimento, retenção, exportação e exclusão de dados.

## Ordem recomendada de investimento

1. Validar custo por lead e ajustar preços/limites.
2. Convites de equipe e painel administrativo da LYNK.
3. WhatsApp Cloud API com templates e opt-in.
4. Fila de geração de landing pages com revisão humana.
5. GitHub App e deploy automático.

Essa ordem reduz risco operacional e mantém uma pessoa responsável pela aprovação antes de qualquer mensagem ou publicação externa.
