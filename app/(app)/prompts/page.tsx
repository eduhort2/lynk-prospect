import type { Metadata } from "next";
import { PromptsPage } from "@/features/prompts/prompts-page";

export const metadata: Metadata = { title: "Prompts" };
export default function Page() { return <PromptsPage />; }
