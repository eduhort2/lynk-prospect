import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex items-center", className)}>
        <img
          src="/icon"
          alt="LYNK"
          width={40}
          height={40}
          draggable={false}
          className="h-10 w-10 rounded-xl object-contain"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/brand/lynk-logo.png"
        alt="LYNK"
        width={138}
        height={50}
        priority
        className="h-auto w-[132px] object-contain"
      />
      <div className="hidden border-l border-white/15 pl-3 sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-primary">Hub</p>
        <p className="mt-0.5 text-[8px] uppercase tracking-[.16em] text-muted">Gestão interna</p>
      </div>
    </div>
  );
}
