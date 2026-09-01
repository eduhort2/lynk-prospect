-- LYNK Hub · Google Calendar
-- Armazena tokens OAuth apenas para uso server-side via service role.

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

-- Intencionalmente sem policies para authenticated/anon.
-- O browser nunca lê tokens diretamente. Somente rotas server-side usando service role.

drop trigger if exists google_calendar_connections_set_updated_at on public.google_calendar_connections;
create trigger google_calendar_connections_set_updated_at
before update on public.google_calendar_connections
for each row execute procedure public.set_updated_at();

create index if not exists google_calendar_connections_email_idx
  on public.google_calendar_connections(google_email);
