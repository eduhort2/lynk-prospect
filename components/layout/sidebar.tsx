"use client";

import {
  BarChart3,
  CreditCard,
  CalendarDays,
  ContactRound,
  FolderKanban,
  LayoutDashboard,
  ListFilter,
  Settings,
  SearchCheck,
  WandSparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { useSubscription } from "@/features/billing/use-subscription";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/prospeccao", label: "Gerar prospecção", icon: SearchCheck },
  { href: "/pipeline", label: "Pipeline", icon: ListFilter },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: UsersRound },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/prompts", label: "Prompts", icon: WandSparkles },
];

const secondary = [
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/planos", label: "Plano e cobrança", icon: CreditCard },
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
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        active ? "bg-white/[.07] text-white" : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200",
      )}
    >
      <Icon className={cn("h-4 w-4", active && "text-primary-light")} />
      <span>{item.label}</span>
      {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
    </Link>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const subscription = useSubscription();
  const planName = subscription.data?.plan?.name || "Gratuito";
  return (
    <aside className={cn("w-64 border-r border-line bg-[#0C0D0B] flex-col", mobile ? "flex h-full" : "fixed inset-y-0 left-0 z-30 hidden lg:flex")}>
      <div className="flex h-20 items-center border-b border-line px-6"><Logo /></div>
      <div className="mx-4 my-4 rounded-lg border border-line bg-[#121310] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-500">Workspace</span>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-[9px] font-semibold uppercase text-primary-light">{planName}</span>
        </div>
        <p className="mt-2 truncate text-xs font-medium text-zinc-200">Operação comercial</p>
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
