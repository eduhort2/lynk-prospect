export function normalizeSpreadsheetKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeInstagram(value?: string | null) {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .split("?")[0]
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
}

function normalizePhone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

export function buildLeadImportKey(input: {
  company_name: string;
  instagram?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  neighborhood?: string | null;
  city?: string | null;
}) {
  const instagram = normalizeInstagram(input.instagram);
  if (instagram) return `instagram:${instagram}`;
  const phone = normalizePhone(input.whatsapp || input.phone);
  if (phone.length >= 10) return `phone:${phone}`;
  return `business:${normalizeSpreadsheetKey(input.company_name)}:${normalizeSpreadsheetKey(input.neighborhood || input.city || "")}`;
}
