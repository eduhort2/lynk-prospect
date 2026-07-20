import type { ReactNode } from "react";
import { MobileNavigation } from "./mobile-navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-grid bg-[size:48px_48px]">
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1560px] p-4 pb-24 sm:p-6 lg:p-7">{children}</main>
      </div>
      <MobileNavigation />
    </div>
  );
}
