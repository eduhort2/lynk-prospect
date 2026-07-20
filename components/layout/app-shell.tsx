import type { ReactNode } from "react";
import { MobileNavigation } from "./mobile-navigation";
import { PageTransition } from "./page-transition";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-grid bg-[size:48px_48px]">
      <div className="ambient-orb ambient-orb--one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--two" aria-hidden="true" />
      <div className="relative z-10 min-h-screen">
        <Topbar />
        <main className="mx-auto w-full max-w-[1560px] p-4 pb-24 sm:p-6 lg:px-8 lg:py-7"><PageTransition>{children}</PageTransition></main>
      </div>
      <MobileNavigation />
    </div>
  );
}
