# Instalação do LYNK Prospect

## Requisitos

- Node.js 20 ou superior.
- Uma conta gratuita no Supabase.
- Um projeto novo no Supabase.

## 1. Instalar as dependências

Abra o terminal dentro da pasta `lynk-prospect` e execute:

```bash
npm install
```

## 2. Configurar o banco no Supabase

No painel do projeto Supabase:

1. Acesse **SQL Editor**.
2. Crie uma nova consulta.
3. Copie todo o conteúdo de `supabase/schema.sql`.
4. Execute a consulta e confirme que ela terminou sem erros.

O script cria tabelas, índices, gatilhos, políticas RLS e os modelos iniciais de landing page. Ele também cria automaticamente um perfil e uma organização quando um usuário se cadastra.

Importante: execute o schema antes de criar o primeiro usuário. Se um usuário já existia antes da execução, exclua-o em **Authentication > Users** e crie o acesso novamente pela tela de login do sistema.

## 3. Configurar a autenticação

Em **Authentication > URL Configuration**:

- Site URL local: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/callback`
- Redirect de recuperação: `http://localhost:3000/auth/callback?next=/reset-password`

Para testar mais rapidamente, é possível desativar temporariamente a confirmação de e-mail em **Authentication > Providers > Email**. Em produção, mantenha a confirmação ativada.

### Atualização da v1.1 para a v2.0 comercial

Depois do schema e da migration 002, execute:

```text
supabase/migrations/003_commercial_saas.sql
```

Essa migração cria planos, assinaturas, créditos, pesquisas, auditoria e limites. Organizações existentes recebem Business como contas fundadoras; novos cadastros começam no Gratuito.

## 4. Configurar as variáveis de ambiente

Em **Project Settings > API**, copie a URL do projeto e a chave pública `anon`.

Crie `.env.local` a partir de `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=

GOOGLE_PLACES_API_KEY=

OPENAI_API_KEY=
WHATSAPP_API_TOKEN=
NETLIFY_TOKEN=
VERCEL_TOKEN=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

A `SUPABASE_SERVICE_ROLE_KEY` é necessária para webhooks, auditoria e ajustes seguros de consumo. Nunca exponha service role, Stripe ou Google Places em variável iniciada por `NEXT_PUBLIC_`.

Enquanto Stripe ou Google Places estiverem vazios, a interface continuará funcionando, mas bloqueará essas operações com uma mensagem de configuração pendente.

## 5. Rodar localmente

```bash
npm run dev
```

Abra `http://localhost:3000`, clique em **Criar conta** e cadastre o primeiro administrador.

## 6. Colocar a equipe na mesma organização

Na v1.0, cada novo cadastro recebe uma organização própria por segurança. Para reunir os usuários na organização principal, faça o seguinte no SQL Editor depois que todos criarem o acesso:

```sql
-- Localize os usuários e organizações
select id, name, email from public.profiles order by created_at;
select id, name, slug from public.organizations order by created_at;

-- Adicione um usuário à organização principal
insert into public.organization_members (organization_id, user_id, role)
values (
  'UUID_DA_ORGANIZACAO_PRINCIPAL',
  'UUID_DO_USUARIO',
  'seller'
)
on conflict (organization_id, user_id) do update set role = excluded.role;

-- Remova o vínculo com a organização pessoal, se desejar
delete from public.organization_members
where organization_id = 'UUID_DA_ORGANIZACAO_PESSOAL'
  and user_id = 'UUID_DO_USUARIO';
```

Papéis aceitos: `admin`, `manager`, `seller` e `developer`.

## 7. Importar leads

Na página **Leads**:

1. Gere ou receba a planilha diária de prospecção.
2. Entre em **Leads**.
3. Clique em **Importar Excel**.
4. Selecione o arquivo XLSX, XLS ou CSV.

O sistema procura automaticamente a aba que contém `Negócio` ou `Empresa`. Na planilha padrão da LYNK, os dados são lidos da aba `100 Leads`, mesmo que a primeira aba seja o `Painel`.

São importados: prioridade, negócio, segmento, bairro, telefone, Instagram, situação do site, diferenciais, oportunidade, mensagem, link de contato, melhor dia e horário, motivo do horário, fontes, prompt, status, data do contato, resposta, valor e observações.

Ao importar o mesmo arquivo ou receber uma empresa repetida em outro dia, o sistema ignora duplicidades por Instagram, telefone ou identificação normalizada do negócio. O status de um lead existente não é sobrescrito.

Depois da importação, abra o menu do lead e escolha **Ver abordagem**. O botão **Abrir e marcar envio** abre o WhatsApp/Instagram e move automaticamente um lead novo para `Contato enviado`.

### Atualização da v1.0 para a v1.1

Se o schema da v1.0 já foi executado, abra o SQL Editor e rode apenas:

```text
supabase/migrations/002_daily_prospecting_import.sql
```

Depois publique o código atualizado. Não execute essa migração antes do schema principal em uma instalação nova.

## Verificações antes de usar

```bash
npm run typecheck
npm run build
```

Se aparecer erro de permissão ao salvar dados, confirme que o usuário está em `organization_members` e que o schema foi executado por completo.
