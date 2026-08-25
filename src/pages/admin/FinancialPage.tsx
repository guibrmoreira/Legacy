import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, ClipboardList, PiggyBank, Receipt, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/admin/StatCard";
import {
  CHART_BLUE,
  CHART_GRID,
  CHART_TICK,
  ChartTooltip,
  currencyCompact,
} from "@/components/admin/charts";
import { fetchAppointmentsLite, fetchTransactionsBetween } from "@/lib/api";
import {
  addDaysToDate,
  dateParts,
  formatBRL,
  formatDateShortPT,
  spDateTimeToIso,
  todaySpDate,
} from "@/lib/format";

type PeriodKey = "today" | "week" | "month" | "prevMonth" | "custom";

function monthStartOf(date: string): string {
  return `${date.slice(0, 8)}01`;
}

function monthEndOf(date: string): string {
  const { y, m } = dateParts(monthStartOf(date));
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  return addDaysToDate(next, -1);
}

function daysBetween(from: string, to: string): number {
  const a = dateParts(from);
  const b = dateParts(to);
  return Math.round(
    (new Date(b.y, b.m - 1, b.d).getTime() - new Date(a.y, a.m - 1, a.d).getTime()) / 86_400_000,
  );
}

export function FinancialPage() {
  const today = todaySpDate();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState(monthStartOf(today));
  const [customTo, setCustomTo] = useState(today);

  const range = useMemo(() => {
    if (period === "today") {
      return { from: today, to: today, prevFrom: addDaysToDate(today, -1), prevTo: addDaysToDate(today, -1), label: "hoje", prevLabel: "ontem" };
    }
    if (period === "week") {
      const weekStart = addDaysToDate(today, -dateParts(today).weekday);
      return {
        from: weekStart,
        to: addDaysToDate(weekStart, 6),
        prevFrom: addDaysToDate(weekStart, -7),
        prevTo: addDaysToDate(weekStart, -1),
        label: "esta semana",
        prevLabel: "semana anterior",
      };
    }
    if (period === "month") {
      const start = monthStartOf(today);
      const prevEnd = addDaysToDate(start, -1);
      return {
        from: start,
        to: monthEndOf(today),
        prevFrom: monthStartOf(prevEnd),
        prevTo: prevEnd,
        label: "este mês",
        prevLabel: "mês anterior",
      };
    }
    if (period === "prevMonth") {
      const currentStart = monthStartOf(today);
      const prevEnd = addDaysToDate(currentStart, -1);
      const prevStart = monthStartOf(prevEnd);
      const prevPrevEnd = addDaysToDate(prevStart, -1);
      return {
        from: prevStart,
        to: prevEnd,
        prevFrom: monthStartOf(prevPrevEnd),
        prevTo: prevPrevEnd,
        label: "mês anterior",
        prevLabel: "mês retrasado",
      };
    }
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    const len = daysBetween(from, to) + 1;
    return {
      from,
      to,
      prevFrom: addDaysToDate(from, -len),
      prevTo: addDaysToDate(from, -1),
      label: "período",
      prevLabel: "período anterior",
    };
  }, [period, today, customFrom, customTo]);

  const { data: transactions } = useQuery({
    queryKey: ["transactions", range.from, range.to],
    queryFn: () => fetchTransactionsBetween(range.from, range.to),
  });
  const { data: prevTransactions } = useQuery({
    queryKey: ["transactions", range.prevFrom, range.prevTo],
    queryFn: () => fetchTransactionsBetween(range.prevFrom, range.prevTo),
  });
  const { data: completedLite } = useQuery({
    queryKey: ["appointments", "lite", range.from, range.to],
    queryFn: () =>
      fetchAppointmentsLite(
        spDateTimeToIso(range.from, "00:00"),
        spDateTimeToIso(addDaysToDate(range.to, 1), "00:00"),
      ),
  });
  const { data: upcomingLite } = useQuery({
    queryKey: ["appointments", "lite", "upcoming"],
    queryFn: () =>
      fetchAppointmentsLite(
        new Date().toISOString(),
        spDateTimeToIso(addDaysToDate(today, 45), "00:00"),
      ),
  });

  const stats = useMemo(() => {
    const income = (transactions ?? []).filter((t) => t.type === "income");
    const revenue = income.reduce((s, t) => s + Number(t.amount), 0);
    const prevRevenue = (prevTransactions ?? [])
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const count = income.length;
    const upcoming = (upcomingLite ?? [])
      .filter((a) => ["scheduled", "confirmed", "in_progress"].includes(a.status))
      .reduce((s, a) => s + Number(a.price), 0);
    return {
      revenue,
      prevRevenue,
      trend: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      count,
      ticket: count > 0 ? revenue / count : 0,
      upcoming,
    };
  }, [transactions, prevTransactions, upcomingLite]);

  const dailyChart = useMemo(() => {
    const byDay = new Map<string, number>();
    (transactions ?? [])
      .filter((t) => t.type === "income")
      .forEach((t) => byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + Number(t.amount)));
    const len = daysBetween(range.from, range.to) + 1;
    const days: { day: string; total: number }[] = [];
    for (let i = 0; i < Math.min(len, 62); i++) {
      const date = addDaysToDate(range.from, i);
      if (date > today && period !== "custom") break;
      const [, m, d] = date.split("-");
      days.push({ day: `${d}/${m}`, total: byDay.get(date) ?? 0 });
    }
    return days;
  }, [transactions, range, today, period]);

  const topServices = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    (completedLite ?? [])
      .filter((a) => a.status === "completed")
      .forEach((a) => {
        const key = a.service?.name ?? "Outros";
        const prev = map.get(key) ?? { count: 0, revenue: 0 };
        map.set(key, { count: prev.count + 1, revenue: prev.revenue + Number(a.price) });
      });
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [completedLite]);

  const bestDays = useMemo(() => {
    const byDay = new Map<string, number>();
    (transactions ?? [])
      .filter((t) => t.type === "income")
      .forEach((t) => byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + Number(t.amount)));
    return [...byDay.entries()]
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [transactions]);

  const maxServiceRevenue = topServices[0]?.revenue ?? 1;
  const hasData = stats.count > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Seletor de período */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">Esta semana</TabsTrigger>
            <TabsTrigger value="month">Este mês</TabsTrigger>
            <TabsTrigger value="prevMonth">Mês anterior</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
          </TabsList>
        </Tabs>
        {period === "custom" && (
          <div className="flex items-end gap-2">
            <div>
              <Label htmlFor="fin-from" className="text-xs">
                De
              </Label>
              <Input
                id="fin-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="fin-to" className="text-xs">
                Até
              </Label>
              <Input
                id="fin-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={`Faturamento (${range.label})`}
          value={formatBRL(stats.revenue)}
          icon={Wallet}
          trendPercent={stats.trend}
          sub={`${range.prevLabel}: ${formatBRL(stats.prevRevenue)}`}
        />
        <StatCard
          label="Atendimentos"
          value={stats.count}
          icon={ClipboardList}
          sub="concluídos no período"
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(stats.ticket)}
          icon={Receipt}
          sub="por atendimento"
        />
        <StatCard
          label="A receber (45 dias)"
          value={formatBRL(stats.upcoming)}
          icon={PiggyBank}
          sub="agendamentos futuros ativos"
        />
      </div>

      {!hasData ? (
        <EmptyState
          icon={CalendarRange}
          title="Sem faturamento neste período"
          description="Quando você concluir atendimentos, os valores entram aqui automaticamente."
        />
      ) : (
        <>
          {/* Faturamento por dia */}
          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
              Faturamento por dia
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} />
                  <XAxis
                    dataKey="day"
                    tick={CHART_TICK}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
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
                  <Bar
                    dataKey="total"
                    name="Faturamento"
                    fill={CHART_BLUE}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Serviços mais vendidos */}
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
                Serviços que mais faturaram
              </p>
              <div className="flex flex-col gap-3.5">
                {topServices.map((s) => (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-navy-800">
                        {s.name}
                        <span className="ml-2 text-xs text-navy-300">{s.count}x</span>
                      </span>
                      <span className="font-semibold text-navy-950">{formatBRL(s.revenue)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-navy-50">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((s.revenue / maxServiceRevenue) * 100, 4)}%`,
                          background: CHART_BLUE,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Melhores dias */}
            <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
                Dias com maior faturamento
              </p>
              {bestDays.length === 0 ? (
                <p className="text-sm text-navy-400">Sem dados suficientes.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {bestDays.map((d, i) => (
                    <li
                      key={d.date}
                      className="flex items-center gap-3 rounded-xl border border-navy-50 bg-navy-50/40 px-4 py-3"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-navy-950 font-display text-sm font-bold text-cream-100">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-navy-800">
                        {formatDateShortPT(d.date)}
                      </span>
                      <span className="font-semibold text-navy-950">{formatBRL(d.total)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-4 rounded-lg bg-cream-100 px-3 py-2 text-xs text-navy-500">
                💈 Somente atendimentos <strong>concluídos</strong> entram no faturamento — os
                lançamentos são automáticos.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
