"use client";

import { LogOut, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import { useOrganization } from "@/features/auth/organization-provider";
import { Sidebar } from "./sidebar";

const routeNames: Record<string, string> = {
  dashboard: "Visão geral",
  leads: "Leads",
  pipeline: "Pipeline comercial",
  agenda: "Agenda",
  clientes: "Clientes",
  projetos: "Projetos",
  prompts: "Criador de prompts",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { profile, organization } = useOrganization();
  const [open, setOpen] = useState(false);
  const page = routeNames[pathname.split("/")[1]] || "LYNK Prospect";

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error("Não foi possível sair", { description: error.message });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-[#050505]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm font-medium text-white">{page}</p>
            <p className="hidden text-xs text-zinc-600 sm:block">{organization?.name || "Carregando organização..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-zinc-200">{profile?.name || "Usuário"}</p>
            <p className="text-[11px] text-zinc-600">{profile?.email}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-semibold text-primary-light">
            {initials(profile?.name)}
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden" onMouseDown={() => setOpen(false)}>
          <div className="relative h-full w-64 bg-[#070707]" onMouseDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)}>
            <Sidebar mobile />
          </div>
        </div>
      ) : null}
    </>
  );
}
