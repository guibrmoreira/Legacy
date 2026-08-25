import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-navy-100 text-navy-700",
        navy: "bg-navy-900 text-white",
        red: "bg-crimson-100 text-crimson-700",
        "red-solid": "bg-crimson-600 text-white",
        green: "bg-emerald-100 text-emerald-700",
        amber: "bg-amber-100 text-amber-700",
        gray: "bg-navy-50 text-navy-400",
        outline: "border border-navy-200 text-navy-600",
        cream: "bg-cream-100 text-navy-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
