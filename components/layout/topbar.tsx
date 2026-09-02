"use client";

import { Bell, CircleHelp, LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import { Sidebar } from "./sidebar";

export function Topbar() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { profile, organization } = useOrganization();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error("Não foi possível sair", { description: error.message });
    router.replace("/login");
    router.refresh();
  }

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/leads?search=${encodeURIComponent(value)}` : "/leads");
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-background/88 backdrop-blur-2xl">
        <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="shrink-0 lg:hidden" aria-label="Ir para o início">
            <Logo compact />
          </Link>

          <form onSubmit={search} className="hidden w-full max-w-xl lg:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar empresa, contato, cidade..."
                className="h-10 border-white/[.06] bg-card/70 pl-10 pr-16"
                aria-label="Busca global"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[9px] text-zinc-600">Enter</span>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" aria-label="Notificações" className="hidden sm:inline-flex">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Ajuda" className="hidden md:inline-flex">
              <CircleHelp className="h-4 w-4" />
            </Button>

            <div className="hidden h-7 w-px bg-line sm:block" />

            <Link href="/configuracoes" className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 pr-2 transition hover:border-line hover:bg-white/[.025]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/15 bg-surface text-xs font-semibold text-primary">{initials(profile?.name)}</span>
              <span className="hidden min-w-0 text-left xl:block">
                <span className="block max-w-36 truncate text-xs font-medium text-zinc-200">{profile?.name || "Usuário"}</span>
                <span className="mt-0.5 block max-w-36 truncate text-[10px] text-muted">{organization?.name || "LYNK Hub"}</span>
              </span>
            </Link>

            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden" onMouseDown={() => setMobileOpen(false)}>
          <div className="relative h-full w-[min(84vw,320px)] bg-background" onMouseDown={(event) => event.stopPropagation()} onClick={() => setMobileOpen(false)}>
            <Sidebar mobile />
          </div>
        </div>
      ) : null}
    </>
  );
}
