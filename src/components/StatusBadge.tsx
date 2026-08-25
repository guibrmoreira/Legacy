import { STATUS_LABEL, type AppointmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  scheduled: "bg-navy-100 text-navy-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-navy-900 text-white",
  cancelled: "bg-navy-50 text-navy-400 line-through",
  no_show: "bg-crimson-100 text-crimson-700",
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled: "bg-navy-500",
  confirmed: "bg-emerald-500",
  in_progress: "bg-amber-500 animate-pulse",
  completed: "bg-emerald-400",
  cancelled: "bg-navy-300",
  no_show: "bg-crimson-500",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
