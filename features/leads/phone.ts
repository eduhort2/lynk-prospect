/** Telefones brasileiros (mesma regra usada no Lynk CRM). */

/** Dígitos com DDI 55 (ex.: 5541987654321) ou null se não for um telefone brasileiro válido. */
export function normPhoneBR(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  else if (d.length === 12 && d.startsWith("0")) d = `55${d.slice(1)}`;
  if (!d.startsWith("55") || (d.length !== 12 && d.length !== 13)) return null;
  const ddd = Number(d.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  if (d.length === 13 && d[4] !== "9") return null;
  return d;
}

/** Celular (DDD + 9 dígitos começando com 9): número que normalmente tem WhatsApp. */
export function isMobileBR(value: unknown) {
  const d = normPhoneBR(value);
  return Boolean(d && d.length === 13);
}

export function formatPhoneBR(value: unknown) {
  const d = normPhoneBR(value);
  const m = d?.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : String(value ?? "");
}
