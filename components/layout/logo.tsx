import { cn } from "@/lib/utils";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-primary/35 bg-primary/10 shadow-glow">
        <span className="absolute inset-x-1 top-1/2 h-px -rotate-45 bg-primary-light/80" />
        <span className="text-sm font-bold tracking-tighter text-white">L</span>
      </div>
      {!compact ? (
        <div className="leading-none">
          <div className="text-sm font-bold tracking-[.2em] text-white">LYNK</div>
          <div className="mt-1 text-[9px] font-medium uppercase tracking-[.22em] text-primary-light">Prospect</div>
        </div>
      ) : null}
    </div>
  );
}
