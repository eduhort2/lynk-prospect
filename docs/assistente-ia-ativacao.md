# Assistente de IA no WhatsApp — passo a passo de ativação

O assistente responde sozinho os leads que **respondem** às suas mensagens de prospecção, move a etapa no Pipeline, agenda retornos e te chama quando o lead pede proposta, preço fechado ou reunião.

Você continua prospectando pelo celular, com o botão "Abrir WhatsApp" do Lynk. O assistente entra **depois que o lead responde**.

Tempo total: de 1 a 3 dias. A maior parte é a aprovação da Meta.

---

## Etapa 1 — Deixar o número pronto (15 min)

1. O número de prospecção precisa estar no app **WhatsApp Business**, não no WhatsApp pessoal.
   - Se hoje está no pessoal: faça backup das conversas, instale o **WhatsApp Business** e entre com o mesmo número. Ele aproveita o backup.
2. Atualize o WhatsApp Business para a versão mais recente na loja de apps.
3. Crie uma **página do Facebook** da empresa, se ainda não tiver.
4. No WhatsApp Business: **Configurações → Ferramentas comerciais → Facebook e Instagram**, e conecte a página.
5. Use o número normalmente por alguns dias, se ele for novo. A Meta recusa números sem histórico ou com restrições.

## Etapa 2 — Conectar o número à API oficial com "coexistência" (1 a 3 dias)

A coexistência mantém o número no app do celular **e** liga a API. É assim que o Lynk enxerga as respostas.

1. Escolha um **provedor oficial da Meta (BSP)** que ofereça coexistência, como 360dialog. Compare preço e suporte em português antes de contratar.
2. No cadastro do provedor, use a opção **"conectar número já usado no WhatsApp Business app" / coexistência**.
   - **Não** use o cadastro comum: ele tira o número do app.
3. O provedor mostra um **QR Code**. Escaneie pelo WhatsApp Business no celular, na tela que o próprio app indicar.
4. Aceite a importação do histórico, se for oferecida.
5. Anote o que o provedor entregar:
   - **Token de acesso** (permanente);
   - **ID do número de telefone** (Phone Number ID);
   - **App Secret** do app da Meta. Se o provedor usar outro esquema de assinatura, me avise, porque o webhook do Lynk valida a assinatura da Meta.

> Algumas funções do app ficam desativadas na coexistência, como listas de transmissão e edição de mensagens. Para desfazer: **Configurações → Conta → Business Platform → Desconectar**.

## Etapa 3 — Criar a chave gratuita da IA (5 min)

1. Entre em **aistudio.google.com** com uma conta Google.
2. Clique em **Get API key → Create API key**.
3. Copie a chave. Ela vai para a variável `GEMINI_API_KEY` na Etapa 5.

> No plano gratuito, o Google pode usar o conteúdo enviado para melhorar os produtos dele, e há limite de respostas por dia. Para trocar por uma IA paga depois, é só mudar variáveis na Vercel.

## Etapa 4 — Pegar dois dados do Supabase (5 min)

1. **Chave administrativa:** Supabase → seu projeto → **Project Settings → API Keys** → copie a **service_role** (ou "secret key").
   - Ela **só** vai para a Vercel. Nunca coloque no navegador ou no código.
2. **ID da sua empresa no Lynk:** é o ID da empresa LYNK. Me peça, que eu consulto para você.

## Etapa 5 — Cadastrar as variáveis na Vercel (5 min)

Vercel → projeto → **Settings → Environment Variables**. Marque **Production** e **Preview**:

| Variável | Valor |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | chave da Etapa 4 |
| `GEMINI_API_KEY` | chave da Etapa 3 |
| `AI_PROVIDER` | `gemini` |
| `WHATSAPP_API_TOKEN` | token da Etapa 2 |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número da Etapa 2 |
| `WHATSAPP_APP_SECRET` | App Secret da Etapa 2 |
| `WHATSAPP_VERIFY_TOKEN` | um texto secreto que você inventa (ex.: `lynk-webhook-8f3k2`) |
| `WHATSAPP_ORGANIZATION_ID` | ID da Etapa 4 |

Depois de salvar, faça **Redeploy** do último deploy para as variáveis valerem.

## Etapa 6 — Ligar o webhook (5 min)

No painel do provedor ou da Meta (**WhatsApp → Configuração → Webhook**):

1. **URL de retorno:** `https://SEU-DOMINIO/api/whatsapp/webhook`, com o domínio do Lynk na Vercel.
2. **Token de verificação:** o mesmo texto de `WHATSAPP_VERIFY_TOKEN`.
3. Clique em **Verificar e salvar**. Se der erro, confira o token e se o Redeploy terminou.
4. Assine os campos **`messages`** e **`smb_message_echoes`**. O segundo é o que mostra ao Lynk as mensagens que você manda pelo celular.

## Etapa 7 — Configurar e testar o assistente no Lynk (15 min)

1. Publique a versão do Lynk com o assistente e aplique a migração indicada no changelog.
2. No Lynk: avatar → **Assistente de IA**. Preencha:
   - o que você vende e para quem;
   - faixas de preço (ou "não falar preço");
   - tom de voz;
   - quando ele deve te chamar.
3. Use o **simulador** da mesma tela: escreva como se fosse um lead e veja a resposta, sem enviar nada no WhatsApp.
4. Ligue a chave **"Responder automaticamente"**.
5. **Teste real:** cadastre um lead com o seu outro número (ou o de alguém de confiança), mande a mensagem pelo "Abrir WhatsApp" e responda desse outro número. Em segundos a IA deve responder, e a conversa aparece na ficha do lead.

## No dia a dia

- Na ficha do lead, a seção **Conversa** mostra tudo o que foi falado. Lá você pausa a IA naquele lead ou responde você mesmo.
- Leads que precisam de você aparecem com o aviso **"Precisa de você"**.
- Pelas regras do WhatsApp, a IA só responde até **24 horas** depois da última mensagem do lead. Depois disso, a conversa precisa ser retomada pelo celular.
