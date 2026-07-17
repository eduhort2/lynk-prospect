-- LYNK Prospect v1.1
-- Execute este arquivo inteiro no SQL Editor de um projeto Supabase novo.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar text,
  role text not null default 'seller' check (role in ('admin', 'manager', 'seller', 'developer')),
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'seller' check (role in ('admin', 'manager', 'seller', 'developer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_external_id text,
  import_key text,
  company_name text not null,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  segment text,
  city text,
  state varchar(2),
  neighborhood text,
  instagram text,
  website text,
  website_status text,
  has_website boolean not null default false,
  source text,
  priority text not null default 'Média' check (priority in ('Baixa', 'Média', 'Alta')),
  status text not null default 'Novo' check (status in ('Novo', 'Contato enviado', 'Respondeu', 'Reunião marcada', 'Proposta enviada', 'Negociação', 'Fechado', 'Perdido')),
  responsible_user uuid references public.profiles(id) on delete set null,
  message text,
  prompt text,
  differentiators text,
  landing_page_opportunity text,
  contact_link text,
  best_contact_day text,
  best_contact_time text,
  contact_time_reason text,
  public_source text,
  image_source text,
  prospecting_status text default 'Não contatado',
  contacted_at timestamptz,
  response text,
  offered_value numeric(12,2),
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_organization_import_key_key unique (organization_id, import_key)
);

-- Compatibilidade com instalações iniciadas em versões anteriores.
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

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'concluído', 'cancelado')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  company_name text not null,
  contact_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  unique (organization_id, lead_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  category text,
  status text not null default 'Briefing' check (status in ('Briefing', 'Produção', 'Aprovação', 'Publicado')),
  briefing text,
  preview_url text,
  production_url text,
  repository_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  prompt text not null,
  structure jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists landing_templates_global_name_idx
  on public.landing_templates(name) where organization_id is null;

create table if not exists public.generated_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  prompt text not null,
  html text,
  css text,
  javascript text,
  status text not null default 'queued' check (status in ('queued', 'generating', 'generated', 'approved', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  provider text not null check (provider in ('netlify', 'vercel')),
  url text,
  domain text,
  status text not null default 'queued' check (status in ('queued', 'building', 'ready', 'failed')),
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  message text not null,
  template text,
  status text not null default 'draft' check (status in ('draft', 'queued', 'sent', 'delivered', 'read', 'failed', 'received')),
  external_id text,
  sent_at timestamptz,
  response_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  segment text not null,
  city text,
  objective text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_organization_status_idx on public.leads(organization_id, status);
create index if not exists leads_responsible_idx on public.leads(responsible_user);
create index if not exists leads_created_at_idx on public.leads(organization_id, created_at desc);
create index if not exists activities_lead_idx on public.activities(lead_id, created_at desc);
create index if not exists tasks_schedule_idx on public.tasks(organization_id, scheduled_at);
create index if not exists clients_organization_idx on public.clients(organization_id);
create index if not exists projects_organization_status_idx on public.projects(organization_id, status);
create index if not exists prompt_generations_organization_idx on public.prompt_generations(organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
for each row execute procedure public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_uuid uuid;
  display_name text;
  organization_slug text;
begin
  display_name := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
  organization_slug := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g') || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.profiles (id, name, email, role)
  values (new.id, display_name, coalesce(new.email, ''), 'admin')
  on conflict (id) do update set name = excluded.name, email = excluded.email;

  insert into public.organizations (name, slug)
  values ('LYNK', organization_slug)
  returning id into organization_uuid;

  insert into public.organization_members (organization_id, user_id, role)
  values (organization_uuid, new.id, 'admin');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create or replace function public.log_lead_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  actor := coalesce(auth.uid(), new.responsible_user);
  if actor is null then return new; end if;

  if tg_op = 'INSERT' then
    insert into public.activities (organization_id, lead_id, user_id, type, description)
    values (new.organization_id, new.id, actor, 'created', 'Lead criado');
  elsif new.status is distinct from old.status then
    insert into public.activities (organization_id, lead_id, user_id, type, description)
    values (new.organization_id, new.id, actor, 'status_changed', 'Status alterado de ' || old.status || ' para ' || new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists lead_activity_trigger on public.leads;
create trigger lead_activity_trigger
  after insert or update on public.leads
  for each row execute procedure public.log_lead_activity();

create or replace function public.sync_closed_lead_to_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Fechado' then
    insert into public.clients (organization_id, lead_id, company_name, contact_name, phone, email)
    values (new.organization_id, new.id, new.company_name, new.contact_name, coalesce(new.whatsapp, new.phone), new.email)
    on conflict (organization_id, lead_id) do update set
      company_name = excluded.company_name,
      contact_name = excluded.contact_name,
      phone = excluded.phone,
      email = excluded.email;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_closed_lead_trigger on public.leads;
create trigger sync_closed_lead_trigger
  after insert or update of status, company_name, contact_name, phone, whatsapp, email on public.leads
  for each row execute procedure public.sync_closed_lead_to_client();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.landing_templates enable row level security;
alter table public.generated_pages enable row level security;
alter table public.deployments enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.prompt_generations enable row level security;

drop policy if exists "profiles_select_team" on public.profiles;
create policy "profiles_select_team" on public.profiles for select to authenticated
using (
  id = auth.uid() or exists (
    select 1 from public.organization_members target
    where target.user_id = profiles.id and public.is_org_member(target.organization_id)
  )
);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member" on public.organizations for select to authenticated using (public.is_org_member(id));
drop policy if exists "organizations_update_manager" on public.organizations;
create policy "organizations_update_manager" on public.organizations for update to authenticated using (public.has_org_role(id, array['admin','manager'])) with check (public.has_org_role(id, array['admin','manager']));

drop policy if exists "members_select_member" on public.organization_members;
create policy "members_select_member" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists "members_insert_admin" on public.organization_members;
create policy "members_insert_admin" on public.organization_members for insert to authenticated with check (public.has_org_role(organization_id, array['admin']));
drop policy if exists "members_update_admin" on public.organization_members;
create policy "members_update_admin" on public.organization_members for update to authenticated using (public.has_org_role(organization_id, array['admin'])) with check (public.has_org_role(organization_id, array['admin']));
drop policy if exists "members_delete_admin" on public.organization_members;
create policy "members_delete_admin" on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, array['admin']) and user_id <> auth.uid());

drop policy if exists "leads_member_all" on public.leads;
create policy "leads_member_all" on public.leads for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "activities_member_all" on public.activities;
create policy "activities_member_all" on public.activities for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "tasks_member_all" on public.tasks;
create policy "tasks_member_all" on public.tasks for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "clients_member_all" on public.clients;
create policy "clients_member_all" on public.clients for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "projects_member_all" on public.projects;
create policy "projects_member_all" on public.projects for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists "templates_member_select" on public.landing_templates;
create policy "templates_member_select" on public.landing_templates for select to authenticated using (organization_id is null or public.is_org_member(organization_id));
drop policy if exists "templates_manager_write" on public.landing_templates;
create policy "templates_manager_write" on public.landing_templates for all to authenticated using (organization_id is not null and public.has_org_role(organization_id, array['admin','manager','developer'])) with check (organization_id is not null and public.has_org_role(organization_id, array['admin','manager','developer']));

drop policy if exists "generated_pages_member_all" on public.generated_pages;
create policy "generated_pages_member_all" on public.generated_pages for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "deployments_member_all" on public.deployments;
create policy "deployments_member_all" on public.deployments for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "whatsapp_member_all" on public.whatsapp_messages;
create policy "whatsapp_member_all" on public.whatsapp_messages for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "prompt_generations_member_all" on public.prompt_generations;
create policy "prompt_generations_member_all" on public.prompt_generations for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

insert into public.landing_templates (name, category, prompt, structure)
values
  ('Restaurante', 'Restaurante', 'Landing page para restaurante com cardápio, galeria, localização e reserva.', '{"sections":["hero","about","menu","gallery","reviews","location","cta"]}'::jsonb),
  ('Clínica', 'Clínica', 'Landing page para clínica com especialidades, equipe, estrutura e agendamento.', '{"sections":["hero","specialties","team","structure","faq","location","cta"]}'::jsonb),
  ('Academia', 'Academia', 'Landing page para academia com modalidades, estrutura, horários e aula experimental.', '{"sections":["hero","modalities","structure","plans","testimonials","location","cta"]}'::jsonb),
  ('Barbearia', 'Barbearia', 'Landing page para barbearia com serviços, profissionais, galeria e agendamento.', '{"sections":["hero","services","team","gallery","reviews","location","cta"]}'::jsonb),
  ('Autopeças', 'Autopeças', 'Landing page para autopeças com categorias, diferenciais, atendimento e orçamento.', '{"sections":["hero","categories","benefits","brands","location","cta"]}'::jsonb),
  ('Advocacia', 'Advocacia', 'Landing page institucional para advocacia, respeitando as normas aplicáveis.', '{"sections":["hero","areas","about","team","faq","contact"]}'::jsonb)
on conflict do nothing;
