/**
 * Monta leads completos a partir do que a busca encontrou. Regras do WhatsApp:
 *  - link wa.me no site oficial → WhatsApp CONFIRMADO (link oficial publicado pela empresa);
 *  - celular (DDD + 9) do Google Maps → WhatsApp "provável", NÃO confirmado;
 *  - telefone fixo → só telefone comercial.
 */
import { buildLeadImportKey } from "@/features/leads/import-key";
import { formatPhoneBR, normPhoneBR } from "@/features/leads/phone";
import type { SuggestedService } from "@/types";
import { companyDomain, parseBrazilAddress, type MlStore, type SiteContacts } from "./parsing";

export const FINDER_SERVICES = ["Site", "Loja no Mercado Livre", "IA para WhatsApp", "Logística", "Estoque", "Outro"] as const satisfies readonly SuggestedService[];
export type FinderService = (typeof FINDER_SERVICES)[number];

export type FinderInput = {
  service: FinderService;
  serviceDetail?: string | null;
  niche: string;
  region: string;
};

export type PlaceInfo = {
  title: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  type: string | null;
  mapsUrl: string;
  rating: number | null;
  reviews: number | null;
};

export type FinderLead = {
  company_name: string;
  segment: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp_confirmed: boolean;
  whatsapp_source: string | null;
  email: string | null;
  website: string | null;
  has_website: boolean;
  website_status: string;
  instagram: string | null;
  contact_link: string | null;
  suggested_service: FinderService;
  suggested_service_detail: string | null;
  marketplace_url: string | null;
  marketplace_listings: number | null;
  marketplace_presence: "confirmada" | "a_validar" | null;
  differentiators: string;
  landing_page_opportunity: string;
  public_source: string;
  message: string;
  observations: string;
  source: string;
  status: "Novo";
  priority: "Alta" | "Média";
  prospecting_status: string;
  import_key: string;
};

function pickWhatsApp(place: PlaceInfo | null, site: SiteContacts) {
  const officialFromSite = site.whatsapps[0] || null;
  if (officialFromSite) return { whatsapp: officialFromSite, confirmed: true, source: "Link de WhatsApp publicado no site da empresa", link: `https://wa.me/${officialFromSite}` };
  const candidates = [place?.phone, ...site.phones].map(normPhoneBR).filter(Boolean) as string[];
  const mobile = candidates.find((number) => number.length === 13);
  if (mobile) return { whatsapp: mobile, confirmed: false, source: place?.phone && normPhoneBR(place.phone) === mobile ? "Celular no Google Maps (provável WhatsApp, a confirmar)" : "Celular no site (provável WhatsApp, a confirmar)", link: null };
  return { whatsapp: null, confirmed: false, source: null, link: null };
}

function serviceLabel(input: FinderInput) {
  if (input.service === "Outro") return input.serviceDetail?.trim() || "uma solução sob medida";
  if (input.service === "Loja no Mercado Livre") return input.serviceDetail?.trim() || "soluções para lojistas do Mercado Livre";
  return input.service;
}

function buildMessage(name: string, input: FinderInput, facts: { hasWebsite: boolean; listings: number | null }) {
  const greeting = `Olá, tudo bem? Encontrei a ${name} pesquisando ${input.niche} em ${input.region}.`;
  switch (input.service) {
    case "Site":
      return facts.hasWebsite
        ? `${greeting} Dei uma olhada no site de vocês e vi alguns pontos simples que podem trazer mais pedidos pelo celular. Posso te mandar uma análise rápida, sem compromisso?`
        : `${greeting} Não encontrei um site próprio de vocês nas buscas. Faço sites rápidos, que aparecem no Google e levam o cliente direto para o WhatsApp. Posso te mostrar um exemplo?`;
    case "Loja no Mercado Livre":
      return `Olá, tudo bem? Vi a loja ${name} no Mercado Livre${facts.listings ? `, com cerca de ${facts.listings} anúncios` : ""}. Trabalho com ${serviceLabel(input)} e tenho uma ideia rápida que pode ajudar a vender mais. Posso te explicar em 2 minutos?`;
    case "IA para WhatsApp":
      return `${greeting} Desenvolvo assistentes de IA para WhatsApp que respondem clientes na hora, inclusive fora do horário, e passam para a equipe só o que precisa de atenção. Posso te mostrar como funcionaria para vocês?`;
    case "Logística":
      return `${greeting} Desenvolvo sistemas de logística para organizar entregas, rotas e acompanhamento dos pedidos. Posso te mostrar como ficaria para a operação de vocês?`;
    case "Estoque":
      return `${greeting} Desenvolvo sistemas de controle de estoque simples de usar, integrados às vendas. Posso te mostrar como ficaria para vocês?`;
    default:
      return `${greeting} Trabalho com ${serviceLabel(input)} e acredito que pode ajudar a ${name}. Posso te explicar rapidamente como funciona?`;
  }
}

function opportunity(input: FinderInput, hasWebsite: boolean) {
  switch (input.service) {
    case "Site": return hasWebsite ? "Melhorar o site atual: velocidade, celular, Google e botão de WhatsApp." : "Criar site próprio com serviços, localização e WhatsApp.";
    case "Loja no Mercado Livre": return `Oferecer ${serviceLabel(input)} para a loja no Mercado Livre.`;
    case "IA para WhatsApp": return "Assistente de IA no WhatsApp para responder clientes 24h e qualificar pedidos.";
    case "Logística": return "Sistema de logística para entregas, rotas e acompanhamento.";
    case "Estoque": return "Sistema de estoque integrado às vendas.";
    default: return `Oferecer ${serviceLabel(input)}.`;
  }
}

