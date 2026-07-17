# LYNK Prospect v1.1

CRM de prospecção, pipeline comercial e gerenciamento de landing pages desenvolvido pela LYNK.

## O que está pronto na v1.0

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
- Estrutura de banco e contratos TypeScript para IA, WhatsApp e deploy automático na fase futura.

## Stack

Next.js 15, TypeScript, App Router, Tailwind CSS, componentes no padrão shadcn/ui, Lucide, Supabase, TanStack Query, React Hook Form, Zod, Recharts e dnd-kit.

## Início rápido

1. Leia [docs/instalação.md](docs/instalação.md).
2. Execute [supabase/schema.sql](supabase/schema.sql) no Supabase.
3. Copie `.env.example` para `.env.local` e preencha as duas variáveis públicas do Supabase.
4. Rode `npm install` e `npm run dev`.

As chaves de OpenAI, WhatsApp, Netlify e Vercel não são necessárias na v1.1.

Se a v1.0 já estiver instalada, execute também [supabase/migrations/002_daily_prospecting_import.sql](supabase/migrations/002_daily_prospecting_import.sql).

## Documentação

- [Instalação local](docs/instalação.md)
- [Deploy na Vercel](docs/deploy.md)
- [Roadmap do produto](docs/roadmap.md)
