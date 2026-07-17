"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ContactRound,
  FolderKanban,
  LayoutDashboard,
  ListFilter,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/pipeline", label: "Pipeline", icon: ListFilter },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: UsersRound },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/prompts", label: "Prompts", icon: Sparkles },
];

const secondary = [
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function NavLink({ item }: { item: (typeof primary)[number] }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        active ? "bg-primary/12 text-white" : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200",
      )}
    >
      <Icon className={cn("h-4 w-4", active && "text-primary-light")} />
      <span>{item.label}</span>
      {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_#2F7DFF]" /> : null}
    </Link>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  return (
    <aside className={cn("w-64 border-r border-line bg-[#070707] flex-col", mobile ? "flex h-full" : "fixed inset-y-0 left-0 z-30 hidden lg:flex")}>
      <div className="flex h-20 items-center px-6"><Logo /></div>
      <div className="mx-4 mb-5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/12 to-transparent p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary-light">
          <BriefcaseBusiness className="h-4 w-4" /> Operação LYNK
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">Prospecção, fechamento e produção em um só fluxo.</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {primary.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>
      <nav className="space-y-1 border-t border-line p-3">
        {secondary.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>
    </aside>
  );
}
