import type { Metadata } from "next";
import { AgendaPage } from "@/features/agenda/agenda-page";

export const metadata: Metadata = { title: "Tarefas" };
export default function Page() { return <AgendaPage />; }
