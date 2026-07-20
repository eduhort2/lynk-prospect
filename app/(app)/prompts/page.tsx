import type { Metadata } from "next";
import { PromptsPage } from "@/features/prompts/prompts-page";
import { FeatureGate } from "@/features/billing/feature-gate";

export const metadata: Metadata = { title: "Prompts" };
export default function Page() { return <FeatureGate feature="prompts" title="Prompts está disponível no plano Starter"><PromptsPage /></FeatureGate>; }
