# LYNK Prospect v3.0

## Entregue nesta versão

- Identidade visual atualizada para preto, grafite, azul-claro `#C3DFEA`, cinza `#7C8485` e detalhes quentes.
- Marca **LYNK Prospect** e slogan **Conecte. Construa. Cresça.** no cabeçalho.
- Busca gratuita de leads com OpenStreetMap, Nominatim e Overpass.
- Google Places mantido como provedor opcional por variável de ambiente.
- IA Gemini Flash-Lite para aprimorar prompts, com gerador local automático quando a chave não estiver configurada.
- WhatsApp Cloud API com template aprovado, consentimento obrigatório e envio manual por lead.
- Envio automático após importação opcional e limitado a leads com consentimento explícito.
- Webhook do WhatsApp com validação de assinatura, atualização de entrega/leitura e movimentação do lead para **Respondeu**.
- Envio de e-mail pelo domínio da LYNK usando Resend.
- Botão **Limpar leads** com confirmação e autorização de administrador/gestor.
- Migration `004_lean_integrations.sql` para atualizar o Supabase existente.
- Guia completo em `docs/integracoes-v3.md`.

## Ativação mínima

1. Execute `supabase/migrations/004_lean_integrations.sql` no Supabase.
2. Copie as novas variáveis de `.env.example` para a Vercel.
3. Faça um novo deploy.
4. Ative cada serviço seguindo `docs/integracoes-v3.md`.

## Observação sobre WhatsApp

Abordagem comercial inicial é marketing. O sistema não tenta mascarar mensagens comerciais como utilitárias. O consentimento protege a conta, o número e a reputação da LYNK.
