-- LYNK Prospect v3.3 — "tem canal de mensagem" (WhatsApp ou Instagram).
-- Migração ADITIVA: cria uma coluna CALCULADA pelo próprio banco a partir dos campos existentes
-- (nada é digitado nela e nenhum dado existente é alterado) e um índice. Idempotente.
--
-- Tem canal quando há pelo menos um:
--  • WhatsApp confirmado com número;
--  • link oficial de WhatsApp ou de Instagram em "Link oficial de contato";
--  • celular brasileiro (DDD + 9 dígitos começando com 9) no WhatsApp ou no telefone (provável WhatsApp);
--  • Instagram preenchido.
-- Telefone fixo sozinho NÃO conta.

alter table public.leads add column if not exists has_message_channel boolean
  generated always as (
    (coalesce(whatsapp_confirmed, false) and length(regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g')) >= 10)
    or coalesce(contact_link, '') ~* '(wa\.me/|whatsapp\.com|instagram\.com/|ig\.me/)'
    or regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') ~ '^(55)?[1-9]{2}9[0-9]{8}$'
    or regexp_replace(coalesce(phone, ''), '\D', '', 'g') ~ '^(55)?[1-9]{2}9[0-9]{8}$'
    or nullif(btrim(coalesce(instagram, '')), '') is not null
  ) stored;

create index if not exists leads_message_channel_idx
  on public.leads (organization_id, has_message_channel, created_at desc);
