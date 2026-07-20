import type { Metadata } from "next";
import { ProjectsPage } from "@/features/projects/projects-page";
import { FeatureGate } from "@/features/billing/feature-gate";

export const metadata: Metadata = { title: "Projetos" };
export default function Page() { return <FeatureGate feature="projects" title="Projetos está disponível no plano Pro"><ProjectsPage /></FeatureGate>; }
