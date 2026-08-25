import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/lynk-logo.png"
        alt="LYNK"
        width={140}
        height={51}
        priority
        className={cn("h-auto object-contain", compact ? "w-9 object-left" : "w-[132px]")}
      />
      {!compact ? <div className="hidden border-l border-white/15 pl-3 sm:block"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#C3DFEA]">Prospect</p><p className="mt-0.5 text-[8px] uppercase tracking-[.16em] text-zinc-600">Conecte. Construa. Cresça.</p></div> : null}
    </div>
  );
}
