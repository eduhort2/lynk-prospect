-- LYNK Hub v4.0 — evolução segura do LYNK Prospect para gestão interna
-- Execute depois das migrations existentes. Não altera migrations antigas.

create extension if not exists "pgcrypto";

-- Remove bloqueios de plano/crédito da operação interna sem apagar legado.
drop trigger if exists enforce_member_plan_limit on public.organization_members;
drop trigger if exists enforce_lead_plan_limit on public.leads;

drop policy if exists "projects_plan_access" on public.projects;
create policy "projects_member_all" on public.projects for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "prompt_generations_plan_access" on public.prompt_generations;
create policy "prompt_generations_member_all" on public.prompt_generations for all to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

-- Clientes: ficha completa.
alter table public.clients add column if not exists legal_name text;
alter table public.clients add column if not exists tax_id text;
alter table public.clients add column if not exists whatsapp text;
alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists observations text;
alter table public.clients add column if not exists updated_at timestamptz not null default now();

-- Catálogo de serviços.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  price_type text not null default 'fixed' check (price_type in ('fixed','starting_at','monthly','hourly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- Propostas.
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  responsible_user uuid references public.profiles(id) on delete set null,
  proposal_date date not null default current_date,
  valid_until date,
  observations text,
  payment_terms text,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'Rascunho' check (status in ('Rascunho','Enviada','Visualizada','Negociação','Aceita','Recusada','Expirada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (greatest((quantity * unit_price) - discount, 0)) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Contratos.
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  proposal_id uuid references public.proposals(id) on delete set null,
  project_id uuid,
  number text not null,
  status text not null default 'Rascunho' check (status in ('Rascunho','Enviado','Assinado','Vigente','Encerrado','Cancelado')),
  contractor_data text,
  service text,
  scope text,
  value numeric(12,2) not null default 0,
  payment_terms text,
  starts_at date,
  ends_at date,
  document_url text,
  signature_url text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

-- Projetos generalizados.
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.projects add column if not exists proposal_id uuid references public.proposals(id) on delete set null;
alter table public.projects add column if not exists contract_id uuid references public.contracts(id) on delete set null;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists scope text;
alter table public.projects add column if not exists responsible_user uuid references public.profiles(id) on delete set null;
alter table public.projects add column if not exists starts_at date;
alter table public.projects add column if not exists due_date date;
alter table public.projects add column if not exists delivered_at date;
alter table public.projects add column if not exists contracted_value numeric(12,2);
alter table public.projects add column if not exists observations text;
alter table public.projects alter column status set default 'Aguardando kickoff';

update public.projects set status = case status
  when 'Briefing' then 'Planejamento'
  when 'Produção' then 'Desenvolvimento'
  when 'Aprovação' then 'Homologação'
  when 'Publicado' then 'Concluído'
  else status end
where status in ('Briefing','Produção','Aprovação','Publicado');

alter table public.projects add constraint projects_status_check check (status in (
  'Aguardando kickoff','Planejamento','Design','Desenvolvimento','Revisão interna',
  'Aguardando cliente','Homologação','Concluído','Manutenção','Pausado','Cancelado'
));

alter table public.contracts drop constraint if exists contracts_project_id_fkey;
alter table public.contracts add constraint contracts_project_id_fkey foreign key (project_id) references public.projects(id) on delete set null;

-- Tarefas vinculáveis a lead, cliente e projeto.
alter table public.tasks add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.tasks add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.tasks add column if not exists priority text not null default 'Média' check (priority in ('Baixa','Média','Alta'));

-- Financeiro gerencial.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  paid_at date,
  status text not null default 'Pendente' check (status in ('Pendente','Pago','Atrasado','Cancelado')),
  payment_method text,
  observations text,
  recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- LYNK Care.
create table if not exists public.care_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  plan_name text not null,
  monthly_value numeric(12,2) not null default 0,
  included_hours numeric(8,2) not null default 0,
  used_hours numeric(8,2) not null default 0,
  billing_day integer check (billing_day between 1 and 31),
  status text not null default 'Ativo' check (status in ('Ativo','Pausado','Cancelado')),
  started_at date not null default current_date,
  canceled_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documentos.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  type text not null default 'Outro' check (type in ('Proposta','Contrato','Briefing','Comprovante','Entrega','Outro')),
  file_url text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Índices.
create index if not exists services_org_active_idx on public.services(organization_id, active);
create index if not exists proposals_org_status_idx on public.proposals(organization_id, status, created_at desc);
create index if not exists proposal_items_proposal_idx on public.proposal_items(proposal_id, sort_order);
create index if not exists contracts_org_status_idx on public.contracts(organization_id, status, created_at desc);
create index if not exists projects_due_idx on public.projects(organization_id, due_date);
create index if not exists tasks_project_idx on public.tasks(project_id, scheduled_at);
create index if not exists payments_org_status_due_idx on public.payments(organization_id, status, due_date);
create index if not exists care_org_status_idx on public.care_subscriptions(organization_id, status);
create index if not exists documents_client_idx on public.documents(client_id, created_at desc);

-- updated_at.
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute procedure public.set_updated_at();
drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at before update on public.proposals for each row execute procedure public.set_updated_at();
drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at before update on public.contracts for each row execute procedure public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute procedure public.set_updated_at();
drop trigger if exists care_set_updated_at on public.care_subscriptions;
create trigger care_set_updated_at before update on public.care_subscriptions for each row execute procedure public.set_updated_at();

-- Recalcula totais da proposta a partir dos itens.
create or replace function public.refresh_proposal_totals(target_proposal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare item_subtotal numeric(12,2);
begin
  select coalesce(sum(total),0) into item_subtotal from public.proposal_items where proposal_id = target_proposal_id;
  update public.proposals
  set subtotal = item_subtotal, total = greatest(item_subtotal - discount, 0), updated_at = now()
  where id = target_proposal_id;
end; $$;

create or replace function public.proposal_item_totals_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_proposal_totals(coalesce(new.proposal_id, old.proposal_id));
  return coalesce(new, old);
end; $$;

drop trigger if exists proposal_items_refresh_totals on public.proposal_items;
create trigger proposal_items_refresh_totals after insert or update or delete on public.proposal_items
for each row execute procedure public.proposal_item_totals_trigger();

-- Sincroniza dados extras ao converter lead em cliente.
create or replace function public.sync_closed_lead_to_client()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Fechado' then
    insert into public.clients (organization_id, lead_id, company_name, contact_name, phone, whatsapp, email, observations)
    values (new.organization_id, new.id, new.company_name, new.contact_name, new.phone, new.whatsapp, new.email, new.observations)
    on conflict (organization_id, lead_id) do update set
      company_name = excluded.company_name,
      contact_name = excluded.contact_name,
      phone = excluded.phone,
      whatsapp = excluded.whatsapp,
      email = excluded.email,
      observations = excluded.observations,
      updated_at = now();
  end if;
  return new;
end; $$;

-- RLS para novas tabelas.
alter table public.services enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.care_subscriptions enable row level security;
alter table public.documents enable row level security;

do $$
declare t text;
begin
  foreach t in array array['services','proposals','proposal_items','contracts','payments','care_subscriptions','documents'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t || '_member_all', t);
  end loop;
end $$;

-- Catálogo inicial para cada organização existente.
insert into public.services (organization_id, name, base_price, price_type)
select o.id, s.name, s.price, s.price_type
from public.organizations o
cross join (values
  ('Landing Page',1490::numeric,'fixed'),
  ('Site Institucional Essencial',2490,'fixed'),
  ('Site Institucional Pro',3490,'fixed'),
  ('E-commerce Essencial',4990,'fixed'),
  ('E-commerce Integrado',7900,'starting_at'),
  ('Dashboard / Painel Interno',3900,'starting_at'),
  ('Sistema Web MVP',7900,'starting_at'),
  ('Sistema Sob Medida',12900,'starting_at'),
  ('SaaS MVP',14900,'starting_at'),
  ('Automação Essencial',1490,'fixed'),
  ('Integração entre Sistemas',2490,'starting_at'),
  ('Automação Operacional',4900,'starting_at'),
  ('LYNK Care Site',197,'monthly'),
  ('LYNK Care Business',297,'monthly'),
  ('LYNK Care Commerce',497,'monthly'),
  ('LYNK Care System',790,'monthly'),
  ('Hora técnica adicional',180,'hourly'),
  ('Discovery Técnico',590,'fixed')
) as s(name, price, price_type)
on conflict (organization_id, name) do nothing;

-- Novas organizações também recebem catálogo padrão.
create or replace function public.seed_default_services()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.services (organization_id, name, base_price, price_type) values
    (new.id,'Landing Page',1490,'fixed'),
    (new.id,'Site Institucional Essencial',2490,'fixed'),
    (new.id,'Site Institucional Pro',3490,'fixed'),
    (new.id,'E-commerce Essencial',4990,'fixed'),
    (new.id,'E-commerce Integrado',7900,'starting_at'),
    (new.id,'Dashboard / Painel Interno',3900,'starting_at'),
    (new.id,'Sistema Web MVP',7900,'starting_at'),
    (new.id,'Sistema Sob Medida',12900,'starting_at'),
    (new.id,'SaaS MVP',14900,'starting_at'),
    (new.id,'Automação Essencial',1490,'fixed'),
    (new.id,'Integração entre Sistemas',2490,'starting_at'),
    (new.id,'Automação Operacional',4900,'starting_at'),
    (new.id,'LYNK Care Site',197,'monthly'),
    (new.id,'LYNK Care Business',297,'monthly'),
    (new.id,'LYNK Care Commerce',497,'monthly'),
    (new.id,'LYNK Care System',790,'monthly'),
    (new.id,'Hora técnica adicional',180,'hourly'),
    (new.id,'Discovery Técnico',590,'fixed')
  on conflict (organization_id, name) do nothing;
  return new;
end; $$;

drop trigger if exists organization_seed_default_services on public.organizations;
create trigger organization_seed_default_services after insert on public.organizations
for each row execute procedure public.seed_default_services();
