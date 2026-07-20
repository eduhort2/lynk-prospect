import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/[.08] bg-[#151613] p-1.5">
        <Image src="/brand/lynk-mark.png" alt="LYNK" width={28} height={28} priority className="h-full w-full object-contain" />
      </div>
      {!compact ? (
        <div className="leading-none">
          <div className="text-[13px] font-semibold tracking-[.19em] text-white">LYNK</div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[.18em] text-zinc-500">Prospect</div>
        </div>
      ) : null}
    </div>
  );
}
