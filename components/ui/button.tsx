import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary px-4 py-2.5 text-[#0B0D09] hover:bg-primary-light",
        secondary: "border border-line bg-surface px-4 py-2.5 text-white hover:border-white/20 hover:bg-white/[.05]",
        ghost: "px-3 py-2 text-zinc-300 hover:bg-white/[.06] hover:text-white",
        danger: "bg-red-500/12 px-4 py-2.5 text-red-300 hover:bg-red-500/20",
        outline: "border border-primary/35 bg-transparent px-4 py-2.5 text-primary-light hover:bg-primary/8",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
