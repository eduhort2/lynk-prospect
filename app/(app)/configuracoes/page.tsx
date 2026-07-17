import type { Metadata } from "next";
import { SettingsPage } from "@/features/auth/settings-page";

export const metadata: Metadata = { title: "Configurações" };
export default function Page() { return <SettingsPage />; }
