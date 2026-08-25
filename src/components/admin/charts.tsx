/**
 * Bases compartilhadas dos gráficos (recharts).
 * Série única em azul; vermelho apenas como destaque pontual
 * (a identidade fica no eixo/rotulagem, nunca só na cor).
 * Par azul+vermelho validado para daltonismo e contraste.
 */

export const CHART_BLUE = "#2f62ad";
export const CHART_RED = "#b7202f";
export const CHART_GRID = "#e4eaf3";
export const CHART_TICK = { fill: "#8093ad", fontSize: 12 } as const;

export function currencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const fmt = valueFormatter ?? ((v: number) => String(v));
  return (
    <div className="rounded-xl border border-navy-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label !== undefined && (
        <p className="mb-1 text-xs font-semibold text-navy-900">
          {labelFormatter ? labelFormatter(String(label)) : String(label)}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 text-xs text-navy-500">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: entry.color ?? CHART_BLUE }}
          />
          {entry.name && <span>{entry.name}:</span>}
          <span className="font-semibold text-navy-900">{fmt(Number(entry.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}
