import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CHART_BLUE,
  CHART_GRID,
  CHART_RED,
  CHART_TICK,
  ChartTooltip,
  currencyCompact,
} from "@/components/admin/charts";
import { fetchAppointmentsLite, type AppointmentLite } from "@/lib/api";
import {
  addDaysToDate,
  formatBRL,
  formatDateShortPT,
  isoToSpParts,
  spDateTimeToIso,
  todaySpDate,
} from "@/lib/format";
import { WEEKDAY_SHORT } from "@/lib/types";
import { cn } from "@/lib/utils";

type RangeKey = "month" | "3m" | "6m" | "year";
const RANGE_LABEL: Record<RangeKey, string> = {
  month: "Este mês",
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
  year: "Este ano",
};

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function ReportsPage() {
  const today = todaySpDate();
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const [serviceMetric, setServiceMetric] = useState<"count" | "revenue">("count");

  // Busca sempre os últimos 12 meses — cobre todos os recortes locais.
  const yearAgo = `${shiftMonth(monthKeyOf(today), -11)}-01`;
  const { data: lite, isLoading } = useQuery({
    queryKey: ["appointments", "lite", "reports", yearAgo],
    queryFn: () =>
      fetchAppointmentsLite(
        spDateTimeToIso(yearAgo, "00:00"),
        spDateTimeToIso(addDaysToDate(today, 1), "00:00"),
      ),
  });

  const completed = useMemo(
    () => (lite ?? []).filter((a) => a.status === "completed"),
    [lite],
  );

  const rangeStart = useMemo(() => {
    const currentMonth = `${monthKeyOf(today)}-01`;
    if (rangeKey === "month") return currentMonth;
    if (rangeKey === "3m") return `${shiftMonth(monthKeyOf(today), -2)}-01`;
    if (rangeKey === "6m") return `${shiftMonth(monthKeyOf(today), -5)}-01`;
    return `${today.slice(0, 4)}-01-01`;
  }, [rangeKey, today]);

  const inRange = useMemo(
    () => completed.filter((a) => isoToSpParts(a.starts_at).date >= rangeStart),
    [completed, rangeStart],
  );

  /* --------- comparação mensal (últimos 6 meses, sempre) --------- */
  const monthly = useMemo(() => {
    const currentYm = monthKeyOf(today);
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(currentYm, i - 5));
    const byMonth = new Map<string, { revenue: number; count: number }>();
    completed.forEach((a) => {
      const ym = monthKeyOf(isoToSpParts(a.starts_at).date);
      const prev = byMonth.get(ym) ?? { revenue: 0, count: 0 };
      byMonth.set(ym, { revenue: prev.revenue + Number(a.price), count: prev.count + 1 });
    });
    return months.map((ym) => {
      const [y, m] = ym.split("-").map(Number);
      return {
        ym,
        label: `${MONTH_SHORT[m - 1]}/${String(y).slice(2)}`,
        revenue: byMonth.get(ym)?.revenue ?? 0,
        count: byMonth.get(ym)?.count ?? 0,
        isCurrent: ym === currentYm,
      };
    });
  }, [completed, today]);

  const monthComparison = useMemo(() => {
    const current = monthly[5];
    const previous = monthly[4];
    if (!current || !previous) return null;
    const diff =
      previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : null;
    return { current, previous, diff };
  }, [monthly]);

  /* --------- serviços mais vendidos --------- */
  const services = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    inRange.forEach((a) => {
      const key = a.service?.name ?? "Outros";
      const prev = map.get(key) ?? { count: 0, revenue: 0 };
      map.set(key, { count: prev.count + 1, revenue: prev.revenue + Number(a.price) });
    });
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => (serviceMetric === "count" ? b.count - a.count : b.revenue - a.revenue))
      .slice(0, 6);
  }, [inRange, serviceMetric]);

  /* --------- top clientes --------- */
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number; last: string }>();
    inRange.forEach((a: AppointmentLite) => {
      const date = isoToSpParts(a.starts_at).date;
      const prev = map.get(a.customer_id);
      map.set(a.customer_id, {
        name: a.customer?.name ?? "Cliente",
        count: (prev?.count ?? 0) + 1,
        total: (prev?.total ?? 0) + Number(a.price),
        last: prev && prev.last > date ? prev.last : date,
      });
    });
    return [...map.values()].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 8);
  }, [inRange]);

  /* --------- horários e dias mais movimentados --------- */
  const byHour = useMemo(() => {
    const map = new Map<number, number>();
    inRange.forEach((a) => {
      const hour = Number(isoToSpParts(a.starts_at).time.slice(0, 2));
      map.set(hour, (map.get(hour) ?? 0) + 1);
    });
    const hours = [...map.keys()];
    if (hours.length === 0) return [];
    const min = Math.min(...hours);
    const max = Math.max(...hours);
    return Array.from({ length: max - min + 1 }, (_, i) => ({
      label: `${String(min + i).padStart(2, "0")}h`,
      total: map.get(min + i) ?? 0,
    }));
  }, [inRange]);

  const byWeekday = useMemo(() => {
    const map = new Map<number, number>();
    inRange.forEach((a) => {
      const { date } = isoToSpParts(a.starts_at);
      const [y, m, d] = date.split("-").map(Number);
      const weekday = new Date(y, m - 1, d).getDay();
      map.set(weekday, (map.get(weekday) ?? 0) + 1);
    });
    return [1, 2, 3, 4, 5, 6, 0].map((w) => ({
      label: WEEKDAY_SHORT[w],
      total: map.get(w) ?? 0,
    }));
  }, [inRange]);

  const ticket = inRange.length > 0
    ? inRange.reduce((s, a) => s + Number(a.price), 0) / inRange.length
    : 0;

  if (!isLoading && completed.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Ainda não há dados para relatórios"
        description="Conclua os primeiros atendimentos e os gráficos ganham vida aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
          <TabsList className="flex-wrap">
            {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
              <TabsTrigger key={k} value={k}>
                {RANGE_LABEL[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-sm text-navy-400">
          {inRange.length} atendimentos · ticket médio {formatBRL(ticket)}
        </p>
      </div>

      {/* Comparação mensal */}
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Comparação mensal · últimos 6 meses
          </p>
          {monthComparison && monthComparison.diff !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                monthComparison.diff >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-crimson-50 text-crimson-700",
              )}
            >
              {monthComparison.diff >= 0 ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {monthComparison.diff >= 0 ? "+" : ""}
              {monthComparison.diff.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% vs{" "}
              {monthComparison.previous.label}
            </span>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} />
              <YAxis
                tick={CHART_TICK}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={currencyCompact}
              />
              <Tooltip
                cursor={{ fill: "rgba(47, 98, 173, 0.06)" }}
                content={<ChartTooltip valueFormatter={formatBRL} />}
              />
              <Bar dataKey="revenue" name="Faturamento" radius={[4, 4, 0, 0]} maxBarSize={52}>
                {monthly.map((m) => (
                  <Cell key={m.ym} fill={m.isCurrent ? CHART_RED : CHART_BLUE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-navy-300">
          O mês atual aparece em vermelho. Valores de atendimentos concluídos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Serviços mais vendidos */}
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">
              Serviços mais vendidos
            </p>
            <Tabs value={serviceMetric} onValueChange={(v) => setServiceMetric(v as "count" | "revenue")}>
              <TabsList className="h-8">
                <TabsTrigger value="count" className="px-2 py-1 text-xs">
                  Qtde
                </TabsTrigger>
                <TabsTrigger value="revenue" className="px-2 py-1 text-xs">
                  Receita
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-navy-400">Sem dados no período.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {services.map((s) => {
                const max = serviceMetric === "count" ? services[0].count : services[0].revenue;
                const value = serviceMetric === "count" ? s.count : s.revenue;
                return (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-navy-800">{s.name}</span>
                      <span className="font-semibold text-navy-950">
                        {serviceMetric === "count" ? `${s.count}x` : formatBRL(s.revenue)}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-navy-50">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max((value / max) * 100, 4)}%`, background: CHART_BLUE }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top clientes */}
        <div className="rounded-2xl border border-navy-100 bg-white p-5 pb-2 shadow-card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
            Clientes que mais frequentam
          </p>
          {topClients.length === 0 ? (
            <p className="py-3 text-sm text-navy-400">Sem dados no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-2">Cliente</TableHead>
                  <TableHead className="px-2 text-right">Visitas</TableHead>
                  <TableHead className="px-2 text-right">Total</TableHead>
                  <TableHead className="px-2 text-right">Última</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((c) => (
                  <TableRow key={c.name + c.last}>
                    <TableCell className="px-2 font-medium text-navy-900">{c.name}</TableCell>
                    <TableCell className="px-2 text-right">{c.count}</TableCell>
                    <TableCell className="px-2 text-right font-semibold">
                      {formatBRL(c.total)}
                    </TableCell>
                    <TableCell className="px-2 text-right text-navy-400">
                      {formatDateShortPT(c.last)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Horários mais movimentados */}
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
            Horários mais movimentados
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(47, 98, 173, 0.06)" }}
                  content={<ChartTooltip valueFormatter={(v) => `${v} atendimentos`} />}
                />
                <Bar dataKey="total" name="Atendimentos" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dias mais movimentados */}
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
            Dias mais movimentados
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byWeekday} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(47, 98, 173, 0.06)" }}
                  content={<ChartTooltip valueFormatter={(v) => `${v} atendimentos`} />}
                />
                <Bar dataKey="total" name="Atendimentos" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
