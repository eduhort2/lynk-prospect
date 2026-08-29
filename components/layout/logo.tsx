import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <Image
          src="/brand/lynk-mark.png"
          alt="LYNK"
          width={40}
          height={40}
          priority
          className="h-9 w-9 object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/lynk-logo.png"
        alt="LYNK"
        width={140}
        height={51}
        priority
        className="h-auto w-[132px] object-contain"
      />
      <div className="hidden border-l border-white/15 pl-3 sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#C3DFEA]">Hub</p>
        <p className="mt-0.5 text-[8px] uppercase tracking-[.16em] text-zinc-600">Gestão interna LYNK</p>
      </div>
    </div>
  );
}
