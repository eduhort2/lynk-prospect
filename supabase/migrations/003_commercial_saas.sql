-- LYNK Prospect v2.0 — planos, consumo, prospecção e auditoria
-- Execute depois do schema v1.1 e da migration 002.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('free', 'starter', 'pro', 'business')),
  name text not null,
  description text not null,
  price_monthly numeric(12,2) not null default 0 check (price_monthly >= 0),
  max_members integer not null check (max_members > 0),
  max_stored_leads integer not null check (max_stored_leads > 0),
  monthly_prospecting_credits integer not null default 0 check (monthly_prospecting_credits >= 0),
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  metric text not null check (metric in ('prospecting_credit')),
  quantity integer not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.prospecting_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  region text not null,
  niche text not null,
  requested_quantity integer not null check (requested_quantity between 1 and 100),
  generated_quantity integer not null default 0 check (generated_quantity >= 0),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  filters jsonb not null default '{}'::jsonb,
  provider text not null default 'google_places',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.leads add column if not exists prospecting_job_id uuid references public.prospecting_jobs(id) on delete set null;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  bucket_start timestamptz not null,
  hits integer not null default 1 check (hits > 0),
  primary key (organization_id, user_id, action, bucket_start)
);

create index if not exists usage_events_org_metric_date_idx on public.usage_events(organization_id, metric, created_at desc);
create index if not exists prospecting_jobs_org_date_idx on public.prospecting_jobs(organization_id, created_at desc);
create index if not exists leads_prospecting_job_idx on public.leads(prospecting_job_id);
create index if not exists audit_logs_org_date_idx on public.audit_logs(organization_id, created_at desc);
create index if not exists api_rate_limits_expiry_idx on public.api_rate_limits(bucket_start);

insert into public.plans (code, name, description, price_monthly, max_members, max_stored_leads, monthly_prospecting_credits, features)
values
  ('free', 'Gratuito', 'Para organizar uma operação comercial pequena.', 0, 1, 100, 0, '{"crm":true,"pipeline":true,"agenda":true,"spreadsheet_import":true}'::jsonb),
  ('starter', 'Starter', 'Para profissionais que prospectam todas as semanas.', 79, 2, 2000, 300, '{"crm":true,"pipeline":true,"agenda":true,"spreadsheet_import":true,"prospecting":true,"xlsx_export":true,"prompts":true}'::jsonb),
  ('pro', 'Pro', 'Para times comerciais em crescimento.', 179, 5, 10000, 1500, '{"crm":true,"pipeline":true,"agenda":true,"spreadsheet_import":true,"prospecting":true,"xlsx_export":true,"prompts":true,"reports":true,"projects":true}'::jsonb),
  ('business', 'Business', 'Para operações com volume e múltiplos usuários.', 399, 15, 50000, 5000, '{"crm":true,"pipeline":true,"agenda":true,"spreadsheet_import":true,"prospecting":true,"xlsx_export":true,"prompts":true,"reports":true,"projects":true,"audit":true,"priority_support":true}'::jsonb)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  max_members = excluded.max_members,
  max_stored_leads = excluded.max_stored_leads,
  monthly_prospecting_credits = excluded.monthly_prospecting_credits,
  features = excluded.features,
  active = true,
  updated_at = now();

insert into public.subscriptions (organization_id, plan_id, status)
select organizations.id, plans.id, 'active'
from public.organizations cross join public.plans
where plans.code = 'business' -- organizações existentes são preservadas como contas fundadoras
on conflict (organization_id) do nothing;

create or replace function public.assign_free_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (organization_id, plan_id, status)
  select new.id, id, 'active' from public.plans where code = 'free'
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists organization_assign_free_subscription on public.organizations;
create trigger organization_assign_free_subscription
after insert on public.organizations
for each row execute procedure public.assign_free_subscription();

