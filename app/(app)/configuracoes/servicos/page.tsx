import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";

export const metadata: Metadata = { title: "Catálogo de serviços" };
export default function Page() {
  return <HubModulePage table="services" title="Catálogo de serviços" eyebrow="Gestão" description="Preços-base dos serviços da LYNK. Os valores ficam no banco e podem ser ajustados pela operação." singular="Serviço" searchKeys={["name","description","price_type"]} fields={[
    { key: "name", label: "Nome", required: true },
    { key: "base_price", label: "Preço-base", type: "number", required: true, defaultValue: 0 },
    { key: "price_type", label: "Modelo de preço", type: "select", required: true, defaultValue: "fixed", options: ["fixed","starting_at","monthly","hourly"] },
    { key: "description", label: "Descrição", type: "textarea" },
  ]} columns={[
    { key: "name", label: "Serviço" },
    { key: "base_price", label: "Preço-base", format: "currency" },
    { key: "price_type", label: "Modelo", format: "status" },
    { key: "active", label: "Ativo" },
  ]} />;
}
