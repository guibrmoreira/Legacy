import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 px-6 py-12 text-center animate-fade-in",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm">
        <Icon className="size-6 text-navy-300" />
      </div>
      <div>
        <p className="font-semibold text-navy-800">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-navy-400">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
