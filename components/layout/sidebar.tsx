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
  ListChecks,
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
  {
    label: "Principal",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    items: [
      { href: "/leads", label: "Leads", icon: ContactRound },
      { href: "/pipeline", label: "Pipeline", icon: ListFilter },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/propostas", label: "Propostas", icon: FileText },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/clientes", label: "Clientes", icon: UsersRound },
      { href: "/contratos", label: "Contratos", icon: FileCheck2 },
      { href: "/documentos", label: "Documentos", icon: ReceiptText },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/tarefas", label: "Tarefas", icon: ListChecks },
      { href: "/lynk-care", label: "LYNK Care", icon: HeartHandshake },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/financeiro", label: "Visão geral", icon: WalletCards },
      { href: "/financeiro/a-receber", label: "A receber", icon: HandCoins },
      { href: "/financeiro/recebidos", label: "Recebidos", icon: ReceiptText },
      { href: "/financeiro/recorrencias", label: "Recorrências", icon: HeartHandshake },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/configuracoes/servicos", label: "Serviços e preços", icon: PackageOpen },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== "/financeiro" && item.href !== "/configuracoes" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-lg border px-3 text-sm transition-all",
        active
          ? "border-white/[.06] bg-white/[.055] text-white shadow-[inset_3px_0_0_#F27E2D]"
          : "border-transparent text-muted hover:border-white/[.04] hover:bg-white/[.03] hover:text-zinc-100",
      )}
    >
      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-accent" : "text-primary/60 group-hover:text-primary")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar({ mobile = false }: { mobile?: boolean }) {
  return (
    <aside
      className={cn(
        "flex-col border-r border-line bg-[#070809]/96 backdrop-blur-xl",
        mobile ? "flex h-full w-full" : "fixed inset-y-0 left-0 z-30 hidden w-60 lg:flex",
      )}
    >
      <div className="flex h-[72px] items-center border-b border-line px-5">
        <Logo />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <nav className="space-y-6" aria-label="Navegação do LYNK Hub">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[.2em] text-zinc-600">{group.label}</p>
              <div className="space-y-1">{group.items.map((item) => <NavLink key={item.href} item={item} />)}</div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-line p-3">
        <div className="rounded-xl border border-primary/10 bg-card/80 px-3 py-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-accent" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200">LYNK Hub</p>
              <p className="mt-0.5 truncate text-[10px] text-muted">Gestão interna</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
