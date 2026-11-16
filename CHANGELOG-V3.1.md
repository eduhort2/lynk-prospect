# LYNK Prospect v3.1 (versão enxuta)

## Atualização v3.2.1 — busca do ML voltando 0

- **Causa:** em 16/11/2026, o Bing via SerpApi passou a ignorar `site:mercadolivre.com.br/loja` e devolvia páginas sem relação ou nada. As buscas do ML terminavam com 0 encontrados.
- **Correção:** o padrão agora é o **Google**, testado com a chave real e trazendo lojas reais. O Bing fica como reserva automática quando o Google não traz nenhuma loja. `SERPAPI_ENGINE=bing` força o Bing.
- A região não entra mais na pesquisa web do ML, porque o Google a ignora e ela reduzia os resultados. Ela passou a ser usada para achar o contato da loja no Google Maps.
- O link da loja é salvo limpo, sem parâmetros de rastreio, e o "| Loja Oficial" sai do nome.
- **Créditos do plano:** a cobrança agora acontece só depois da busca, pelos leads realmente criados. Não depende mais de `SUPABASE_SERVICE_ROLE_KEY`; antes, sem essa chave, os créditos reservados não eram devolvidos.
- Quando a busca não acha nada, a tela explica o motivo (ex.: "a pesquisa retornou 10 resultados, mas nenhum era loja do ML"). O diagnóstico também fica salvo no histórico da busca.
- O CNPJ e o endereço que aparecem no trecho das páginas do ML são do próprio Mercado Livre (rodapé), não da loja. Por isso não são usados.
- **Teste real (SerpApi verdadeira, banco local):**
  - "autopeças" no ML trouxe Auto Peças Gisela e Blumax, com WhatsApp confirmado pelo site, e Circular Autopeças, com celular provável.
  - "dentista" em Curitiba trouxe 3 clínicas com telefone e site, 2 delas com WhatsApp confirmado.

## Atualização v3.2 — Buscar leads

- **Menu "..." da lista (corrigido):** o menu de cada linha abria dentro da tabela, que cortava o que passava da borda. Agora ele é desenhado por cima da página, na posição do botão, e abre para cima quando falta espaço embaixo. Fecha com clique fora, Esc ou rolagem.
- **Nova área "Buscar"** (Leads · Buscar · Pipeline · Agenda). Você escolhe o serviço (**Site, Loja no ML, Assistente de IA, Logística, Estoque ou Outro**, com campo para especificar), o nicho, a região e a quantidade (10, 20 ou 30).
  - **Empresas locais** (Site, IA, Logística, Estoque, Outro): Google Maps via SerpApi. Traz nome, segmento, bairro, cidade/UF, telefone, site, nota e avaliações e link do Maps. Lê a página inicial do site oficial atrás de WhatsApp (`wa.me`), telefone, e-mail e Instagram. Em "Site" dá para filtrar empresas com ou sem site.
  - **Loja no Mercado Livre:** busca web `site:mercadolivre.com.br/loja <nicho> <região>` via SerpApi, com a mesma lógica do Lynk CRM. Agrupa os anúncios por loja e marca a presença como "confirmada" (página de loja ou perfil, ou selo de Loja oficial) ou "a validar". Traz **link da loja, nicho e quantidade de anúncios** quando o resultado informa; quando não informa, o campo fica "a conferir". O telefone e o WhatsApp vêm do Google Maps, **só quando o nome confere**, e do site oficial.
  - Cada lead já chega com **mensagem personalizada por serviço**, sinal observado, oportunidade comercial, fonte e observações.
  - Duplicados não são criados nem alterados. São cobrados do plano só os leads realmente criados (créditos de prospecção, como antes).
- **WhatsApp:**
  - Link `wa.me` publicado no site da empresa → **WhatsApp confirmado**, com o botão "Abrir WhatsApp".
  - Celular (DDD + 9) sem esse link → **"provável WhatsApp"**: botão "Abrir WhatsApp (a confirmar)" e atalho "Marcar como WhatsApp confirmado". Na lista, o ícone aparece em âmbar.
  - Telefone fixo nunca vira WhatsApp.
- **Ficha e cadastro:** novos campos "Loja no Mercado Livre" (link), "Anúncios no ML", presença e detalhe do serviço ("Outro" / "O que oferecer para a loja"). O importador aceita as colunas "Link da loja", "Anúncios" e "Detalhe do serviço", e o serviço "Mercado Livre".
- **Correção no módulo antigo `/prospeccao`:** ele não cria mais link de WhatsApp a partir de qualquer telefone.
- **Migração `006_lead_finder.sql`** (aditiva): serviço "Loja no Mercado Livre", `suggested_service_detail`, `marketplace_url`, `marketplace_listings`, `marketplace_presence` e `whatsapp_source`.
- **Limites honestos:**
  - A API oficial do Mercado Livre responde 403 a consultas sem autorização e não fornece contato de vendedores. Por isso a busca usa resultados públicos de busca web, e o contato vem de fora do ML.
  - A quantidade de anúncios depende do texto do resultado.
  - Confira os dados antes de abordar.
- Testes: `npm run test:finder` (10 testes, sem rede).

## Atualização v3.1.1

- **Formulários cortados (corrigido):** a animação de entrada das páginas (`.page-transition`) deixava um `transform` aplicado. Com isso, os modais se prendiam à página, e não à tela, e o cabeçalho cobria o topo do formulário; os botões de salvar sumiam. Agora o `Dialog` é renderizado em portal no `<body>`, sempre centralizado na tela. Também fecha com Esc e trava a rolagem do fundo. No celular, abre como painel de baixo para cima, com título e botões sempre visíveis. A correção vale para todos os modais do sistema, inclusive os dos módulos ocultos.
- **10, 50 ou 100 leads por vez:**
  - **Leads:** a lista agora é paginada **no servidor**. Só a página atual sai do banco, e a busca, os filtros e a contagem também rodam no Supabase. Há um seletor "Por página" (10/50/100) e navegação entre páginas.
  - **Pipeline:** cada coluna carrega só os primeiros N cards, com o botão "Mostrar mais (X restantes)". O seletor fica em "Cards por coluna". Os totais das colunas e dos indicadores vêm do banco.
  - **Agenda:** não carrega mais todos os leads. Os dados do lead (nome, etapa e serviço) vêm junto com cada tarefa, e o seletor de lead da tarefa busca só os nomes.
  - A escolha (10/50/100) fica salva no navegador e vale para Leads e Pipeline. O padrão é 50.
  - A ficha aberta por link (`/leads?lead=id`) carrega o lead direto do banco, mesmo que ele não esteja na página atual.
- Observação: a busca agora roda no banco (`ilike`) e diferencia acentos. "Maringá" encontra "maring", mas "maringa" não encontra "Maringá".
- Não há migração nova nesta atualização.

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