function finish(lead: Omit<FinderLead, "import_key">, keyOverride?: string): FinderLead {
  const import_key = keyOverride || buildLeadImportKey({ company_name: lead.company_name, instagram: lead.instagram, whatsapp: lead.whatsapp, phone: lead.phone, neighborhood: lead.neighborhood, city: lead.city });
  return { ...lead, import_key };
}

/** Empresa local encontrada no Google Maps (Site, IA, Logística, Estoque, Outro). */
export function leadFromPlace(place: PlaceInfo, site: SiteContacts, input: FinderInput, searchedAt = new Date()): FinderLead {
  const location = parseBrazilAddress(place.address);
  const ownSite = place.website && companyDomain(place.website) ? place.website : null;
  const social = place.website && !ownSite && /instagram\.com/i.test(place.website) ? place.website : null;
  const whats = pickWhatsApp(place, site);
  const phone = normPhoneBR(place.phone) || site.phones[0] || null;
  const signals = [
    ownSite ? `Site: ${companyDomain(ownSite)}` : "Sem site próprio no Google Maps",
    place.rating ? `Nota ${place.rating.toFixed(1)} no Google (${place.reviews ?? 0} avaliações)` : null,
    whats.confirmed ? "WhatsApp publicado no site" : whats.whatsapp ? "Celular no Google Maps" : phone ? "Só telefone fixo encontrado" : "Nenhum telefone encontrado",
  ].filter(Boolean).join(" · ");
  return finish({
    company_name: place.title,
    segment: place.type || input.niche,
    city: location.city,
    state: location.state,
    neighborhood: location.neighborhood,
    phone: phone ? formatPhoneBR(phone) : null,
    whatsapp: whats.whatsapp ? formatPhoneBR(whats.whatsapp) : null,
    whatsapp_confirmed: whats.confirmed,
    whatsapp_source: whats.source,
    email: site.emails[0] || null,
    website: ownSite,
    has_website: Boolean(ownSite),
    website_status: ownSite ? "Site localizado no Google Maps" : "Site não localizado no Google Maps",
    instagram: site.instagram || social,
    contact_link: whats.link,
    suggested_service: input.service,
    suggested_service_detail: input.service === "Outro" || input.service === "Loja no Mercado Livre" ? input.serviceDetail?.trim() || null : null,
    marketplace_url: null,
    marketplace_listings: null,
    marketplace_presence: null,
    differentiators: signals,
    landing_page_opportunity: opportunity(input, Boolean(ownSite)),
    public_source: place.mapsUrl,
    message: buildMessage(place.title, input, { hasWebsite: Boolean(ownSite), listings: null }),
    observations: `Busca automática em ${searchedAt.toLocaleDateString("pt-BR")}: "${input.niche}" em ${input.region}. Endereço: ${place.address || "não informado"}. Confira os dados antes do contato.`,
    source: "Busca automática (Google Maps)",
    status: "Novo",
    priority: ownSite ? "Média" : "Alta",
    prospecting_status: "Não contatado",
  });
}

/** Loja do Mercado Livre, completada com o Google Maps (se o nome conferir) e o site oficial. */
export function leadFromMlStore(store: MlStore, place: PlaceInfo | null, site: SiteContacts, input: FinderInput, searchedAt = new Date()): FinderLead {
  const location = parseBrazilAddress(place?.address || null);
  const ownSite = place?.website && companyDomain(place.website) ? place.website : null;
  const whats = pickWhatsApp(place, site);
  const phone = normPhoneBR(place?.phone) || site.phones[0] || null;
  const signals = [
    `Loja no Mercado Livre (${store.presence === "confirmada" ? "confirmada" : "a validar"})`,
    store.listings !== null ? `${store.listings} anúncios` : "Quantidade de anúncios a conferir",
    ownSite ? `Site próprio: ${companyDomain(ownSite)}` : "Sem site próprio encontrado",
    whats.confirmed ? "WhatsApp publicado no site" : whats.whatsapp ? "Celular no Google Maps" : "Contato não encontrado fora do ML",
  ].join(" · ");
  return finish({
    company_name: store.name,
    segment: input.niche,
    city: location.city,
    state: location.state,
    neighborhood: location.neighborhood,
    phone: phone ? formatPhoneBR(phone) : null,
    whatsapp: whats.whatsapp ? formatPhoneBR(whats.whatsapp) : null,
    whatsapp_confirmed: whats.confirmed,
    whatsapp_source: whats.source,
    email: site.emails[0] || null,
    website: ownSite,
    has_website: Boolean(ownSite),
    website_status: ownSite ? "Site próprio localizado" : "Site próprio não localizado",
    instagram: site.instagram,
    contact_link: whats.link,
    suggested_service: input.service,
    suggested_service_detail: input.serviceDetail?.trim() || null,
    marketplace_url: store.url,
    marketplace_listings: store.listings,
    marketplace_presence: store.presence,
    differentiators: signals,
    landing_page_opportunity: opportunity(input, Boolean(ownSite)),
    public_source: store.url,
    message: buildMessage(store.name, input, { hasWebsite: Boolean(ownSite), listings: store.listings }),
    observations: `Busca automática em ${searchedAt.toLocaleDateString("pt-BR")}: lojas do Mercado Livre para "${input.niche}"${input.region ? ` em ${input.region}` : ""}. ${store.reason}${place ? ` Contato conferido no Google Maps: ${place.title}${place.address ? ` (${place.address})` : ""}.` : " Nenhum perfil no Google Maps com o mesmo nome."} O Mercado Livre não divulga o contato dos vendedores; confira antes de abordar.`,
    source: "Busca automática (Mercado Livre)",
    status: "Novo",
    priority: store.presence === "confirmada" ? "Alta" : "Média",
    prospecting_status: "Não contatado",
  }, store.storeId ? `ml:${store.storeId}` : `ml:nome:${store.name.toLowerCase()}`);
}
