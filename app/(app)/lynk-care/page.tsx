import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";
export const metadata: Metadata = { title: "LYNK Care" };
export default function Page() { return <HubModulePage table="care_subscriptions" title="LYNK Care" eyebrow="Operação" description="Controle contratos recorrentes de manutenção e horas utilizadas." singular="Assinatura" searchKeys={["plan_name","status"]} fields={[
  { key: "client_id", label: "ID do cliente", required: true },
  { key: "plan_name", label: "Plano", required: true },
  { key: "monthly_value", label: "Valor mensal", type: "number", required: true },
  { key: "included_hours", label: "Horas incluídas", type: "number", defaultValue: 0 },
  { key: "used_hours", label: "Horas utilizadas", type: "number", defaultValue: 0 },
  { key: "billing_day", label: "Dia de cobrança", type: "number" },
  { key: "status", label: "Status", type: "select", defaultValue: "Ativo", options: ["Ativo","Pausado","Cancelado"] },
  { key: "started_at", label: "Início", type: "date" },
]} columns={[
  { key: "plan_name", label: "Plano" }, { key: "monthly_value", label: "Mensal", format: "currency" }, { key: "included_hours", label: "Horas incluídas" }, { key: "used_hours", label: "Utilizadas" }, { key: "status", label: "Status", format: "status" }
]} />; }
