import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";

export const metadata: Metadata = { title: "Contratos" };
export default function Page() {
  return <HubModulePage table="contracts" title="Contratos" eyebrow="Clientes" description="Acompanhe contratos enviados, assinados, vigentes e encerrados." singular="Contrato" searchKeys={["number","service","status"]} fields={[
    { key: "client_id", label: "ID do cliente", required: true, placeholder: "UUID do cliente" },
    { key: "number", label: "Número", required: true, placeholder: "CTR-2026-001" },
    { key: "service", label: "Serviço", required: true },
    { key: "value", label: "Valor", type: "number", required: true, defaultValue: 0 },
    { key: "status", label: "Status", type: "select", required: true, defaultValue: "Rascunho", options: ["Rascunho","Enviado","Assinado","Vigente","Encerrado","Cancelado"] },
    { key: "starts_at", label: "Início", type: "date" },
    { key: "ends_at", label: "Término", type: "date" },
    { key: "payment_terms", label: "Condição de pagamento" },
    { key: "scope", label: "Escopo", type: "textarea" },
    { key: "document_url", label: "Documento", type: "url" },
  ]} columns={[
    { key: "number", label: "Número" }, { key: "service", label: "Serviço" }, { key: "status", label: "Status", format: "status" }, { key: "value", label: "Valor", format: "currency" }, { key: "starts_at", label: "Início", format: "date" }
  ]} />;
}
