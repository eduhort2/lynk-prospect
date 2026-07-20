import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "border-primary/20 bg-primary/10 text-primary-light",
  green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  red: "border-red-400/20 bg-red-400/10 text-red-300",
  gray: "border-white/10 bg-white/[.05] text-zinc-300",
  purple: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

export function Badge({
  className,
  tone = "gray",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", tones[tone], className)}
      {...props}
    />
  );
}
