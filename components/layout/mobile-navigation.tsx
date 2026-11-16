"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, MAIN_NAVIGATION } from "./navigation";

export function MobileNavigation() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-[#080808]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden" aria-label="Navegação principal">
      {MAIN_NAVIGATION.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-1 text-[11px]", active ? "text-primary-light" : "text-zinc-600")}>
            <Icon className="h-5 w-5" />{item.label}
          </Link>
        );
      })}
    </nav>
  );
}
