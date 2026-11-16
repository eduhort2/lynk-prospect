/**
 * Testes da busca automática (sem rede). Rode com: npm run test:finder
 */
import assert from "node:assert/strict";
import { leadFromMlStore, leadFromPlace } from "@/features/lead-finder/build-lead";
import { extractSiteContacts, groupMercadoLivreResults, listingsFromText, mlStoreIdFromUrl, nameMatch, parseBrazilAddress } from "@/features/lead-finder/parsing";
import { isMobileBR, normPhoneBR } from "@/features/leads/phone";
import { getProbableWhatsApp, getWhatsAppTarget } from "@/features/leads/whatsapp-link";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✔ ${name}`); }
const EMPTY_SITE = { whatsapps: [], phones: [], emails: [], instagram: null };

test("telefones: celular x fixo", () => {
  assert.equal(normPhoneBR("(41) 99777-0101"), "5541997770101");
  assert.equal(normPhoneBR("41 3333-2222"), "554133332222");
  assert.equal(normPhoneBR("(41) 89777-0101"), null, "celular deve começar com 9");
  assert.ok(isMobileBR("+55 41 99777-0101"));
  assert.ok(!isMobileBR("(41) 3333-2222"));
});

test("Mercado Livre: identifica loja, agrupa anúncios e lê quantidade quando o texto informa", () => {
  assert.equal(mlStoreIdFromUrl("https://www.mercadolivre.com.br/loja/autopecas-circular"), "loja:autopecas-circular");
  assert.equal(mlStoreIdFromUrl("https://perfil.mercadolivre.com.br/CIRCULAR.PECAS"), "perfil:circular.pecas");
  assert.equal(mlStoreIdFromUrl("https://produto.mercadolivre.com.br/MLB-123-x"), null);
  assert.equal(listingsFromText("Loja oficial · 1.234 produtos à venda"), 1234);
  assert.equal(listingsFromText("Mais de 350 anúncios"), 350);
  assert.equal(listingsFromText("Frete grátis"), null);
  const stores = groupMercadoLivreResults([
    { title: "Circular Autopeças | Mercado Livre", link: "https://www.mercadolivre.com.br/loja/circular-autopecas", snippet: "Confira 412 produtos da loja Circular Autopeças." },
    { title: "Filtro de óleo - Circular Autopeças", link: "https://produto.mercadolivre.com.br/MLB-1", snippet: "Vendido por CircularAutopecas" },
    { title: "Kit embreagem", link: "https://produto.mercadolivre.com.br/MLB-2", snippet: "Frete grátis" },
    { title: "Loja oficial Bosch | Mercado Livre", link: "https://produto.mercadolivre.com.br/MLB-3", snippet: "Loja oficial Bosch. Ferramentas." },
    { title: "Site da Circular", link: "https://circularautopecas.com.br", snippet: "" },
  ]);
  const circular = stores.find((store) => store.name === "Circular Autopeças")!;
  assert.equal(circular.presence, "confirmada");
  assert.equal(circular.listings, 412);
  assert.equal(stores.find((store) => store.name === "Bosch")?.presence, "confirmada");
  assert.ok(!stores.some((store) => store.url.includes("MLB-2")), "anúncio sem vendedor não vira lead");
  assert.ok(!stores.some((store) => store.url.includes("circularautopecas.com.br")), "site fora do ML não vira loja");
});

test("Mercado Livre: formato real do Google (16/11/2026) — títulos, links com rastreio e repetidos", () => {
  const stores = groupMercadoLivreResults([
    { title: "Auto Peças Gisela | Loja Oficial", link: "https://www.mercadolivre.com.br/loja/auto-pecas-gisela", snippet: "Categorias em destaque · Freios · Suspensão" },
    { title: "Blumax Autopeças | Loja Oficial", link: "https://www.mercadolivre.com.br/loja/blumax-autopecas?category_id=MLB47102&item_id=MLB6738620812&recos_listing=true&client=recoview-selleritems&official_store_id=309186", snippet: "Peças para caminhonetes" },
    { title: "Blumax Autopeças | Loja Oficial", link: "https://www.mercadolivre.com.br/loja/blumax-autopecas?category_id=MLB22714&item_id=MLB5277410150", snippet: "Peças para caminhonetes" },
    { title: "Loja Sao Paulo Auto Pecas", link: "https://lista.mercadolivre.com.br/loja-sao-paulo-auto-pecas", snippet: "Frete grátis no dia" },
    { title: "Quibao Auto Peças Linha Pesada - Capivari", link: "https://www.mercadolivre.com.br/loja/quibao?searchVariation=182270558589", snippet: "Pedidos online WhatsApp." },
  ]);
  assert.deepEqual(stores.map((store) => store.name), ["Auto Peças Gisela", "Blumax Autopeças", "Quibao Auto Peças Linha Pesada - Capivari"]);
  assert.equal(stores[1].url, "https://www.mercadolivre.com.br/loja/blumax-autopecas", "link limpo, sem rastreio");
  assert.ok(stores.every((store) => store.presence === "confirmada"));
});

test("conferência de nome exige as palavras distintivas", () => {
  assert.equal(nameMatch("Circular Autopeças", "Circular Auto Peças - Curitiba"), 1);
  assert.equal(nameMatch("Circular Autopeças", "Central Autopeças"), 0);
});

test("contatos do site: wa.me vira WhatsApp oficial; tel, e-mail e Instagram", () => {
  const site = extractSiteContacts(`<a href="https://wa.me/5541997770101?text=oi">WhatsApp</a>
    <a href="https://api.whatsapp.com/send?phone=5541988880000">Zap</a>
    <a href="tel:+55 41 3333-2222">Ligue</a> <a href="mailto:contato@empresa.com.br">E-mail</a>
    <a href="https://www.instagram.com/empresa.oficial/">Insta</a>`);
  assert.deepEqual(site.whatsapps, ["5541997770101", "5541988880000"]);
  assert.deepEqual(site.phones, ["554133332222"]);
  assert.deepEqual(site.emails, ["contato@empresa.com.br"]);
  assert.equal(site.instagram, "https://www.instagram.com/empresa.oficial");
});

test("endereço do Google Maps → bairro, cidade e UF", () => {
  assert.deepEqual(parseBrazilAddress("R. XV de Novembro, 100 - Centro, Curitiba - PR, 80020-310"), { city: "Curitiba", state: "PR", neighborhood: "Centro" });
});

const place = { title: "Clínica Sorriso Pleno", phone: "(41) 99777-0101", website: null, address: "Av. Batel, 10 - Batel, Curitiba - PR, 80420-090", type: "Dentista", mapsUrl: "https://maps.example/1", rating: 4.8, reviews: 120 };
const input = { service: "IA para WhatsApp" as const, niche: "dentista", region: "Curitiba, PR" };

test("empresa local com celular: lead completo com WhatsApp provável (não confirmado)", () => {
  const lead = leadFromPlace(place, EMPTY_SITE, input);
  assert.equal(lead.company_name, "Clínica Sorriso Pleno");
  assert.equal(lead.city, "Curitiba");
  assert.equal(lead.state, "PR");
  assert.equal(lead.whatsapp, "(41) 99777-0101");
  assert.equal(lead.whatsapp_confirmed, false);
  assert.match(lead.whatsapp_source!, /provável/);
  assert.equal(lead.contact_link, null);
  assert.equal(lead.suggested_service, "IA para WhatsApp");
  assert.match(lead.message, /assistentes de IA para WhatsApp/);
  assert.match(lead.differentiators, /Nota 4\.8/);
  assert.equal(lead.import_key, "phone:41997770101");
  const asLead = { whatsapp: lead.whatsapp, whatsapp_confirmed: false, contact_link: null, phone: lead.phone };
  assert.equal(getWhatsAppTarget(asLead), null, "sem botão principal");
  assert.equal(getProbableWhatsApp(asLead, "Oi")!.url, "https://wa.me/5541997770101?text=Oi", "botão “a confirmar”");
});

test("empresa com wa.me no site: WhatsApp confirmado e link oficial", () => {
  const lead = leadFromPlace({ ...place, phone: "(41) 3333-2222", website: "https://sorrisopleno.com.br" }, { ...EMPTY_SITE, whatsapps: ["5541988880000"], emails: ["oi@sorrisopleno.com.br"] }, { service: "Site", niche: "dentista", region: "Curitiba, PR" });
  assert.equal(lead.whatsapp_confirmed, true);
  assert.equal(lead.contact_link, "https://wa.me/5541988880000");
  assert.equal(lead.phone, "(41) 3333-2222");
  assert.equal(lead.email, "oi@sorrisopleno.com.br");
  assert.equal(lead.website, "https://sorrisopleno.com.br");
  assert.match(lead.message, /site de vocês/);
});

test("telefone fixo não vira WhatsApp", () => {
  const lead = leadFromPlace({ ...place, phone: "(41) 3333-2222" }, EMPTY_SITE, input);
  assert.equal(lead.whatsapp, null);
  assert.equal(getProbableWhatsApp({ whatsapp: null, whatsapp_confirmed: false, contact_link: null, phone: lead.phone }), null);
});

test("Outro exige e usa o serviço especificado", () => {
  const lead = leadFromPlace(place, EMPTY_SITE, { service: "Outro", serviceDetail: "automação de agendamento", niche: "dentista", region: "Curitiba" });
  assert.equal(lead.suggested_service_detail, "automação de agendamento");
  assert.match(lead.message, /automação de agendamento/);
});

test("loja do ML: link da loja, nicho, anúncios e contato do Google Maps", () => {
  const store = { key: "ml:loja:circular", name: "Circular Autopeças", storeId: "loja:circular", url: "https://www.mercadolivre.com.br/loja/circular", presence: "confirmada" as const, reason: "Página de loja.", snippet: "", listings: 412 };
  const lead = leadFromMlStore(store, { ...place, title: "Circular Autopeças", phone: "(41) 99111-2222" }, EMPTY_SITE, { service: "Loja no Mercado Livre", serviceDetail: "site próprio", niche: "autopeças", region: "Curitiba" });
  assert.equal(lead.marketplace_url, store.url);
  assert.equal(lead.marketplace_listings, 412);
  assert.equal(lead.marketplace_presence, "confirmada");
  assert.equal(lead.segment, "autopeças");
  assert.equal(lead.whatsapp, "(41) 99111-2222");
  assert.equal(lead.import_key, "ml:loja:circular");
  assert.match(lead.message, /cerca de 412 anúncios/);
  const noContact = leadFromMlStore({ ...store, listings: null }, null, EMPTY_SITE, { service: "Loja no Mercado Livre", niche: "autopeças", region: "" });
  assert.equal(noContact.whatsapp, null);
  assert.match(noContact.differentiators, /anúncios a conferir/);
});

console.log(`\n${passed} testes passaram.`);
