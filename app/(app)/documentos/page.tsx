import type { Metadata } from "next";
import { HubModulePage } from "@/features/hub/module-page";

export const metadata: Metadata = { title: "Documentos" };
export default function Page() {
  return <HubModulePage table="documents" title="Documentos" eyebrow="Clientes" description="Organize contratos, briefings, comprovantes e entregas em um único lugar." singular="Documento" searchKeys={["name","type","description"]} fields={[
    { key: "name", label: "Nome", required: true },
    { key: "type", label: "Tipo", type: "select", required: true, defaultValue: "Outro", options: ["Proposta","Contrato","Briefing","Comprovante","Entrega","Outro"] },
    { key: "file_url", label: "Arquivo / URL", type: "url", required: true },
    { key: "description", label: "Descrição", type: "textarea" },
  ]} columns={[
    { key: "name", label: "Nome" }, { key: "type", label: "Tipo", format: "status" }, { key: "file_url", label: "Arquivo" }, { key: "created_at", label: "Criado em", format: "date" }
  ]} />;
}
