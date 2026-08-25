import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-crimson-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-navy-900 text-white shadow-sm hover:bg-navy-800",
        red: "bg-crimson-600 text-white shadow-md shadow-crimson-600/25 hover:bg-crimson-700 hover:shadow-lg hover:shadow-crimson-600/30",
        outline: "border border-navy-200 bg-white text-navy-900 hover:border-navy-300 hover:bg-navy-50",
        ghost: "text-navy-700 hover:bg-navy-100/70 hover:text-navy-900",
        soft: "bg-navy-100/80 text-navy-800 hover:bg-navy-200/70",
        danger: "bg-crimson-50 text-crimson-700 border border-crimson-200 hover:bg-crimson-100",
        light:
          "border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/40",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base [&_svg]:size-5",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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

export { buttonVariants };
