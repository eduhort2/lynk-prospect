# Templates de e-mail da LYNK Prospect

Os HTMLs prontos ficam em:

- `supabase/templates/confirm-signup.html`
- `supabase/templates/recovery.html`

## Ativação no Supabase hospedado

1. Abra **Authentication → Email Templates** no painel do Supabase.
2. Em **Confirm signup**, use o assunto `Confirme seu acesso à LYNK Prospect` e cole o conteúdo de `confirm-signup.html`.
3. Em **Reset password**, use o assunto `Redefina sua senha da LYNK Prospect` e cole o conteúdo de `recovery.html`.
4. Salve cada template e faça um cadastro e uma recuperação de teste.

Os links usam a variável oficial `{{ .ConfirmationURL }}`. Não substitua essa variável por uma URL fixa.

## Política obrigatória de senha

Além da validação da interface, configure a mesma regra no servidor em **Authentication → Settings → Password security**:

- comprimento mínimo: `8`;
- exigir letras maiúsculas;
- exigir números;
- exigir símbolos.

Quando o plano do Supabase permitir, ative também a proteção contra senhas vazadas.

## Produção

Configure um SMTP próprio antes da comercialização. O remetente deve usar um domínio da LYNK e o rastreamento de links do provedor deve permanecer desativado para não alterar os links de autenticação.
