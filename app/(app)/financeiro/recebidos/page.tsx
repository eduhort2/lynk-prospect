import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";
export const metadata: Metadata = { title: "Recebidos" };
export default function Page() { return <HubModulePage table="payments" title="Recebidos" eyebrow="Financeiro" description="Histórico de valores já recebidos pela LYNK." singular="Recebimento" filters={{ status: "Pago" }} searchKeys={["description","payment_method"]} fields={[
  { key: "client_id", label: "Cliente", type: "relation", relation: { table: "clients", labelKey: "company_name" } },
  { key: "project_id", label: "Projeto", type: "relation", relation: { table: "projects", labelKey: "name" } },
  { key: "description", label: "Descrição", required: true },
  { key: "amount", label: "Valor", type: "number", required: true },
  { key: "due_date", label: "Vencimento", type: "date", required: true },
  { key: "paid_at", label: "Data do pagamento", type: "date", required: true },
  { key: "payment_method", label: "Forma de pagamento" },
  { key: "observations", label: "Observações", type: "textarea" },
]} columns={[
  { key: "description", label: "Descrição" }, { key: "paid_at", label: "Pago em", format: "date" }, { key: "payment_method", label: "Forma" }, { key: "amount", label: "Valor", format: "currency" }
]} />; }
