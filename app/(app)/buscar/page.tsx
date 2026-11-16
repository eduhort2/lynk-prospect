import type { Metadata } from "next";
import { LeadFinderPage } from "@/features/lead-finder/lead-finder-page";

export const metadata: Metadata = { title: "Buscar leads" };

export default function Page() { return <LeadFinderPage />; }
