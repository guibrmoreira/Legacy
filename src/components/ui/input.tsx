import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-navy-200 bg-white px-3 text-sm text-navy-900 shadow-sm transition-colors",
        "placeholder:text-navy-300",
        "focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200/70",
        "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-20 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm transition-colors",
        "placeholder:text-navy-300",
        "focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-200/70",
        "disabled:cursor-not-allowed disabled:bg-navy-50 disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
