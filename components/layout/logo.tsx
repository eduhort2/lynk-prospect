import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-[#071018] p-1.5 shadow-[0_0_24px_rgba(0,184,245,.12)]">
        <Image src="/brand/lynk-mark.png" alt="LYNK" width={32} height={32} priority className="h-full w-full object-contain" />
      </div>
      {!compact ? (
        <div className="leading-none">
          <div className="text-[14px] font-semibold tracking-[.22em] text-white">LYNK</div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[.2em] text-primary-light/70">Prospect</div>
        </div>
      ) : null}
    </div>
  );
}
