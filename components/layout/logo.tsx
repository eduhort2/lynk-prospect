import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <Image
          src="/brand/lynk-symbol-current.svg"
          alt="LYNK"
          width={44}
          height={44}
          priority
          className="h-10 w-10 object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/lynk-wordmark-current.svg"
        alt="LYNK"
        width={150}
        height={64}
        priority
        className="h-auto w-[138px] object-contain"
      />
      <div className="hidden border-l border-white/15 pl-3 sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-primary">Hub</p>
        <p className="mt-0.5 text-[8px] uppercase tracking-[.16em] text-[#7C8485]">Gestão interna</p>
      </div>
    </div>
  );
}
