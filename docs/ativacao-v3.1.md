# Ativação da v3.1 (versão enxuta) — passo a passo

Ordem importante: **banco primeiro, código depois**. O código novo grava colunas que só existem após a migração 005.

Tempo estimado: 15–20 minutos.

---

## Passo 0 — Antes de começar (2 min)

1. No Supabase, abra **Database → Backups** e confirme que existe um backup recente (ou baixe um).
2. Tenha em mãos o acesso ao GitHub do repositório `lynk-prospect` e à Vercel.

> Conferência feita em 16/11/2026 (somente leitura) no projeto `lynk-prospect`:
> - as colunas `suggested_service` e `whatsapp_confirmed` ainda não existem;
> - o backfill **não altera nenhum lead atual** (o único lead tem o campo WhatsApp vazio);
> - a tabela `tasks` de produção tem colunas extras (`assigned_to`, `type`, `google_event_id`…) e o gatilho `assign_organization`; todos são compatíveis com a v3.1.

## Passo 1 — Aplicar a migração 005 no Supabase (3 min)

1. Supabase → seu projeto → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de `supabase/migrations/005_lean_prospect.sql`.
3. Clique em **Run**. Deve aparecer “Success. No rows returned”.
4. Confira com esta consulta:

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'leads'
  and column_name in ('suggested_service', 'whatsapp_confirmed');
```

Devem aparecer as duas colunas. Se rodar a migração duas vezes por engano, não há problema.

## Passo 1b — Migração 006 e chave da SerpApi (v3.2, 5 min)

1. No **SQL Editor**, rode `supabase/migrations/006_lead_finder.sql`. Ela é aditiva e pode rodar mais de uma vez.
2. Na Vercel → **Settings → Environment Variables**, cadastre `SERPAPI_API_KEY` com a mesma chave usada no Lynk CRM. Opcional: `SERPAPI_ENGINE=bing`.
3. Confirme que `SUPABASE_SERVICE_ROLE_KEY` está cadastrada. Ela é usada para devolver os créditos não usados de cada busca.

## Passo 2 — Enviar o código para o GitHub (5 min)

Na pasta do projeto (substitua o conteúdo do repositório pelo desta versão, mantendo a pasta `.git`):

```bash
git checkout -b lynk-v3.1-enxuta
```

```bash
git add -A
```

```bash
git commit -m "feat: versão enxuta v3.1 (Leads, Pipeline e Agenda)"
```

```bash
git push -u origin lynk-v3.1-enxuta
```

A Vercel cria um **Preview** dessa branch automaticamente.

## Passo 3 — Testar no Preview da Vercel (5 min)

> O Preview usa o mesmo banco de produção se as variáveis forem as mesmas. Use um lead de teste e exclua no final.

1. Abra a URL de Preview → faça login → deve abrir em **Leads**.
2. Confira o menu: só Leads, Pipeline e Agenda; Conta/Sair no avatar.
3. **Novo lead** → só “Empresa: TESTE v3.1” e um telefone → salvar. Na ficha **não** deve aparecer “Abrir WhatsApp”.
4. **Editar** → preencha WhatsApp e marque **WhatsApp confirmado** → salvar. Agora aparece **Abrir WhatsApp**; edite a mensagem e clique: a conversa abre com o texto editado e a etapa continua **Novo**.
5. **Marcar como contatado** → etapa vira **Contatado**.
6. **Próximo retorno** → escolha hoje → **Agendar**. Abra **Agenda**: o lead aparece em **Hoje**; clicar no nome abre a ficha.
7. **Pipeline** → mude a etapa pelo seletor do card ou arrastando. Troque “Cards por coluna” para 10 e use “Mostrar mais”.
7b. Em **Leads**, troque “Por página” para 10, 50 e 100 e avance as páginas. Role a página para baixo e abra **Novo lead**: o formulário deve aparecer inteiro, com “Criar lead” visível.
7c. Em **Buscar**, faça uma busca pequena (10) de "Assistente de IA" no seu nicho e cidade, e outra de "Loja no ML". Abra uma ficha: confira link da loja, anúncios, telefone e o botão "Abrir WhatsApp (a confirmar)" para celular.
7d. Na lista de Leads, clique nos três pontinhos de uma linha: o menu deve aparecer inteiro.
8. Importe uma planilha que já foi importada antes: a mensagem deve dizer “X já existentes preservados sem alteração”.
9. Exclua o lead “TESTE v3.1” (menu “…” na lista).

## Passo 4 — Publicar em produção (2 min)

Se tudo funcionou no Preview, abra um Pull Request de `lynk-v3.1-enxuta` para `main` no GitHub e faça o merge (ou `git checkout main && git merge lynk-v3.1-enxuta && git push`). A Vercel publica automaticamente.

Não há variáveis de ambiente novas.

## Passo 5 — Depois de publicar

- Para leads antigos cujo número você já sabe que é WhatsApp, abra a ficha → **Editar** → marque **WhatsApp confirmado**. Leads com link `wa.me` em “Link oficial de contato” já mostram o botão.
- Planilhas novas: use as colunas “WhatsApp confirmado”, “Serviço sugerido”, “Sinal observado” e “Oportunidade comercial” (baixe o modelo no rodapé da lista de Leads).

## Se algo der errado

- **Voltar o código:** na Vercel → **Deployments** → deploy anterior → **Promote to Production**. O código antigo funciona normalmente com as colunas novas (ele simplesmente não as usa).
- **Remover a migração** (só se realmente necessário; apaga apenas serviço sugerido e WhatsApp confirmado):

```sql
alter table public.leads drop constraint if exists leads_suggested_service_check;
alter table public.leads drop column if exists suggested_service;
alter table public.leads drop column if exists whatsapp_confirmed;
drop index if exists public.tasks_lead_pending_idx;
```
