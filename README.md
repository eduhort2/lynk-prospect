# LYNK Prospect v3.0

CRM de prospecção, pipeline comercial e gerenciamento de landing pages desenvolvido pela LYNK.

## Produto

- Autenticação por e-mail e senha, recuperação de senha e criação do primeiro acesso.
- Isolamento multiempresa com organizações, membros, papéis e Row Level Security.
- Dashboard com indicadores, evolução semanal, funil e desempenho por usuário.
- CRM de leads com busca, filtros, cadastro, edição, exclusão e importação XLSX/CSV.
- Leitura automática da planilha diária de prospecção, mesmo quando os leads não estão na primeira aba.
- Importação dos 23 campos da abordagem, com mensagem, link de contato, melhor horário, fontes, prompt e valor.
- Bloqueio de duplicidades entre importações por Instagram, telefone ou identificação do negócio.
- Pipeline Kanban com drag and drop e registro automático das mudanças de status.
- Agenda com visualização por dia, semana e mês, responsáveis e leads relacionados.
- Clientes sincronizados automaticamente quando um lead é fechado.
- Projetos de landing page com briefing, status e URLs de preview, produção e repositório.
- Criador de prompts com validação, edição, cópia e histórico.
- Relatórios básicos e exportação CSV.
- Perfil, organização e visualização da equipe.
- Geração de prospecção gratuita por nicho e região usando OpenStreetMap/Overpass, com Google Places opcional.
- Envio de primeiro contato por WhatsApp Cloud API somente para leads com consentimento registrado.
- Webhook do WhatsApp que atualiza automaticamente o lead para **Respondeu**.
- E-mail pelo domínio `lynkhq.com.br` via Resend.
- Aprimoramento econômico de prompts com Gemini Flash-Lite e fallback local sem custo.
- Limpeza em lote de todos os leads, restrita a administradores e gestores.
- Exportação da pesquisa no mesmo padrão de 23 colunas da planilha diária.
- Planos Gratuito, Starter, Pro e Business, com limites por organização.
- Checkout, portal de cobrança e webhooks Stripe preparados para produção.
- Créditos mensais, rate limiting, auditoria e bloqueio de recursos por plano.
- Identidade oficial da LYNK e interface redesenhada para uso comercial.

## Stack

Next.js 15, TypeScript, App Router, Tailwind CSS, Lucide, Supabase, TanStack Query, React Hook Form, Zod, Stripe, OpenStreetMap/Overpass, WhatsApp Cloud API, Resend, Gemini, Recharts e dnd-kit.

## Início rápido

1. Leia [docs/instalação.md](docs/instalação.md).
2. Em uma instalação existente, execute [003_commercial_saas.sql](supabase/migrations/003_commercial_saas.sql) e depois [004_lean_integrations.sql](supabase/migrations/004_lean_integrations.sql).
3. Copie `.env.example` para `.env.local` e configure Supabase. A busca gratuita e o gerador local funcionam sem Google Places nem IA.
4. Rode `npm install` e `npm run dev`.

As integrações pagas falham de forma segura quando suas chaves não estão configuradas: nenhum checkout ou consumo externo é iniciado.

## Documentação

- [Instalação local](docs/instalação.md)
- [Deploy na Vercel](docs/deploy.md)
- [Roadmap do produto](docs/roadmap.md)
- [Checklist de ativação comercial](docs/ativacao-v2.md)
- [Integrações econômicas e ativação v3](docs/integracoes-v3.md)
