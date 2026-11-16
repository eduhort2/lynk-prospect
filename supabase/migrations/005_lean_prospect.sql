-- LYNK Prospect v3.1 — versão enxuta (Leads, Pipeline e Agenda).
-- Migração ADITIVA: só acrescenta colunas, uma restrição opcional e um índice.
-- Nenhum dado existente é apagado ou renomeado. Pode ser executada mais de uma vez.
-- Execute no SQL Editor do Supabase depois da migration 004.

-- 1) Serviço sugerido para o lead.
alter table public.leads add column if not exists suggested_service text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_suggested_service_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_suggested_service_check
      check (suggested_service is null or suggested_service in ('Site', 'IA para WhatsApp', 'Logística', 'Estoque', 'Outro'));
  end if;
end $$;

-- 2) WhatsApp confirmado. O importador antigo copiava o telefone para o campo
--    "whatsapp"; a partir desta versão o número só é tratado como WhatsApp
--    quando esta coluna estiver marcada (ou houver um link oficial wa.me).
alter table public.leads add column if not exists whatsapp_confirmed boolean not null default false;

-- Backfill conservador: só marca como confirmado o WhatsApp que foi digitado
-- separadamente do telefone (número diferente), fora de importações de planilha
-- e da prospecção automática. Cópias do telefone feitas pelo importador ficam
-- como "não confirmado". Não altera etapa (status) nem outros campos.
update public.leads
set whatsapp_confirmed = true
where whatsapp_confirmed = false
  and whatsapp is not null
  and length(regexp_replace(whatsapp, '\D', '', 'g')) >= 10
  and regexp_replace(whatsapp, '\D', '', 'g') <> regexp_replace(coalesce(phone, ''), '\D', '', 'g')
  and coalesce(source, '') not ilike 'Planilha%'
  and prospecting_job_id is null;

-- 3) "Próximo retorno" usa a tabela de tarefas existente (tasks.lead_id).
--    Índice para buscar rapidamente os retornos pendentes de cada lead.
create index if not exists tasks_lead_pending_idx
  on public.tasks (organization_id, lead_id, scheduled_at)
  where status = 'pendente';
