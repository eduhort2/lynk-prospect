import type { ReactNode } from "react";
import { MobileNavigation } from "./mobile-navigation";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-grid bg-[size:48px_48px]">
      <div className="min-h-screen">
        <Topbar />
        <main className="mx-auto w-full max-w-[1560px] p-4 pb-24 sm:p-6 lg:px-8 lg:py-7">{children}</main>
      </div>
      <MobileNavigation />
    </div>
  );
}
