-- LYNK Prospect v3.0: consentimento, WhatsApp, e-mail e limpeza segura.
-- Execute no SQL Editor depois da migration 003.

alter table public.leads add column if not exists whatsapp_opt_in boolean not null default false;
alter table public.leads add column if not exists whatsapp_opt_in_at timestamptz;
alter table public.leads add column if not exists whatsapp_opt_in_source text;
alter table public.leads add column if not exists whatsapp_last_message_id text;
alter table public.leads add column if not exists email_status text;

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  external_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_external_id_idx on public.whatsapp_messages(external_id);
create index if not exists leads_whatsapp_normalized_idx on public.leads ((regexp_replace(coalesce(whatsapp, phone, ''), '\D', '', 'g')));
create index if not exists email_messages_lead_idx on public.email_messages(lead_id, created_at desc);

alter table public.email_messages enable row level security;
drop policy if exists "email_messages_member_all" on public.email_messages;
create policy "email_messages_member_all" on public.email_messages for all to authenticated
using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- Exclusão em lote disponível somente para administradores e gestores.
create or replace function public.clear_organization_leads(target_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if not public.has_org_role(target_organization_id, array['admin','manager']) then
    raise exception 'FORBIDDEN';
  end if;
  delete from public.leads where organization_id = target_organization_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.clear_organization_leads(uuid) from public;
grant execute on function public.clear_organization_leads(uuid) to authenticated;
