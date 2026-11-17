import type { Metadata } from "next";
import { AssistantPage } from "@/features/assistant/assistant-page";

export const metadata: Metadata = { title: "Assistente de IA" };

export default function Page() { return <AssistantPage />; }
