import "server-only";

import type { ProspectingRequest } from "@/lib/validations/prospecting";

type AddressComponent = { longText?: string; shortText?: string; types?: string[] };
type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  addressComponents?: AddressComponent[];
};

export type PublicBusiness = {
  externalId: string;
  name: string;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  segment: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
};

function addressPart(components: AddressComponent[] | undefined, type: string, short = false) {
  const item = components?.find((component) => component.types?.includes(type));
  return (short ? item?.shortText : item?.longText) || null;
}

export async function searchPublicBusinesses(input: ProspectingRequest): Promise<PublicBusiness[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_NOT_CONFIGURED");

  const results: PublicBusiness[] = [];
  let pageToken: string | undefined;

  while (results.length < input.quantity) {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-fieldmask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName,places.addressComponents,nextPageToken",
      },
      body: JSON.stringify({
        textQuery: `${input.niche} em ${input.region}`,
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: Math.min(20, input.quantity - results.length),
        ...(pageToken ? { pageToken } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) throw new Error(`GOOGLE_PLACES_ERROR_${response.status}`);
    const payload = await response.json() as { places?: GooglePlace[]; nextPageToken?: string };
    for (const place of payload.places || []) {
      const website = place.websiteUri || null;
      if (input.websiteFilter === "with" && !website) continue;
      if (input.websiteFilter === "without" && website) continue;
      results.push({
        externalId: place.id,
        name: place.displayName?.text || "Empresa sem nome",
        phone: place.nationalPhoneNumber || null,
        website,
        mapsUrl: place.googleMapsUri || null,
        segment: place.primaryTypeDisplayName?.text || input.niche,
        formattedAddress: place.formattedAddress || null,
        city: addressPart(place.addressComponents, "administrative_area_level_2") || addressPart(place.addressComponents, "locality"),
        state: addressPart(place.addressComponents, "administrative_area_level_1", true),
        neighborhood: addressPart(place.addressComponents, "sublocality_level_1") || addressPart(place.addressComponents, "sublocality"),
      });
      if (results.length >= input.quantity) break;
    }

    pageToken = payload.nextPageToken;
    if (!pageToken || !(payload.places || []).length) break;
  }

  return results.slice(0, input.quantity);
}
