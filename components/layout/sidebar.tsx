"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  CalendarDays,
  ContactRound,
  FileCheck2,
  FileText,
  FolderKanban,
  HandCoins,
  HeartHandshake,
  LayoutDashboard,
  ListFilter,
  PackageOpen,
  ReceiptText,
  Settings,
  UsersRound,
  WalletCards,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Comercial", items: [
    { href: "/leads", label: "Leads", icon: ContactRound },
    { href: "/pipeline", label: "Pipeline", icon: ListFilter },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/propostas", label: "Propostas", icon: FileText },
  ] },
  { label: "Clientes", items: [
    { href: "/clientes", label: "Clientes", icon: UsersRound },
    { href: "/contratos", label: "Contratos", icon: FileCheck2 },
    { href: "/documentos", label: "Documentos", icon: ReceiptText },
  ] },
  { label: "Operação", items: [
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/tarefas", label: "Tarefas", icon: Wrench },
    { href: "/lynk-care", label: "LYNK Care", icon: HeartHandshake },
  ] },
  { label: "Financeiro", items: [
    { href: "/financeiro", label: "Visão geral", icon: WalletCards },
    { href: "/financeiro/a-receber", label: "A receber", icon: HandCoins },
    { href: "/financeiro/recebidos", label: "Recebidos", icon: ReceiptText },
    { href: "/financeiro/recorrencias", label: "Recorrências", icon: HeartHandshake },
  ] },
  { label: "Gestão", items: [
    { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
    { href: "/configuracoes/servicos", label: "Serviços e preços", icon: PackageOpen },
    { href: "/configuracoes", label: "Equipe e configurações", icon: Settings },
  ] },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== "/financeiro" && item.href !== "/configuracoes" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn(
      "group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all",
      active
        ? "border-primary/15 bg-primary/[.08] text-white shadow-[inset_3px_0_0_#F27E2D]"
        : "border-transparent text-muted hover:border-white/[.04] hover:bg-white/[.035] hover:text-zinc-200",
    )}>
      <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-primary/70")} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  return (
    <aside className={cn("flex-col border-r border-line bg-background", mobile ? "flex h-full w-full" : "fixed inset-y-0 left-0 z-30 hidden w-64 lg:flex")}>
      <div className="flex h-20 items-center border-b border-line px-6"><Logo /></div>
      <div className="mx-4 my-4 rounded-xl border border-primary/10 bg-card p-3 shadow-panel">
        <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-accent">Workspace</span>
        <p className="mt-2 text-xs font-medium text-white">LYNK Hub</p>
        <p className="mt-1 text-[10px] text-muted">Gestão comercial e operacional</p>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((group, index) => <div key={`${group.label}-${index}`}>
          {group.label ? <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.18em] text-muted/60">{group.label}</p> : null}
          <div className="space-y-1">{group.items.map((item) => <NavLink key={item.href} item={item} />)}</div>
        </div>)}
      </nav>
    </aside>
  );
}
