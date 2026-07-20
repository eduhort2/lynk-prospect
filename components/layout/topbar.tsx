"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ContactRound,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Menu,
  SearchCheck,
  Settings,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/features/auth/organization-provider";
import { useSubscription } from "@/features/billing/use-subscription";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { Sidebar } from "./sidebar";

const mainLinks = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/prospeccao", label: "Prospectar", icon: SearchCheck },
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/pipeline", label: "Pipeline", icon: ListFilter },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
];

const moreLinks = [
  { href: "/clientes", label: "Clientes", description: "Empresas convertidas", icon: UsersRound },
  { href: "/projetos", label: "Projetos", description: "Produção de landing pages", icon: FolderKanban },
  { href: "/prompts", label: "Prompts", description: "Briefings estruturados", icon: WandSparkles },
  { href: "/relatorios", label: "Relatórios", description: "Resultados da operação", icon: BarChart3 },
  { href: "/planos", label: "Plano e cobrança", description: "Recursos e assinatura", icon: CreditCard },
  { href: "/configuracoes", label: "Configurações", description: "Perfil, equipe e empresa", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { profile, organization } = useOrganization();
  const subscription = useSubscription();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const planName = subscription.data?.plan?.name || "Gratuito";
  const moreActive = moreLinks.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error("Não foi possível sair", { description: error.message });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/dashboard" className="shrink-0" aria-label="Ir para o início">
            <Logo />
          </Link>

          <div className="hidden h-7 w-px bg-line lg:block" />

          <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Navegação principal">
            {mainLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={cn("relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors xl:text-sm", active ? "bg-primary/30 text-white" : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200")}>
                  <Icon className={cn("h-4 w-4", active && "text-primary-light")} />
                  <span>{item.label}</span>
                  {active ? <span className="absolute inset-x-3 -bottom-[19px] h-0.5 rounded-full bg-primary-light" /> : null}
                </Link>
              );
            })}

            <div className="relative">
              <button type="button" onClick={() => setMoreOpen((value) => !value)} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors xl:text-sm", moreActive || moreOpen ? "bg-primary/30 text-white" : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200")} aria-expanded={moreOpen}>
                <span>Mais</span><ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
              </button>
              {moreOpen ? (
                <div className="absolute left-0 top-12 grid w-[430px] grid-cols-2 gap-1 rounded-xl border border-line bg-[#0B101A] p-2 shadow-2xl">
                  {moreLinks.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <Link key={item.href} href={item.href} className={cn("flex gap-3 rounded-lg p-3 transition-colors", active ? "bg-primary/30" : "hover:bg-white/[.045]")}>
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-[#111827]", active && "border-primary-light/20 text-primary-light")}><Icon className="h-4 w-4" /></div>
                        <div><p className="text-xs font-medium text-zinc-100">{item.label}</p><p className="mt-1 text-[10px] leading-4 text-zinc-600">{item.description}</p></div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link href="/planos" className="hidden rounded-lg border border-primary-light/15 bg-primary/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-primary-light xl:block">{planName}</Link>
            <div className="hidden max-w-36 text-right 2xl:block"><p className="truncate text-xs font-medium text-zinc-200">{profile?.name || "Usuário"}</p><p className="truncate text-[10px] text-zinc-600">{organization?.name}</p></div>
            <Link href="/configuracoes" className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-light/15 bg-[#111827] text-xs font-semibold text-primary-light" aria-label="Abrir configurações">{initials(profile?.name)}</Link>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden" onMouseDown={() => setMobileOpen(false)}>
          <div className="relative h-full w-72 max-w-[86vw] bg-[#080B12]" onMouseDown={(event) => event.stopPropagation()} onClick={() => setMobileOpen(false)}><Sidebar mobile /></div>
        </div>
      ) : null}
    </>
  );
}
