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
      {!compact ? <span className="sr-only">LYNK Prospect</span> : null}
    </div>
  );
}
