import type { Metadata } from "next";
import { ReportsPage } from "@/features/reports/reports-page";
import { FeatureGate } from "@/features/billing/feature-gate";

export const metadata: Metadata = { title: "Relatórios" };
export default function Page() { return <FeatureGate feature="reports" title="Relatórios avançados estão disponíveis no plano Pro"><ReportsPage /></FeatureGate>; }
