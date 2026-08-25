# Ativação das integrações econômicas — LYNK Prospect v3

## 1. Banco de dados

No Supabase, abra **SQL Editor**, cole o conteúdo de `supabase/migrations/004_lean_integrations.sql` e execute uma vez. A migration adiciona consentimento de WhatsApp, histórico de e-mail e a função segura de limpeza dos leads.

## 2. Prospecção gratuita

Use no ambiente da Vercel:

```env
PROSPECTING_PROVIDER=openstreetmap
OSM_USER_AGENT=LYNK-Prospect/3.0 (contato@lynkhq.com.br)
```

A busca usa Nominatim para localizar a cidade e Overpass para consultar empresas mapeadas no OpenStreetMap. Não há chave nem cobrança, mas a cobertura varia por região e os servidores públicos têm limite de uso. O sistema faz uma consulta por vez e trata indisponibilidade. Para alto volume, mantenha importação por planilha ou use uma instância própria/provedor comercial.

## 3. IA barata para prompts

Crie uma chave no Google AI Studio e configure:

```env
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-2.5-flash-lite
```

Sem chave, o criador continua gerando o prompt completo localmente. Com a chave, a IA apenas aprimora o prompt e está instruída a não inventar informações.

## 4. E-mail com `lynkhq.com.br`

No Resend, adicione o domínio `lynkhq.com.br` e copie os registros DNS fornecidos (SPF e DKIM) para o provedor DNS do domínio. Depois configure:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=Eduardo da LYNK <contato@lynkhq.com.br>
```

Após a verificação do domínio, o botão **Enviar e-mail** aparece nas ações de qualquer lead com e-mail cadastrado. O endereço usado para envio não precisa ser uma caixa postal criada no Resend. Para receber respostas em `contato@lynkhq.com.br`, configure uma caixa postal ou encaminhamento de entrada separadamente.

## 5. WhatsApp Cloud API

Configure um app na Meta, um número da WhatsApp Business Platform e um template aprovado chamado `lynk_primeiro_contato`, categoria **Marketing**, com idioma `pt_BR` e duas variáveis nomeadas:

```text
Olá! Sou Eduardo, da LYNK. Preparei uma observação sobre a presença digital da {{empresa}} em {{cidade}}. Posso enviar por aqui? Se preferir não receber mensagens, responda SAIR.
```

Variáveis:

```env
WHATSAPP_API_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v23.0
WHATSAPP_VERIFY_TOKEN=crie_um_texto_secreto
WHATSAPP_APP_SECRET=...
WHATSAPP_ORGANIZATION_ID=uuid_da_organizacao_no_supabase
WHATSAPP_TEMPLATE_NAME=lynk_primeiro_contato
WHATSAPP_TEMPLATE_LANGUAGE=pt_BR
WHATSAPP_AUTO_SEND_ON_IMPORT=false
```

Cadastre o webhook na Meta como:

```text
https://SEU-DOMINIO/api/whatsapp/webhook
```

Assine o campo `messages`. O webhook valida a assinatura da Meta, registra mensagens e atualiza o lead para **Respondeu**. A partir daí, o atendimento pode ser assumido manualmente.

### Automação após importação

Para ativar, defina `WHATSAPP_AUTO_SEND_ON_IMPORT=true`. O sistema envia somente para linhas que tenham:

- telefone válido;
- coluna `Consentimento WhatsApp` marcada como `Sim`;
- origem do consentimento informada;
- nenhum contato anterior.

Leads encontrados em fonte pública não recebem consentimento automaticamente. Uma mensagem comercial fria continua sendo classificada como marketing mesmo com texto neutro; tentar registrá-la como utilitária pode causar rejeição, reclassificação e restrições na conta.

## 6. Publicação

Depois de configurar as variáveis na Vercel, faça um novo deploy. Use o domínio principal para o site institucional e prefira um subdomínio para o sistema, por exemplo `prospect.lynkhq.com.br`, para separar aplicação, e-mail e página pública.

## Checklist rápido

- Executar migration `004`.
- Confirmar login e leitura dos leads.
- Testar busca com 5 leads em Curitiba.
- Gerar um prompt com e sem a chave Gemini.
- Verificar domínio no Resend e enviar para seu próprio e-mail.
- Validar o webhook da Meta.
- Criar um lead de teste com consentimento e enviar o template.
- Responder pelo WhatsApp e confirmar mudança para **Respondeu**.
- Só então considerar ativar envio automático na importação.
