import type { PublicBusiness } from "@/lib/integrations/google-places";
import type { ImportedLeadRow } from "@/features/leads/importer";
import { buildLeadImportKey } from "@/features/leads/import-key";

function digits(value: string | null) {
  return value?.replace(/\D/g, "") || "";
}

export function businessToLead(business: PublicBusiness, niche: string, region: string): ImportedLeadRow {
  const hasWebsite = Boolean(business.website);
  const location = [business.neighborhood, business.city, business.state].filter(Boolean).join(", ") || region;
  const message = hasWebsite
    ? `Olá, tudo bem? Encontrei a ${business.name} durante uma pesquisa de empresas de ${niche} em ${region}. Trabalho com soluções digitais para melhorar apresentação e conversão comercial. Posso enviar uma análise objetiva do site de vocês?`
    : `Olá, tudo bem? Encontrei a ${business.name} durante uma pesquisa de empresas de ${niche} em ${region}. Notei que não localizei um site próprio nas fontes consultadas. Posso apresentar uma sugestão de landing page para centralizar serviços, localização e contato?`;
  const prompt = `Crie uma landing page profissional, responsiva e orientada à conversão para "${business.name}", do segmento ${business.segment || niche}, localizada em ${location}. ${hasWebsite ? `Use o site público ${business.website} apenas como referência de informações confirmáveis.` : "Não invente serviços, preços, avaliações, horários ou certificações."} Inclua abertura clara, apresentação, serviços a confirmar, diferenciais, prova social somente quando fornecida, localização, contato e CTA para orçamento. Use as informações públicas disponíveis e sinalize tudo o que precisar de confirmação do cliente.`;
  const phone = digits(business.phone);

  const lead: ImportedLeadRow = {
    source_external_id: business.externalId,
    company_name: business.name,
    contact_name: null,
    phone: phone || null,
    whatsapp: phone || null,
    email: null,
    segment: business.segment || niche,
    city: business.city,
    state: business.state,
    neighborhood: business.neighborhood,
    instagram: null,
    website: business.website,
    website_status: hasWebsite ? "Site localizado" : "Site não localizado na fonte consultada",
    has_website: hasWebsite,
    source: "Geração LYNK Prospect",
    priority: hasWebsite ? "Média" : "Alta",
    status: "Novo",
    message,
    prompt,
    differentiators: null,
    landing_page_opportunity: hasWebsite ? "Analisar clareza, velocidade e conversão do site existente." : "Criar presença própria com serviços, localização e contato centralizados.",
    contact_link: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : business.mapsUrl,
    best_contact_day: "Segunda a sexta-feira",
    best_contact_time: "09:00–11:30 ou 14:00–17:00",
    contact_time_reason: "Faixa comercial sugerida pelo sistema; confirme conforme o nicho.",
    public_source: business.mapsUrl,
    image_source: business.website,
    prospecting_status: "Não contatado",
    contacted_at: null,
    response: null,
    offered_value: null,
    observations: `Lead gerado automaticamente a partir de fonte pública. Endereço consultado: ${business.formattedAddress || "não informado"}. Revise os dados antes do contato.`,
    import_key: "",
  };
  lead.import_key = buildLeadImportKey(lead);
  return lead;
}
