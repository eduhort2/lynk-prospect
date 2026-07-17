import type { ReactNode } from "react";
import { MobileNavigation } from "./mobile-navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-grid bg-[size:32px_32px]">
      <Sidebar />
      <div className="min-h-screen lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] p-4 pb-24 sm:p-6 lg:p-8">{children}</main>
      </div>
      <MobileNavigation />
    </div>
  );
}