create or replace function public.reserve_prospecting_credits(target_organization_id uuid, requested integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  monthly_limit integer;
  already_used integer;
begin
  if requested < 1 or requested > 100 then raise exception 'INVALID_QUANTITY'; end if;
  if not public.is_org_member(target_organization_id) then raise exception 'FORBIDDEN'; end if;

  perform 1 from public.subscriptions where organization_id = target_organization_id for update;
  select plans.monthly_prospecting_credits into monthly_limit
  from public.subscriptions
  join public.plans on plans.id = subscriptions.plan_id
  where subscriptions.organization_id = target_organization_id
    and subscriptions.status in ('active', 'trialing');

  if monthly_limit is null or monthly_limit = 0 then raise exception 'PLAN_REQUIRED'; end if;

  select coalesce(sum(quantity), 0) into already_used
  from public.usage_events
  where organization_id = target_organization_id
    and metric = 'prospecting_credit'
    and created_at >= date_trunc('month', now());

  if already_used + requested > monthly_limit then raise exception 'QUOTA_EXCEEDED'; end if;

  insert into public.usage_events (organization_id, user_id, metric, quantity, metadata)
  values (target_organization_id, auth.uid(), 'prospecting_credit', requested, jsonb_build_object('state', 'reserved'));
  return monthly_limit - already_used - requested;
end;
$$;

create or replace function public.prospecting_usage(target_organization_id uuid)
returns table (used integer, monthly_limit integer, remaining integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(usage_events.quantity), 0)::integer as used,
    plans.monthly_prospecting_credits as monthly_limit,
    greatest(plans.monthly_prospecting_credits - coalesce(sum(usage_events.quantity), 0), 0)::integer as remaining
  from public.subscriptions
  join public.plans on plans.id = subscriptions.plan_id
  left join public.usage_events on usage_events.organization_id = subscriptions.organization_id
    and usage_events.metric = 'prospecting_credit'
    and usage_events.created_at >= date_trunc('month', now())
  where subscriptions.organization_id = target_organization_id
    and public.is_org_member(target_organization_id)
  group by plans.monthly_prospecting_credits;
$$;

create or replace function public.plan_has_feature(target_organization_id uuid, feature_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((plans.features ->> feature_name)::boolean, false)
  from public.subscriptions
  join public.plans on plans.id = subscriptions.plan_id
  where subscriptions.organization_id = target_organization_id
    and subscriptions.status in ('active', 'trialing')
    and public.is_org_member(target_organization_id);
$$;

create or replace function public.enforce_organization_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed integer;
  existing integer;
begin
  if tg_table_name = 'organization_members' then
    select plans.max_members into allowed from public.subscriptions join public.plans on plans.id = subscriptions.plan_id where subscriptions.organization_id = new.organization_id;
    select count(*) into existing from public.organization_members where organization_id = new.organization_id;
    if existing >= coalesce(allowed, 1) then raise exception 'MEMBER_LIMIT_REACHED'; end if;
  elsif tg_table_name = 'leads' then
    select plans.max_stored_leads into allowed from public.subscriptions join public.plans on plans.id = subscriptions.plan_id where subscriptions.organization_id = new.organization_id;
    select count(*) into existing from public.leads where organization_id = new.organization_id;
    if existing >= coalesce(allowed, 100) then raise exception 'LEAD_LIMIT_REACHED'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_member_plan_limit on public.organization_members;
create trigger enforce_member_plan_limit before insert on public.organization_members for each row execute procedure public.enforce_organization_limits();
drop trigger if exists enforce_lead_plan_limit on public.leads;
create trigger enforce_lead_plan_limit before insert on public.leads for each row execute procedure public.enforce_organization_limits();

create or replace function public.check_api_rate_limit(target_organization_id uuid, requested_action text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_bucket timestamptz;
  current_hits integer;
  request_limit integer;
begin
  if not public.is_org_member(target_organization_id) then raise exception 'FORBIDDEN'; end if;
  request_limit := case requested_action when 'generate_prospecting' then 5 else 30 end;
  current_bucket := to_timestamp(floor(extract(epoch from now()) / 60) * 60);

  insert into public.api_rate_limits (organization_id, user_id, action, bucket_start, hits)
  values (target_organization_id, auth.uid(), requested_action, current_bucket, 1)
  on conflict (organization_id, user_id, action, bucket_start)
  do update set hits = public.api_rate_limits.hits + 1
  returning hits into current_hits;

  if current_hits > request_limit then raise exception 'RATE_LIMITED'; end if;
  return request_limit - current_hits;
end;
$$;

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.prospecting_jobs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_events enable row level security;
alter table public.api_rate_limits enable row level security;

drop policy if exists plans_authenticated_read on public.plans;
create policy plans_authenticated_read on public.plans for select to authenticated using (active);
drop policy if exists subscriptions_member_read on public.subscriptions;
create policy subscriptions_member_read on public.subscriptions for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists usage_member_read on public.usage_events;
create policy usage_member_read on public.usage_events for select to authenticated using (public.is_org_member(organization_id));
drop policy if exists jobs_member_all on public.prospecting_jobs;
create policy jobs_member_all on public.prospecting_jobs for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id) and user_id = auth.uid());
drop policy if exists audit_manager_read on public.audit_logs;
create policy audit_manager_read on public.audit_logs for select to authenticated using (public.has_org_role(organization_id, array['admin','manager']));

revoke all on public.webhook_events from anon, authenticated;
revoke all on public.usage_events from anon;
grant select on public.plans, public.subscriptions, public.usage_events, public.prospecting_jobs to authenticated;
grant insert, update on public.prospecting_jobs to authenticated;
grant execute on function public.reserve_prospecting_credits(uuid, integer) to authenticated;
grant execute on function public.prospecting_usage(uuid) to authenticated;
grant execute on function public.check_api_rate_limit(uuid, text) to authenticated;
grant execute on function public.plan_has_feature(uuid, text) to authenticated;

drop policy if exists "projects_member_all" on public.projects;
drop policy if exists "projects_plan_access" on public.projects;
create policy "projects_plan_access" on public.projects for all to authenticated
using (public.is_org_member(organization_id) and public.plan_has_feature(organization_id, 'projects'))
with check (public.is_org_member(organization_id) and public.plan_has_feature(organization_id, 'projects'));

drop policy if exists "prompt_generations_member_all" on public.prompt_generations;
drop policy if exists "prompt_generations_plan_access" on public.prompt_generations;
create policy "prompt_generations_plan_access" on public.prompt_generations for all to authenticated
using (public.is_org_member(organization_id) and public.plan_has_feature(organization_id, 'prompts'))
with check (public.is_org_member(organization_id) and public.plan_has_feature(organization_id, 'prompts'));

-- Onboarding comercial: cada novo cadastro cria sua própria organização no plano gratuito.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_uuid uuid;
  display_name text;
  company_name text;
  organization_slug text;
begin
  display_name := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
  company_name := coalesce(nullif(new.raw_user_meta_data ->> 'organization_name', ''), display_name);
  organization_slug := regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g') || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.profiles (id, name, email, role)
  values (new.id, display_name, coalesce(new.email, ''), 'admin')
  on conflict (id) do update set name = excluded.name, email = excluded.email;

  insert into public.organizations (name, slug)
  values (company_name, organization_slug)
  returning id into organization_uuid;

  insert into public.organization_members (organization_id, user_id, role)
  values (organization_uuid, new.id, 'admin');
  return new;
end;
$$;
