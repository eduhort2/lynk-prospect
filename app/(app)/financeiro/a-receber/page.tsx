import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";
export const metadata: Metadata = { title: "A receber" };
export default function Page() { return <HubModulePage table="payments" title="A receber" eyebrow="Financeiro" description="Parcelas e valores pendentes de recebimento." singular="Recebimento" filters={{ status: "Pendente" }} searchKeys={["description","payment_method"]} fields={[
  { key: "client_id", label: "Cliente", type: "relation", relation: { table: "clients", labelKey: "company_name" } },
  { key: "project_id", label: "Projeto", type: "relation", relation: { table: "projects", labelKey: "name" } },
  { key: "description", label: "Descrição", required: true },
  { key: "amount", label: "Valor", type: "number", required: true },
  { key: "due_date", label: "Vencimento", type: "date", required: true },
  { key: "payment_method", label: "Forma de pagamento" },
  { key: "observations", label: "Observações", type: "textarea" },
]} columns={[
  { key: "description", label: "Descrição" }, { key: "due_date", label: "Vencimento", format: "date" }, { key: "amount", label: "Valor", format: "currency" }, { key: "status", label: "Status", format: "status" }
]} />; }
