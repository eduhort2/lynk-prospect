import type { ReactNode } from "react";
import { MobileNavigation } from "./mobile-navigation";
import { PageTransition } from "./page-transition";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-grid bg-[size:64px_64px] opacity-40" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb--two" aria-hidden="true" />

      <Sidebar />

      <div className="relative z-10 min-h-screen lg:pl-60">
        <Topbar />
        <main className="mx-auto w-full max-w-[1680px] px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-7">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}
