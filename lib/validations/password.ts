export const PASSWORD_MIN_LENGTH = 8;

export const passwordRules = [
  { id: "length", label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, test: (value: string) => value.length >= PASSWORD_MIN_LENGTH },
  { id: "uppercase", label: "Uma letra maiúscula", test: (value: string) => /[A-ZÀ-ÖØ-Þ]/.test(value) },
  { id: "number", label: "Um número", test: (value: string) => /\d/.test(value) },
  { id: "symbol", label: "Um símbolo", test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value) },
] as const;

export function passwordChecks(password: string) {
  return passwordRules.map((rule) => ({ ...rule, passed: rule.test(password) }));
}

export function isStrongPassword(password: string) {
  return passwordRules.every((rule) => rule.test(password));
}

export function passwordStrength(password: string) {
  if (!password) return { score: 0, label: "Digite uma senha", color: "bg-zinc-700" };

  let score = passwordRules.filter((rule) => rule.test(password)).length;
  if (password.length >= 12) score += 1;
  if (/[a-zà-öø-ÿ]/.test(password)) score += 1;

  if (score <= 2) return { score: 1, label: "Fraca", color: "bg-red-400" };
  if (score <= 4) return { score: 2, label: "Média", color: "bg-amber-400" };
  return { score: 3, label: "Forte", color: "bg-primary-light" };
}

export function passwordError(password: string) {
  const missing = passwordChecks(password).filter((rule) => !rule.passed).map((rule) => rule.label.toLowerCase());
  return missing.length ? `A senha precisa ter ${missing.join(", ")}.` : null;
}
