-- LYNK Prospect v1.1
-- Execute somente se o schema da v1.0 já foi instalado.

alter table public.leads add column if not exists source_external_id text;
alter table public.leads add column if not exists import_key text;
alter table public.leads add column if not exists neighborhood text;
alter table public.leads add column if not exists website_status text;
alter table public.leads add column if not exists differentiators text;
alter table public.leads add column if not exists landing_page_opportunity text;
alter table public.leads add column if not exists contact_link text;
alter table public.leads add column if not exists best_contact_day text;
alter table public.leads add column if not exists best_contact_time text;
alter table public.leads add column if not exists contact_time_reason text;
alter table public.leads add column if not exists public_source text;
alter table public.leads add column if not exists image_source text;
alter table public.leads add column if not exists prospecting_status text default 'Não contatado';
alter table public.leads add column if not exists contacted_at timestamptz;
alter table public.leads add column if not exists response text;
alter table public.leads add column if not exists offered_value numeric(12,2);
alter table public.leads add column if not exists observations text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_organization_import_key_key'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_organization_import_key_key unique (organization_id, import_key);
  end if;
end $$;
