import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  ClipboardList,
  MessageCircle,
  Receipt,
  Scissors,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CHART_BLUE, CHART_GRID, CHART_TICK, ChartTooltip, currencyCompact } from "@/components/admin/charts";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAllServices,
  fetchAppointmentsBetween,
  fetchAvailableSlots,
  fetchNextAppointment,
  fetchTransactionsBetween,
} from "@/lib/api";
import {
  addDaysToDate,
  formatBRL,
  formatDateLongPT,
  formatTimeSP,
  greetingPT,
  spDateTimeToIso,
  todaySpDate,
  whatsappLink,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const { displayName } = useAuth();
  const today = todaySpDate();
  const monthStart = `${today.slice(0, 8)}01`;
  const prevMonthEnd = addDaysToDate(monthStart, -1);
  const prevMonthStart = `${prevMonthEnd.slice(0, 8)}01`;
  const chartStart = addDaysToDate(today, -13);

  const { data: todayAppointments, isLoading: loadingToday } = useQuery({
    queryKey: ["appointments", "today", today],
    queryFn: () =>
      fetchAppointmentsBetween(
        spDateTimeToIso(today, "00:00"),
        spDateTimeToIso(addDaysToDate(today, 1), "00:00"),
      ),
  });

  const { data: monthTx, isLoading: loadingMonth } = useQuery({
    queryKey: ["transactions", monthStart, today],
    queryFn: () => fetchTransactionsBetween(monthStart, today),
  });

  const { data: prevMonthTx } = useQuery({
    queryKey: ["transactions", prevMonthStart, prevMonthEnd],
    queryFn: () => fetchTransactionsBetween(prevMonthStart, prevMonthEnd),
  });

  const { data: chartTx } = useQuery({
    queryKey: ["transactions", chartStart, today],
    queryFn: () => fetchTransactionsBetween(chartStart, today),
  });

  const { data: nextAppointment } = useQuery({
    queryKey: ["appointments", "next"],
    queryFn: fetchNextAppointment,
    refetchInterval: 60_000,
  });

  const { data: services } = useQuery({ queryKey: ["services", "all"], queryFn: fetchAllServices });

  const shortestService = useMemo(() => {
    const active = (services ?? []).filter((s) => s.active);
    if (active.length === 0) return null;
    return active.reduce((a, b) => (a.duration_minutes <= b.duration_minutes ? a : b));
  }, [services]);

  const { data: freeSlots } = useQuery({
    queryKey: ["slots", today, shortestService?.id],
    queryFn: () => fetchAvailableSlots(today, shortestService!.id),
    enabled: Boolean(shortestService),
  });

  const stats = useMemo(() => {
    const income = (monthTx ?? []).filter((t) => t.type === "income");
    const revenueMonth = income.reduce((sum, t) => sum + Number(t.amount), 0);
    const revenueToday = income
      .filter((t) => t.occurred_on === today)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const prevIncome = (prevMonthTx ?? []).filter((t) => t.type === "income");
    const revenuePrev = prevIncome.reduce((sum, t) => sum + Number(t.amount), 0);
    const trend = revenuePrev > 0 ? ((revenueMonth - revenuePrev) / revenuePrev) * 100 : null;
    const count = income.length;
    return {
      revenueToday,
      revenueMonth,
      revenuePrev,
      trend,
      count,
      ticket: count > 0 ? revenueMonth / count : 0,
    };
  }, [monthTx, prevMonthTx, today]);

  const todayList = useMemo(
    () =>
      (todayAppointments ?? [])
        .filter((a) => !["cancelled"].includes(a.status))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [todayAppointments],
  );

  const chartData = useMemo(() => {
    const byDay = new Map<string, number>();
    (chartTx ?? [])
      .filter((t) => t.type === "income")
      .forEach((t) => byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + Number(t.amount)));
    const days: { day: string; total: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const date = addDaysToDate(chartStart, i);
      const [, m, d] = date.split("-");
      days.push({ day: `${d}/${m}`, total: byDay.get(date) ?? 0 });
    }
    return days;
  }, [chartTx, chartStart]);

  const nextIsToday = nextAppointment
    ? formatTimeSP(nextAppointment.starts_at) !== "" &&
      new Date(nextAppointment.starts_at).toDateString() === new Date().toDateString()
    : false;

  return (
    <div className="flex flex-col gap-6">
      {/* Saudação + ações rápidas */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold text-navy-950">
            {greetingPT()}, {displayName}.
          </h2>
          <p className="mt-1 text-sm text-navy-400">{formatDateLongPT(today)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/agenda?novo=1"
            className={buttonVariants({ variant: "red", size: "sm" })}
          >
            <CalendarPlus className="size-4" /> Novo agendamento
          </Link>
          <Link
            to="/admin/agenda?bloquear=1"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <CalendarX className="size-4" /> Bloquear horário
          </Link>
        </div>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Faturamento hoje"
          value={formatBRL(stats.revenueToday)}
          icon={Wallet}
          loading={loadingMonth}
          sub="atendimentos concluídos"
        />
        <StatCard
          label="Faturamento do mês"
          value={formatBRL(stats.revenueMonth)}
          icon={Receipt}
          loading={loadingMonth}
          trendPercent={stats.trend}
          sub={`mês anterior: ${formatBRL(stats.revenuePrev)}`}
        />
        <StatCard
          label="Atendimentos no mês"
          value={stats.count}
          icon={Scissors}
          loading={loadingMonth}
          sub="concluídos"
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(stats.ticket)}
          icon={ClipboardList}
          loading={loadingMonth}
          sub="por atendimento"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Próximo cliente + horários livres */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-navy-100 bg-navy-950 p-5 text-white shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-cream-100/50">
              Próximo cliente
            </p>
            {nextAppointment ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded-xl bg-crimson-600 px-2.5 py-1.5 font-display text-lg font-bold">
                    {formatTimeSP(nextAppointment.starts_at)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{nextAppointment.customer?.name}</p>
                    <p className="truncate text-sm text-cream-100/60">
                      {nextAppointment.service?.name} · {formatBRL(Number(nextAppointment.price))}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!nextIsToday && (
                    <Badge variant="cream" className="text-navy-900">
                      <CalendarDays className="size-3" />
                      {formatDateLongPT(nextAppointment.starts_at.slice(0, 10))}
                    </Badge>
                  )}
                  {nextAppointment.customer?.whatsapp && (
                    <a
                      href={whatsappLink(nextAppointment.customer.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/20"
                    >
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                  )}
                  <Link
                    to="/admin/agenda"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-white/20"
                  >
                    <CalendarDays className="size-3.5" /> Ver agenda
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-cream-100/60">
                Nenhum atendimento futuro agendado.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                Horários livres hoje
              </p>
              <CalendarClock className="size-5 text-navy-300" />
            </div>
            <p className="mt-1 font-display text-3xl font-semibold text-navy-950">
              {freeSlots ? freeSlots.length : "—"}
            </p>
            {freeSlots && freeSlots.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {freeSlots.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-navy-50 px-2 py-1 font-mono text-xs font-semibold text-navy-700"
                  >
                    {s}
                  </span>
                ))}
                {freeSlots.length > 6 && (
                  <span className="px-1 py-1 text-xs text-navy-300">+{freeSlots.length - 6}</span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-navy-400">Agenda de hoje completa.</p>
            )}
          </div>
        </div>

        {/* Faturamento — últimos 14 dias */}
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">
                Faturamento · últimos 14 dias
              </p>
              <p className="mt-0.5 text-sm text-navy-300">Atendimentos concluídos por dia</p>
            </div>
            <Link to="/admin/financeiro" className="text-xs font-semibold text-crimson-600 hover:text-crimson-700">
              Ver financeiro →
            </Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  cursor={{ stroke: CHART_GRID }}
                  content={<ChartTooltip valueFormatter={formatBRL} />}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Faturamento"
                  stroke={CHART_BLUE}
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Agenda de hoje */}
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">
            Agenda de hoje
          </p>
          <Link
            to="/admin/agenda"
            className="text-xs font-semibold text-crimson-600 hover:text-crimson-700"
          >
            Abrir agenda →
          </Link>
        </div>
        {loadingToday ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : todayList.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Você ainda não possui agendamentos para hoje."
            description="Que tal aproveitar para organizar a agenda da semana?"
            action={
              <Link
                to="/admin/agenda?novo=1"
                className={buttonVariants({ variant: "red", size: "sm" })}
              >
                <CalendarPlus className="size-4" /> Adicionar agendamento
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-navy-50">
            {todayList.map((a) => (
              <li key={a.id}>
                <Link
                  to="/admin/agenda"
                  className={cn(
                    "flex items-center gap-3 py-3 transition-colors hover:bg-navy-50/50 sm:gap-4 sm:px-2",
                    a.status === "completed" && "opacity-60",
                  )}
                >
                  <span className="w-14 shrink-0 rounded-lg bg-navy-950 px-2 py-1.5 text-center font-mono text-sm font-bold text-cream-100">
                    {formatTimeSP(a.starts_at)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {a.customer?.name ?? "Cliente"}
                    </p>
                    <p className="truncate text-xs text-navy-400">
                      {a.service?.name} · {formatBRL(Number(a.price))}
                    </p>
                  </div>
                  <StatusBadge status={a.status} className="hidden sm:inline-flex" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
