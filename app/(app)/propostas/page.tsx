import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";

export const metadata: Metadata = { title: "Propostas" };

export default function Page() {
  return <HubModulePage
    table="proposals"
    title="Propostas"
    eyebrow="Comercial"
    description="Controle propostas, validade, condições comerciais e avanço até o aceite."
    singular="Proposta"
    searchKeys={["number", "status", "payment_terms"]}
    fields={[
      { key: "number", label: "Número", required: true, placeholder: "PROP-2026-001" },
      { key: "proposal_date", label: "Data", type: "date", required: true },
      { key: "valid_until", label: "Validade", type: "date" },
      { key: "status", label: "Status", type: "select", required: true, defaultValue: "Rascunho", options: ["Rascunho","Enviada","Visualizada","Negociação","Aceita","Recusada","Expirada"] },
      { key: "payment_terms", label: "Condição de pagamento", placeholder: "50% entrada + 50% na entrega" },
      { key: "discount", label: "Desconto", type: "number", defaultValue: 0 },
      { key: "observations", label: "Observações", type: "textarea" },
    ]}
    columns={[
      { key: "number", label: "Número" },
      { key: "proposal_date", label: "Data", format: "date" },
      { key: "valid_until", label: "Validade", format: "date" },
      { key: "status", label: "Status", format: "status" },
      { key: "total", label: "Total", format: "currency" },
    ]}
  />;
}
