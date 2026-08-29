import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";
export const metadata: Metadata = { title: "Recorrências" };
export default function Page() { return <HubModulePage table="care_subscriptions" title="Recorrências" eyebrow="Financeiro" description="Receita mensal ativa de manutenção e LYNK Care." singular="Recorrência" filters={{ status: "Ativo" }} searchKeys={["plan_name"]} fields={[
  { key: "client_id", label: "Cliente", type: "relation", required: true, relation: { table: "clients", labelKey: "company_name" } },
  { key: "project_id", label: "Projeto", type: "relation", relation: { table: "projects", labelKey: "name" } },
  { key: "plan_name", label: "Plano", required: true },
  { key: "monthly_value", label: "Valor mensal", type: "number", required: true },
  { key: "billing_day", label: "Dia de cobrança", type: "number" },
  { key: "included_hours", label: "Horas incluídas", type: "number", defaultValue: 0 },
  { key: "started_at", label: "Início", type: "date" },
]} columns={[
  { key: "plan_name", label: "Plano" }, { key: "monthly_value", label: "Mensal", format: "currency" }, { key: "billing_day", label: "Dia de cobrança" }, { key: "status", label: "Status", format: "status" }
]} />; }
