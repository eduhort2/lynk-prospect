-- LYNK Prospect v3.4 — assistente de IA no WhatsApp.
-- Migração ADITIVA e idempotente: uma tabela nova de configuração e colunas novas.
-- Nenhum dado existente é alterado.

-- 1) Configuração do assistente (uma linha por empresa).
create table if not exists public.assistant_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,          -- "Responder automaticamente"
  business_description text,                       -- quem você é e o que vende
  offer text,                                      -- serviços e o que entrega
  pricing text,                                    -- faixas de preço ou "não falar preço"
  tone text,                                       -- tom de voz
  handoff_rules text,                              -- quando chamar você
  signature text,                                  -- nome que a IA usa ao se apresentar
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.assistant_settings enable row level security;
drop policy if exists "assistant_settings_member_read" on public.assistant_settings;
create policy "assistant_settings_member_read" on public.assistant_settings for select to authenticated
  using (public.is_org_member(organization_id));
drop policy if exists "assistant_settings_manager_write" on public.assistant_settings;
create policy "assistant_settings_manager_write" on public.assistant_settings for all to authenticated
  using (public.has_org_role(organization_id, array['admin','manager']))
  with check (public.has_org_role(organization_id, array['admin','manager']));
grant select, insert, update on public.assistant_settings to authenticated;

-- 2) Estado do assistente em cada lead.
alter table public.leads add column if not exists ai_paused boolean not null default false;  -- você pausou a IA neste lead
alter table public.leads add column if not exists ai_handoff_reason text;                    -- por que a IA te chamou
alter table public.leads add column if not exists ai_handoff_at timestamptz;                 -- quando (null = não precisa de você)
alter table public.leads add column if not exists last_inbound_at timestamptz;               -- última mensagem do lead (janela de 24 h)

-- 3) Direção e autor das mensagens do WhatsApp.
alter table public.whatsapp_messages add column if not exists direction text not null default 'in';
alter table public.whatsapp_messages add column if not exists author text;
-- Já existe em produção; criada aqui para instalações novas (não altera a existente).
alter table public.whatsapp_messages add column if not exists message_type text not null default 'text';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'whatsapp_messages_direction_check' and conrelid = 'public.whatsapp_messages'::regclass) then
    alter table public.whatsapp_messages add constraint whatsapp_messages_direction_check check (direction in ('in', 'out'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'whatsapp_messages_author_check' and conrelid = 'public.whatsapp_messages'::regclass) then
    alter table public.whatsapp_messages add constraint whatsapp_messages_author_check check (author is null or author in ('lead', 'ai', 'human'));
  end if;
end $$;

-- A Meta pode reenviar o mesmo evento: a mesma mensagem não é gravada duas vezes.
create unique index if not exists whatsapp_messages_org_external_uidx
  on public.whatsapp_messages (organization_id, external_id) where external_id is not null;
create index if not exists whatsapp_messages_lead_created_idx
  on public.whatsapp_messages (lead_id, created_at);
create index if not exists leads_ai_handoff_idx
  on public.leads (organization_id, ai_handoff_at) where ai_handoff_at is not null;
