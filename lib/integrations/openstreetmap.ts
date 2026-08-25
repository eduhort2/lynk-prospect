import "server-only";

import type { ProspectingRequest } from "@/lib/validations/prospecting";
import type { PublicBusiness } from "./google-places";

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const categories: Array<{ match: RegExp; query: string }> = [
  { match: /restaurante|gastronomia|comida/i, query: '[amenity="restaurant"]' },
  { match: /barbearia|barber/i, query: '[shop="hairdresser"][hairdresser="barber"]' },
  { match: /sal[aã]o|cabeleireir/i, query: '[shop="hairdresser"]' },
  { match: /cl[ií]nica|m[eé]dic|sa[uú]de/i, query: '[healthcare]' },
  { match: /dentista|odont/i, query: '[amenity="dentist"]' },
  { match: /academia|fitness|crossfit/i, query: '[leisure="fitness_centre"]' },
  { match: /caf[eé]|cafeteria/i, query: '[amenity="cafe"]' },
  { match: /hotel|pousada/i, query: '[tourism~"hotel|guest_house"]' },
  { match: /pet|veterin/i, query: '[amenity="veterinary"]' },
  { match: /farm[aá]cia/i, query: '[amenity="pharmacy"]' },
  { match: /imobili[aá]ria/i, query: '[office="estate_agent"]' },
  { match: /advoc/i, query: '[office="lawyer"]' },
  { match: /contab|contador/i, query: '[office="accountant"]' },
  { match: /mec[aâ]nic|oficina/i, query: '[shop="car_repair"]' },
  { match: /est[eé]tica|spa|massagem/i, query: '[shop~"beauty|massage"]' },
];

function safeRegex(value: string) {
  return value.replace(/[\\".^$|?*+()[\]{}]/g, " ").trim().split(/\s+/).slice(0, 4).join("|");
}

function cleanPhone(value?: string) {
  return value?.split(/[;,/]/)[0]?.trim() || null;
}

function website(tags: Record<string, string>) {
  return tags.website || tags["contact:website"] || tags.url || null;
}

export async function searchOpenStreetMapBusinesses(input: ProspectingRequest): Promise<PublicBusiness[]> {
  const userAgent = process.env.OSM_USER_AGENT || "LYNK-Prospect/3.0 (contato@lynkhq.com.br)";
  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
  geocodeUrl.searchParams.set("q", `${input.region}, Brasil`);
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");

  const geocode = await fetch(geocodeUrl, { headers: { "user-agent": userAgent, "accept-language": "pt-BR" }, cache: "force-cache" });
  if (!geocode.ok) throw new Error(`OSM_GEOCODING_ERROR_${geocode.status}`);
  const locations = await geocode.json() as Array<{ lat: string; lon: string }>;
  if (!locations[0]) throw new Error("OSM_REGION_NOT_FOUND");

  const { lat, lon } = locations[0];
  const mapped = categories.find((item) => item.match.test(input.niche));
  const selector = mapped?.query || `[name~"${safeRegex(input.niche)}",i]`;
  const radius = Math.max(1000, Math.min(30000, Number(process.env.OSM_SEARCH_RADIUS_METERS || 18000)));
  const query = `[out:json][timeout:25];(nwr(around:${radius},${lat},${lon})${selector}[name];);out center tags ${Math.min(250, input.quantity * 5)};`;

  const response = await fetch(process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": userAgent },
    body: new URLSearchParams({ data: query }),
    cache: "no-store",
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`OVERPASS_ERROR_${response.status}`);
  const payload = await response.json() as { elements?: OsmElement[] };

  const seen = new Set<string>();
  const results: PublicBusiness[] = [];
  for (const element of payload.elements || []) {
    const tags = element.tags || {};
    const name = tags.name?.trim();
    if (!name) continue;
    const site = website(tags);
    if (input.websiteFilter === "with" && !site) continue;
    if (input.websiteFilter === "without" && site) continue;
    const key = `${name.toLowerCase()}|${tags["addr:street"] || ""}|${tags["addr:housenumber"] || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const point = element.center || (element.lat && element.lon ? { lat: element.lat, lon: element.lon } : null);
    const mapsUrl = point ? `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=18/${point.lat}/${point.lon}` : `https://www.openstreetmap.org/${element.type}/${element.id}`;
    const city = tags["addr:city"] || tags["addr:municipality"] || input.region.split(",")[0]?.trim() || null;
    results.push({
      externalId: `osm:${element.type}:${element.id}`,
      name,
      phone: cleanPhone(tags["contact:phone"] || tags.phone || tags["contact:mobile"]),
      website: site,
      mapsUrl,
      segment: tags.cuisine || tags.shop || tags.amenity || tags.healthcare || input.niche,
      formattedAddress: [tags["addr:street"], tags["addr:housenumber"], tags["addr:suburb"], city, tags["addr:state"]].filter(Boolean).join(", ") || null,
      city,
      state: tags["addr:state"]?.slice(0, 2).toUpperCase() || input.region.split(",")[1]?.trim().slice(0, 2).toUpperCase() || null,
      neighborhood: tags["addr:suburb"] || tags["addr:neighbourhood"] || null,
    });
    if (results.length >= input.quantity) break;
  }
  return results;
}
