# LYNK Prospect v3.1 (versão enxuta)

Foco: organizar leads para vender Site, IA para WhatsApp, Logística, Estoque e outros serviços. A pesquisa é feita fora do sistema. No Lynk você importa ou cadastra, revisa a abordagem e acompanha a negociação.

## O que mudou

### Navegação
- O menu principal mostra só **Leads**, **Pipeline** e **Agenda**. No celular, a barra inferior tem as mesmas três áreas.
- Depois do login, o app abre em **/leads**. Isso também vale para `/`, para o link do e-mail de confirmação e para a redefinição de senha.
- **Conta** e **Sair** ficam num menu discreto no avatar, no canto superior direito.
- Dashboard, Clientes, Projetos, Prompts, Relatórios, Planos e Prospecção automática saíram do menu. Código, rotas, APIs e dados continuam intactos e podem ser abertos pela URL (ex.: `/dashboard`). Limites de plano, a sincronização de lead fechado com Clientes e os gatilhos do banco continuam iguais. Para reativar um módulo, acrescente o link em `components/layout/navigation.ts`.

### Leads
- A lista mostra empresa, cidade/UF, serviço sugerido, etapa e próximo retorno. Retornos atrasados aparecem em vermelho e os de hoje em amarelo. No celular, a lista vira cartões.
- A busca encontra empresa, cidade ou contato (nome, telefone, WhatsApp e e-mail). Os filtros são por etapa e por serviço, incluindo "Sem serviço".
- **Ficha do lead** (`/leads?lead=<id>`; a Agenda e o Pipeline abrem a ficha direto):
  - Empresa, segmento, cidade/UF e contato.
  - Telefone comercial, e-mail, site, WhatsApp (confirmado ou não) e link oficial de contato.
  - Serviço sugerido, sinal observado, oportunidade comercial e fonte pública.
  - Mensagem personalizada editável, com Copiar e Salvar.
  - Notas de acompanhamento editáveis.
  - Etapa e próximo retorno: agendar, reagendar, concluir ou remover.
- **Cadastro manual**: só o nome da empresa é obrigatório. Um cadastro duplicado (mesmo telefone/WhatsApp, ou mesmo nome e cidade) é recusado com uma mensagem clara, e o lead existente fica como está.
- **Importação XLSX/CSV**: o importador atual foi mantido. Ele continua achando a aba pelos cabeçalhos **"Negócio"** ou **"Empresa"**, mesmo que ela não seja a primeira, e usa a mesma chave de deduplicação de antes. Um lead já cadastrado **não é sobrescrito**: etapa, mensagem e notas ficam preservadas.
  - Colunas novas aceitas: "Serviço sugerido", "WhatsApp confirmado", "Sinal observado", "Oportunidade comercial", "Etapa" ("Contatado", "Em conversa"...) e "Notas".
  - **A importação não envia mais mensagens automaticamente.** A chamada a `/api/whatsapp/send-batch` foi removida da tela. A rota continua existindo.
- Os botões "Enviar via API" e "Enviar e-mail" saíram da lista. O envio agora é manual. As rotas `/api/whatsapp/send` e `/api/email/send` continuam no projeto.

### Campos (reaproveitados quando a finalidade é a mesma)
| Na tela | Coluna no banco |
|---|---|
| Sinal observado | `differentiators` (antes "Diferenciais observados") |
| Oportunidade comercial | `landing_page_opportunity` |
| Fonte pública | `public_source` |
| Link oficial de contato | `contact_link` |
| Mensagem personalizada | `message` |
| Notas de acompanhamento | `observations` |
| Próximo retorno | tarefa pendente em `tasks` com `lead_id` (aparece também na Agenda) |
| Serviço sugerido | **nova** `suggested_service` |
| WhatsApp confirmado | **nova** `whatsapp_confirmed` |

