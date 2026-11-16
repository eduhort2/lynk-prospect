-- LYNK Prospect v3.2 — busca automática de leads (empresas locais e lojas do Mercado Livre).
-- Migração ADITIVA e idempotente. Execute depois da 005.

-- 1) Novo serviço sugerido: "Loja no Mercado Livre" (amplia a lista permitida).
alter table public.leads drop constraint if exists leads_suggested_service_check;
alter table public.leads
  add constraint leads_suggested_service_check
  check (suggested_service is null or suggested_service in ('Site', 'Loja no Mercado Livre', 'IA para WhatsApp', 'Logística', 'Estoque', 'Outro'));

-- 2) Detalhe quando o serviço é "Outro" (ex.: "Automação de agendamento").
alter table public.leads add column if not exists suggested_service_detail text;

-- 3) Loja no Mercado Livre.
alter table public.leads add column if not exists marketplace_url text;          -- link da loja/perfil no ML
alter table public.leads add column if not exists marketplace_listings integer;  -- quantidade de anúncios (quando disponível)
alter table public.leads add column if not exists marketplace_presence text;     -- 'confirmada' | 'a_validar'

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_marketplace_presence_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_marketplace_presence_check
      check (marketplace_presence is null or marketplace_presence in ('confirmada', 'a_validar'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_marketplace_listings_check' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_marketplace_listings_check
      check (marketplace_listings is null or marketplace_listings >= 0);
  end if;
end $$;

-- 4) De onde veio o número de WhatsApp (ex.: "Link wa.me no site", "Celular no Google Maps").
alter table public.leads add column if not exists whatsapp_source text;
