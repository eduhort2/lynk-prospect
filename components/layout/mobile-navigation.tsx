"use client";

import { ContactRound, LayoutDashboard, ListFilter, MoreHorizontal, SearchCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/prospeccao", label: "Prospectar", icon: SearchCheck },
  { href: "/pipeline", label: "Pipeline", icon: ListFilter },
  { href: "/configuracoes", label: "Mais", icon: MoreHorizontal },
];

export function MobileNavigation() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-[#080808]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
      {links.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-1 text-[10px]", active ? "text-primary-light" : "text-zinc-600")}>
            <Icon className="h-4 w-4" />{item.label}
          </Link>
        );
      })}
    </nav>
  );
}