### WhatsApp
- **"Abrir WhatsApp"** só aparece quando há um número marcado como **WhatsApp confirmado** ou um **link oficial** (`wa.me`, `api.whatsapp.com`, `web.whatsapp.com`). Telefone comum não libera o botão.
- O importador **não copia mais o telefone para o campo WhatsApp**. O WhatsApp só é confirmado pela coluna "WhatsApp confirmado" (com o número ou com "Sim"). Uma coluna "WhatsApp" sem confirmação grava o número como não confirmado.
- O link usa o **texto que está na ficha naquele momento**, mesmo que você tenha acabado de editar. A mensagem editada também é salva.
- Abrir a conversa **não muda a etapa**. **"Marcar como contatado"** é uma ação separada: registra a data do contato e move de Novo para Contatado. Se o lead já estiver em etapa mais avançada, a etapa fica como está.
- Se o link oficial não aceitar texto (ex.: `wa.me/message/...`), a mensagem é copiada para você colar na conversa.

### Pipeline e etapas
- Foram usados os status que já existem no banco (restrição `leads_status_check`). Só os rótulos mudaram:

| Etapa exibida | Status gravado |
|---|---|
| Novo | `Novo` |
| Contatado | `Contato enviado` |
| Em conversa | `Respondeu` (agrupa também `Reunião marcada`) |
| Proposta enviada | `Proposta enviada` (agrupa também `Negociação`) |
| Fechado | `Fechado` |
| Perdido | `Perdido` |

- Leads em `Reunião marcada` ou `Negociação` **mantêm o status original** e aparecem como "Em conversa · Reunião marcada" ou "Proposta enviada · Negociação". Esse status só muda quando você escolhe outra etapa.
- No Pipeline, a etapa muda arrastando o card (pela alça) ou pelo seletor do próprio card, o que funciona bem no celular. Clicar no nome abre a ficha.

### Agenda
- No topo, três blocos: **Atrasados**, **Hoje** e **Próximos**, com os retornos pendentes. Cada item mostra a etapa e o serviço, abre a ficha da empresa e tem os botões **Concluir** e **Adiar para amanhã**.
- O calendário atual (mês/semana/dia) continua logo abaixo. As tarefas ligadas a um lead abrem a ficha.

### Outros
- `next.config.ts`: **só em desenvolvimento**, a CSP aceita a origem do `NEXT_PUBLIC_SUPABASE_URL` quando ela não é `*.supabase.co`. Isso permite usar `supabase start` ou outro Supabase local. Em produção, a política continua idêntica.
- `scripts/test-lean-flow.ts` (`npm run test:lean`): testes automáticos do importador, do WhatsApp e das etapas.
- Nenhuma dependência nova.

## Migração do banco (obrigatória antes do deploy)

Arquivo: `supabase/migrations/005_lean_prospect.sql`. É **aditiva** e pode rodar mais de uma vez:
1. Adiciona `leads.suggested_service` (texto, com uma restrição que aceita só Site, IA para WhatsApp, Logística, Estoque ou Outro).
2. Adiciona `leads.whatsapp_confirmed` (booleano, padrão `false`).
3. Faz um backfill conservador: marca como confirmado **apenas** o WhatsApp que foi digitado diferente do telefone, fora de importações de planilha e da prospecção automática. As cópias do telefone feitas pelo importador antigo ficam como não confirmadas. Etapa e outros campos não são alterados.
4. Cria um índice parcial em `tasks` para os retornos pendentes.

Como aplicar:
1. Supabase → **SQL Editor** → cole o conteúdo de `005_lean_prospect.sql` → **Run**.
2. Confira: `select count(*) filter (where whatsapp_confirmed) as confirmados, count(*) from public.leads;`
3. Só depois publique o código novo. O código novo grava as colunas novas, então a importação e o cadastro falham se a migração não tiver sido aplicada.

Para voltar atrás (se precisar), as colunas podem ser removidas sem afetar o resto:
```sql
alter table public.leads drop constraint if exists leads_suggested_service_check;
alter table public.leads drop column if exists suggested_service;
alter table public.leads drop column if exists whatsapp_confirmed;
drop index if exists public.tasks_lead_pending_idx;
```

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000 → login → /leads
```

Verificações:
```bash
npm run typecheck
npm run lint
npm run test:lean
npm run build
```

> Recomendação: aponte o `.env.local` para um projeto Supabase de teste (ou `supabase start`) com o schema e as migrações 002 a 005 aplicados, e não para o banco de produção.
