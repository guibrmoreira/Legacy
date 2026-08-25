import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AppointmentDetailsDialog,
  NewAppointmentDialog,
} from "@/components/admin/AppointmentDialogs";
import { fetchAppointmentsBetween } from "@/lib/api";
import {
  addDaysToDate,
  dateParts,
  formatBRL,
  formatDateShortPT,
  formatTimeSP,
  isoToSpParts,
  spDateTimeToIso,
  todaySpDate,
} from "@/lib/format";
import { STATUS_LABEL, type Appointment, type AppointmentStatus } from "@/lib/types";

type PeriodKey = "today" | "week" | "month" | "upcoming" | "past90";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  upcoming: "Próximos 60 dias",
  past90: "Últimos 90 dias",
};

export function AppointmentsPage() {
  const today = todaySpDate();
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState<Appointment | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const range = useMemo(() => {
    if (period === "today") return { from: today, to: addDaysToDate(today, 1) };
    if (period === "week") {
      const weekStart = addDaysToDate(today, -dateParts(today).weekday);
      return { from: weekStart, to: addDaysToDate(weekStart, 7) };
    }
    if (period === "month") {
      const monthStart = `${today.slice(0, 8)}01`;
      const { y, m } = dateParts(monthStart);
      const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
      return { from: monthStart, to: next };
    }
    if (period === "upcoming") return { from: today, to: addDaysToDate(today, 61) };
    return { from: addDaysToDate(today, -90), to: addDaysToDate(today, 1) };
  }, [period, today]);

  const fromIso = spDateTimeToIso(range.from, "00:00");
  const toIso = spDateTimeToIso(range.to, "00:00");

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", "range", fromIso, toIso],
    queryFn: () => fetchAppointmentsBetween(fromIso, toIso),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (appointments ?? [])
      .filter((a) => (status === "all" ? true : a.status === status))
      .filter((a) => (q ? (a.customer?.name ?? "").toLowerCase().includes(q) : true));
    const upcomingFirst = period === "upcoming" || period === "today" || period === "week";
    return list.sort((a, b) =>
      upcomingFirst ? a.starts_at.localeCompare(b.starts_at) : b.starts_at.localeCompare(a.starts_at),
    );
  }, [appointments, status, search, period]);

  const totals = useMemo(() => {
    const active = filtered.filter((a) =>
      ["scheduled", "confirmed", "in_progress", "completed"].includes(a.status),
    );
    return {
      count: filtered.length,
      value: active.reduce((sum, a) => sum + Number(a.price), 0),
    };
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {PERIOD_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus | "all")}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="red" size="sm" onClick={() => setNewOpen(true)}>
          <CalendarPlus className="size-4" /> Novo agendamento
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-navy-400">
        <Badge variant="outline">{totals.count} agendamentos</Badge>
        <Badge variant="outline">{formatBRL(totals.value)} em serviços</Badge>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum agendamento encontrado"
          description="Ajuste os filtros ou crie um agendamento manualmente."
          action={
            <Button variant="red" size="sm" onClick={() => setNewOpen(true)}>
              <CalendarPlus className="size-4" /> Novo agendamento
            </Button>
          }
        />
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="hidden rounded-2xl border border-navy-100 bg-white shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const { date } = isoToSpParts(a.starts_at);
                  return (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => setDetails(a)}
                    >
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDateShortPT(date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm">
                        {formatTimeSP(a.starts_at)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate font-semibold text-navy-900">
                        {a.customer?.name}
                      </TableCell>
                      <TableCell className="max-w-44 truncate">{a.service?.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold text-navy-900">
                        {formatBRL(Number(a.price))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Cards (mobile) */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {filtered.map((a) => {
              const { date } = isoToSpParts(a.starts_at);
              return (
                <button
                  key={a.id}
                  onClick={() => setDetails(a)}
                  className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3.5 text-left shadow-card cursor-pointer"
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-navy-950 px-1 py-1.5 text-cream-100">
                    <span className="text-[0.6rem] font-medium">{formatDateShortPT(date).slice(0, 5)}</span>
                    <span className="font-mono text-sm font-bold">{formatTimeSP(a.starts_at)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{a.customer?.name}</p>
                    <p className="truncate text-xs text-navy-400">
                      {a.service?.name} · {formatBRL(Number(a.price))}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </button>
              );
            })}
          </div>
        </>
      )}

      <AppointmentDetailsDialog
        appointment={details}
        open={details !== null}
        onOpenChange={(o) => !o && setDetails(null)}
      />
      <NewAppointmentDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
