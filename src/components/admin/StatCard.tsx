import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
  trendPercent,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  loading?: boolean;
  /** Variação percentual vs. período anterior (mostra seta + cor) */
  trendPercent?: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</p>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
          <Icon className="size-5" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-28" />
      ) : (
        <p className="mt-1 font-display text-[1.7rem] font-semibold leading-tight text-navy-950">
          {value}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-navy-400">
        {typeof trendPercent === "number" && Number.isFinite(trendPercent) && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
              trendPercent >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-crimson-50 text-crimson-700",
            )}
          >
            {trendPercent >= 0 ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {trendPercent >= 0 ? "+" : ""}
            {trendPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </span>
        )}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </div>
  );
}
