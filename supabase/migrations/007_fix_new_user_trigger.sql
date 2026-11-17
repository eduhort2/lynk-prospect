-- LYNK Prospect v3.2.2 — corrige a criação de usuários.
-- Em produção, public.handle_new_user era uma versão antiga que gravava só (id, email, full_name)
-- e deixava profiles.name (obrigatório) vazio: todo "Criar conta" e todo "Add user" do painel
-- falhavam com "null value in column name of relation profiles".
-- Esta versão segue o comportamento da migration 003: cria o perfil, a empresa do novo usuário
-- (plano Gratuito pelo gatilho de assinatura) e o vínculo como administrador.
-- Não altera usuários, perfis, empresas ou leads existentes. Pode ser executada mais de uma vez.

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
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Usuário'
  );
  company_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''), display_name);
  organization_slug := trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.profiles (id, name, full_name, email, role)
  values (new.id, display_name, display_name, coalesce(new.email, ''), 'admin')
  on conflict (id) do update set name = excluded.name, full_name = coalesce(public.profiles.full_name, excluded.full_name), email = excluded.email;

  -- Usuário que já pertence a uma empresa (ex.: adicionado pelo administrador) não ganha outra.
  if not exists (select 1 from public.organization_members where user_id = new.id) then
    insert into public.organizations (name, slug)
    values (company_name, organization_slug)
    returning id into organization_uuid;

    insert into public.organization_members (organization_id, user_id, role)
    values (organization_uuid, new.id, 'admin');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
