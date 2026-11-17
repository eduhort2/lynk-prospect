"use client";

import { Bot, ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { HOME_PATH, isActivePath, MAIN_NAVIGATION } from "./navigation";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { profile, organization } = useOrganization();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setAccountOpen(false); }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    function onClick(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setAccountOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [accountOpen]);

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) return toast.error("Não foi possível sair", { description: error.message });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#070808]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link href={HOME_PATH} className="shrink-0" aria-label="Ir para Leads">
          <Logo />
        </Link>

        <div className="hidden h-7 w-px bg-line md:block" />

        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="Navegação principal">
          {MAIN_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-primary/30 text-white" : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-200")}>
                <Icon className={cn("h-4 w-4", active && "text-primary-light")} />
                <span>{item.label}</span>
                {active ? <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary-light lg:-bottom-[19px]" /> : null}
              </Link>
            );
          })}
        </nav>

        <div ref={accountRef} className="relative ml-auto shrink-0">
          <button type="button" onClick={() => setAccountOpen((value) => !value)} className="flex items-center gap-2 rounded-lg p-1 text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200" aria-expanded={accountOpen} aria-haspopup="menu" aria-label="Menu da conta">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary-light/15 bg-[#151818] text-xs font-semibold text-primary-light">{initials(profile?.name)}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", accountOpen && "rotate-180")} />
          </button>
          {accountOpen ? (
            <div role="menu" className="animate-menu-in absolute right-0 top-12 w-60 rounded-xl border border-line bg-[#0D0F0F] p-1.5 shadow-2xl">
              <div className="border-b border-line px-3 pb-2.5 pt-1.5">
                <p className="truncate text-xs font-medium text-zinc-200">{profile?.name || "Usuário"}</p>
                <p className="truncate text-[11px] text-zinc-600">{organization?.name || profile?.email}</p>
              </div>
              <Link role="menuitem" href="/assistente" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Bot className="h-3.5 w-3.5" /> Assistente de IA</Link>
              <Link role="menuitem" href="/configuracoes" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><UserRound className="h-3.5 w-3.5" /> Conta</Link>
              <button role="menuitem" type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[.06]"><LogOut className="h-3.5 w-3.5" /> Sair</button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
