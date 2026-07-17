import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full resize-y rounded-xl border border-line bg-[#090909] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/70 focus:ring-2 focus:ring-primary/15",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
