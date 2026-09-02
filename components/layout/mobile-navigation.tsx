"use client";

import { CalendarDays, ContactRound, LayoutDashboard, ListFilter, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/pipeline", label: "Pipeline", icon: ListFilter },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/configuracoes", label: "Mais", icon: MoreHorizontal },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-[#08090A]/96 px-1 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden" aria-label="Navegação rápida">
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[9px] font-medium transition-colors",
              active ? "text-accent" : "text-zinc-600 active:bg-white/[.04]",
            )}
          >
            {active ? <span className="absolute top-0 h-0.5 w-7 rounded-full bg-accent" /> : null}
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-accent" : "text-primary/55")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
