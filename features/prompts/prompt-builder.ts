import type { PromptFormValues } from "@/lib/validations/prompt";

export function buildLandingPagePrompt(values: PromptFormValues) {
  const location = values.city ? `, localizado em ${values.city}` : "";
  const instagram = values.instagram ? `\nUse como referência visual e fonte de informações confirmadas o Instagram oficial: ${values.instagram}.` : "";

  return `Crie uma landing page moderna, profissional e totalmente responsiva para o negócio "${values.company_name}", do segmento ${values.segment}${location}.

OBJETIVO PRINCIPAL
${values.objective}

DIFERENCIAIS CONFIRMADOS
${values.differentiators}${instagram}

DIREÇÃO VISUAL
Desenvolva uma identidade visual coerente com o segmento e com o posicionamento da empresa. O resultado deve transmitir confiança, clareza e profissionalismo, com boa hierarquia tipográfica, espaçamento consistente, microinterações discretas e foco em conversão. Evite aparência genérica, excesso de efeitos, textos artificiais e elementos sem função.

ESTRUTURA OBRIGATÓRIA
- Abertura impactante com proposta de valor clara e CTA principal.
- Apresentação do negócio e dos diferenciais confirmados.
- Seção de serviços ou soluções, sem inventar ofertas.
- Prova visual ou galeria quando houver material disponível.
- Prova social somente quando existirem avaliações reais fornecidas.
- Localização, horários e canais de contato somente com dados confirmados.
- FAQ com dúvidas relevantes ao segmento, sem criar garantias ou promessas.
- CTA final e rodapé completo.

REGRAS DE CONTEÚDO
- Não invente preços, avaliações, números, certificações, endereços, horários, serviços ou benefícios não informados.
- Quando um dado obrigatório não estiver disponível, sinalize claramente "informação a confirmar" no código ou conteúdo.
- Use linguagem natural, objetiva e específica para ${values.company_name}.
- Todos os botões devem executar uma ação real e ter estados de foco e hover.

REQUISITOS TÉCNICOS
- Entregue o projeto completo e pronto para produção.
- Use HTML semântico, CSS organizado e JavaScript apenas quando necessário.
- Garanta responsividade para celular, tablet e desktop.
- Aplique acessibilidade básica: contraste, labels, alt text e navegação por teclado.
- Otimize imagens, performance, SEO on-page e metadados sociais.
- Organize os arquivos em index.html, css/styles.css, js/main.js e assets/.
- Não use dependências externas desnecessárias.

Antes de finalizar, revise textos, links, CTAs, overflow, responsividade e consistência visual.`;
}
