import type { LeadStatus } from "@/types";
import { isLegacyStatus, PIPELINE_STAGES, stageLabel } from "./stages";

/** Opções de etapa. Um lead numa etapa antiga mantém essa opção para não ser alterado sem querer. */
export function StageOptions({ current }: { current?: LeadStatus }) {
  return (
    <>
      {current && isLegacyStatus(current) ? <option value={current}>{stageLabel(current)}</option> : null}
      {PIPELINE_STAGES.map((stage) => <option key={stage.status} value={stage.status}>{stage.label}</option>)}
    </>
  );
}
