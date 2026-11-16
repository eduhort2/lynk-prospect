import type { LeadStatus } from "@/types";

/**
 * Etapas da versão enxuta. Os valores gravados no banco continuam os mesmos
 * (restrição leads_status_check); só os rótulos exibidos mudam.
 */
export const PIPELINE_STAGES = [
  { status: "Novo", label: "Novo", tone: "blue", accent: "bg-blue-400" },
  { status: "Contato enviado", label: "Contatado", tone: "purple", accent: "bg-violet-400" },
  { status: "Respondeu", label: "Em conversa", tone: "amber", accent: "bg-cyan-400" },
  { status: "Proposta enviada", label: "Proposta enviada", tone: "blue", accent: "bg-indigo-400" },
  { status: "Fechado", label: "Fechado", tone: "green", accent: "bg-emerald-400" },
  { status: "Perdido", label: "Perdido", tone: "red", accent: "bg-red-400" },
] as const satisfies ReadonlyArray<{ status: LeadStatus; label: string; tone: "blue" | "green" | "amber" | "red" | "gray" | "purple"; accent: string }>;

export type StageStatus = (typeof PIPELINE_STAGES)[number]["status"];

/** Etapas antigas que continuam válidas no banco e são agrupadas numa etapa visível. */
const LEGACY_STAGE: Partial<Record<LeadStatus, StageStatus>> = {
  "Reunião marcada": "Respondeu",
  Negociação: "Proposta enviada",
};

/** Status gravados que pertencem a uma etapa visível (inclui os antigos agrupados). */
export function statusesOfStage(stage: StageStatus): LeadStatus[] {
  return [stage, ...(Object.entries(LEGACY_STAGE).filter(([, target]) => target === stage).map(([status]) => status as LeadStatus))];
}

export function stageOf(status: LeadStatus): StageStatus {
  return (LEGACY_STAGE[status] || status) as StageStatus;
}

export function isLegacyStatus(status: LeadStatus) {
  return Boolean(LEGACY_STAGE[status]);
}

export function stageInfo(status: LeadStatus) {
  const stage = stageOf(status);
  return PIPELINE_STAGES.find((item) => item.status === stage) || PIPELINE_STAGES[0];
}

/** Rótulo exibido. Etapas antigas mostram o detalhe original: "Em conversa · Reunião marcada". */
export function stageLabel(status: LeadStatus) {
  const info = stageInfo(status);
  return isLegacyStatus(status) ? `${info.label} · ${status}` : info.label;
}

export function isOpenStage(status: LeadStatus) {
  const stage = stageOf(status);
  return stage !== "Fechado" && stage !== "Perdido";
}
