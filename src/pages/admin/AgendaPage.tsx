import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, CalendarX, ChevronLeft, ChevronRight, Lock, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AppointmentDetailsDialog,
  BlockedDetailsDialog,
  BlockTimeDialog,
  FixedOccurrenceDialog,
  NewAppointmentDialog,
} from "@/components/admin/AppointmentDialogs";
import {
  fetchAppointmentsBetween,
  fetchBlockedBetween,
  fetchBusinessHours,
  fetchFixedSchedules,
} from "@/lib/api";
import { useSettings } from "@/hooks/usePublicData";
import {
  addDaysToDate,
  dateParts,
  formatBRL,
  formatDateLongPT,
  formatDateShortPT,
  formatMonthPT,
  formatTimeSP,
  isoToSpParts,
  minutesToTime,
  spDateTimeToIso,
  timeToMinutes,
  todaySpDate,
  trimTime,
} from "@/lib/format";
import {
  WEEKDAY_SHORT,
  type Appointment,
  type AppointmentStatus,
  type BlockedTime,
  type BusinessHour,
  type FixedSchedule,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type AgendaView = "day" | "week" | "month";

const STATUS_CARD_STYLE: Record<AppointmentStatus, string> = {
  scheduled: "border-l-navy-500 bg-navy-50 hover:bg-navy-100/80",
  confirmed: "border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100/70",
  in_progress: "border-l-amber-500 bg-amber-50 hover:bg-amber-100/70",
  completed: "border-l-navy-300 bg-navy-50/70 opacity-70 hover:opacity-100",
  cancelled: "hidden",
  no_show: "border-l-crimson-400 bg-crimson-50/70 opacity-70 hover:opacity-100",
};

interface FixedOccurrence {
  fixed: FixedSchedule;
  date: string;
}

/** Ocorrências de horários fixos de um dia, ocultando as já materializadas. */
function fixedOccurrencesFor(
  date: string,
  fixed: FixedSchedule[],
  appointments: Appointment[],
): FixedOccurrence[] {
  const weekday = dateParts(date).weekday;
  return fixed
    .filter((f) => f.active && f.weekday === weekday)
    .filter((f) => {
      const startMs = new Date(spDateTimeToIso(date, trimTime(f.start_time))).getTime();
      return !appointments.some(
        (a) => a.fixed_schedule_id === f.id && new Date(a.starts_at).getTime() === startMs,
      );
    })
    .map((f) => ({ fixed: f, date }));
}

function Legend() {
  const items = [
    { label: "Agendado", className: "bg-navy-500" },
    { label: "Confirmado", className: "bg-emerald-500" },
    { label: "Em atendimento", className: "bg-amber-500" },
    { label: "Concluído", className: "bg-navy-300" },
    { label: "Horário fixo", className: "bg-crimson-600" },
    { label: "Bloqueado", className: "bg-navy-200" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-navy-500">
          <span className={cn("size-2.5 rounded-full", item.className)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ===================== Coluna de timeline (dia) ===================== */

function DayColumn({
  date,
  appointments,
  blocked,
  fixedOccurrences,
  businessHour,
  pxPerMin,
  compact,
  slotInterval,
  onAppointmentClick,
  onBlockedClick,
  onFixedClick,
  onEmptyClick,
}: {
  date: string;
  appointments: Appointment[];
  blocked: BlockedTime[];
  fixedOccurrences: FixedOccurrence[];
  businessHour: BusinessHour | undefined;
  pxPerMin: number;
  compact?: boolean;
  slotInterval: number;
  onAppointmentClick: (a: Appointment) => void;
  onBlockedClick: (b: BlockedTime) => void;
  onFixedClick: (o: FixedOccurrence) => void;
  onEmptyClick: (date: string, time: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const visible = appointments.filter((a) => a.status !== "cancelled");

  const bounds = useMemo(() => {
    let start = businessHour?.is_open ? timeToMinutes(trimTime(businessHour.open_time)) : 8 * 60;
    let end = businessHour?.is_open ? timeToMinutes(trimTime(businessHour.close_time)) : 18 * 60;
    visible.forEach((a) => {
      start = Math.min(start, timeToMinutes(isoToSpParts(a.starts_at).time));
      end = Math.max(end, timeToMinutes(isoToSpParts(a.ends_at).time) || end);
    });
    fixedOccurrences.forEach((o) => {
      const s = timeToMinutes(trimTime(o.fixed.start_time));
      const dur = o.fixed.service?.duration_minutes ?? 30;
      start = Math.min(start, s);
      end = Math.max(end, s + dur);
    });
    start = Math.floor(start / 60) * 60;
    end = Math.ceil(end / 60) * 60;
    return { start, end };
  }, [businessHour, visible, fixedOccurrences]);

  const totalHeight = (bounds.end - bounds.start) * pxPerMin;
  const hourMarks: number[] = [];
  for (let m = bounds.start; m <= bounds.end; m += 60) hourMarks.push(m);

  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMin = bounds.start + offsetY / pxPerMin;
    const snapped = Math.floor(rawMin / slotInterval) * slotInterval;
    onEmptyClick(date, minutesToTime(snapped));
  }

  const blockOf = (startIso: string, endIso: string) => {
    const s = Math.max(timeToMinutes(isoToSpParts(startIso).time), bounds.start);
    const rawEnd = timeToMinutes(isoToSpParts(endIso).time);
    const sameDay = isoToSpParts(endIso).date === date;
    const e = Math.min(sameDay && rawEnd > 0 ? rawEnd : bounds.end, bounds.end);
    return { top: (s - bounds.start) * pxPerMin, height: Math.max((e - s) * pxPerMin, 14) };
  };

  return (
    <div className="relative" style={{ height: totalHeight }}>
      {/* Linhas de grade */}
      {hourMarks.map((m) => (
        <div
          key={m}
          className="absolute inset-x-0 border-t border-navy-100/80"
          style={{ top: (m - bounds.start) * pxPerMin }}
        >
          {!compact && (
            <span className="absolute -top-2 left-0 w-12 bg-transparent pr-2 text-right font-mono text-[0.65rem] text-navy-300">
              {minutesToTime(m)}
            </span>
          )}
        </div>
      ))}

      {/* Camada clicável */}
      <div
        ref={containerRef}
        className={cn("absolute inset-y-0 right-0 cursor-pointer", compact ? "left-0" : "left-14")}
        onClick={handleBackgroundClick}
      >
        {/* Intervalo */}
        {businessHour?.is_open && businessHour.break_start && businessHour.break_end && (
          <div
            className="hatch-muted absolute inset-x-0 z-0 rounded-lg border border-navy-100/60"
            style={{
              top: (timeToMinutes(trimTime(businessHour.break_start)) - bounds.start) * pxPerMin,
              height:
                (timeToMinutes(trimTime(businessHour.break_end)) -
                  timeToMinutes(trimTime(businessHour.break_start))) *
                pxPerMin,
            }}
          >
            {!compact && (
              <span className="px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-navy-300">
                Intervalo
              </span>
            )}
          </div>
        )}

        {/* Fora do expediente (dia fechado) */}
        {!businessHour?.is_open && (
          <div className="hatch-muted absolute inset-0 z-0 rounded-lg" />
        )}

        {/* Bloqueios */}
        {blocked.map((b) => {
          const pos = blockOf(b.starts_at, b.ends_at);
          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBlockedClick(b);
              }}
              className="hatch-muted absolute inset-x-0 z-10 flex items-start gap-1.5 overflow-hidden rounded-lg border border-navy-200 bg-navy-100/60 px-2 py-1 text-left transition-colors hover:bg-navy-100 cursor-pointer"
              style={pos}
            >
              <Lock className="mt-0.5 size-3 shrink-0 text-navy-400" />
              {!compact && (
                <span className="truncate text-[0.7rem] font-semibold text-navy-500">
                  Bloqueado{b.reason ? ` · ${b.reason}` : ""}
                </span>
              )}
            </button>
          );
        })}

        {/* Horários fixos (não materializados) */}
        {fixedOccurrences.map((o) => {
          const s = timeToMinutes(trimTime(o.fixed.start_time));
          const dur = o.fixed.service?.duration_minutes ?? 30;
          return (
            <button
              key={o.fixed.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFixedClick(o);
              }}
              className="hatch-crimson absolute inset-x-0 z-20 overflow-hidden rounded-lg border border-crimson-200 border-l-4 border-l-crimson-600 bg-white px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer"
              style={{ top: (s - bounds.start) * pxPerMin, height: Math.max(dur * pxPerMin, 22) }}
            >
              <span className="flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-crimson-700">
                <Repeat className="size-3" /> {compact ? "" : "Horário fixo"}
              </span>
              <span className="block truncate text-xs font-semibold text-navy-900">
                {trimTime(o.fixed.start_time)} · {o.fixed.customer?.name}
              </span>
              {!compact && (
                <span className="block truncate text-[0.7rem] text-navy-400">
                  {o.fixed.service?.name}
                </span>
              )}
            </button>
          );
        })}

        {/* Agendamentos */}
        {visible.map((a) => {
          const s = timeToMinutes(isoToSpParts(a.starts_at).time);
          const e = timeToMinutes(isoToSpParts(a.ends_at).time);
          const height = Math.max((e - s) * pxPerMin, 22);
          return (
            <button
              key={a.id}
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onAppointmentClick(a);
              }}
              className={cn(
                "absolute inset-x-0 z-20 overflow-hidden rounded-lg border border-navy-100 border-l-4 px-2 py-1 text-left shadow-sm transition-all hover:shadow-md cursor-pointer",
                STATUS_CARD_STYLE[a.status],
              )}
              style={{ top: (s - bounds.start) * pxPerMin, height }}
            >
              <span className="block truncate text-xs font-semibold text-navy-900">
                {formatTimeSP(a.starts_at)} · {a.customer?.name ?? "Cliente"}
              </span>
              {!compact && height > 34 && (
                <span className="block truncate text-[0.7rem] text-navy-500">
                  {a.service?.name} · {formatBRL(Number(a.price))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================= Página ============================= */

export function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: settings } = useSettings();
  const slotInterval = settings?.slot_interval_minutes ?? 30;

  const [view, setView] = useState<AgendaView>("day");
  const [anchor, setAnchor] = useState(todaySpDate());

  const [newOpen, setNewOpen] = useState(false);
  const [newDefaults, setNewDefaults] = useState<{ date?: string; time?: string }>({});
  const [blockOpen, setBlockOpen] = useState(false);
  const [detailsAppt, setDetailsAppt] = useState<Appointment | null>(null);
  const [blockedDetail, setBlockedDetail] = useState<BlockedTime | null>(null);
  const [fixedOcc, setFixedOcc] = useState<FixedOccurrence | null>(null);

  // Ações vindas de links externos (?novo=1 / ?bloquear=1)
  useEffect(() => {
    if (searchParams.get("novo")) setNewOpen(true);
    if (searchParams.get("bloquear")) setBlockOpen(true);
    if (searchParams.get("novo") || searchParams.get("bloquear")) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const range = useMemo(() => {
    if (view === "day") return { from: anchor, to: addDaysToDate(anchor, 1) };
    if (view === "week") {
      const weekStart = addDaysToDate(anchor, -dateParts(anchor).weekday);
      return { from: weekStart, to: addDaysToDate(weekStart, 7) };
    }
    const monthStart = `${anchor.slice(0, 8)}01`;
    const { y, m } = dateParts(monthStart);
    const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
    return { from: monthStart, to: nextMonth };
  }, [view, anchor]);

  const fromIso = spDateTimeToIso(range.from, "00:00");
  const toIso = spDateTimeToIso(range.to, "00:00");

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", "range", fromIso, toIso],
    queryFn: () => fetchAppointmentsBetween(fromIso, toIso),
  });
  const { data: blocked } = useQuery({
    queryKey: ["blocked", fromIso, toIso],
    queryFn: () => fetchBlockedBetween(fromIso, toIso),
  });
  const { data: fixed } = useQuery({ queryKey: ["fixed"], queryFn: fetchFixedSchedules });
  const { data: hours } = useQuery({ queryKey: ["business_hours"], queryFn: fetchBusinessHours });

  const today = todaySpDate();

  function shift(delta: number) {
    if (view === "day") setAnchor(addDaysToDate(anchor, delta));
    else if (view === "week") setAnchor(addDaysToDate(anchor, delta * 7));
    else {
      const { y, m } = dateParts(`${anchor.slice(0, 8)}01`);
      const total = y * 12 + (m - 1) + delta;
      const ny = Math.floor(total / 12);
      const nm = (total % 12) + 1;
      setAnchor(`${ny}-${String(nm).padStart(2, "0")}-01`);
    }
  }

  const headerLabel = useMemo(() => {
    if (view === "day") return formatDateLongPT(anchor);
    if (view === "week") {
      const weekStart = addDaysToDate(anchor, -dateParts(anchor).weekday);
      return `${formatDateShortPT(weekStart)} – ${formatDateShortPT(addDaysToDate(weekStart, 6))}`;
    }
    return formatMonthPT(anchor);
  }, [view, anchor]);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    (appointments ?? []).forEach((a) => {
      const { date } = isoToSpParts(a.starts_at);
      map.set(date, [...(map.get(date) ?? []), a]);
    });
    return map;
  }, [appointments]);

  const blockedByDate = useMemo(() => {
    const map = new Map<string, BlockedTime[]>();
    (blocked ?? []).forEach((b) => {
      const { date } = isoToSpParts(b.starts_at);
      map.set(date, [...(map.get(date) ?? []), b]);
    });
    return map;
  }, [blocked]);

  const hourOf = (date: string) => (hours ?? []).find((h) => h.weekday === dateParts(date).weekday);

  function openNewAt(date: string, time: string) {
    setNewDefaults({ date, time });
    setNewOpen(true);
  }

  /* ---------- render das visões ---------- */

  const weekDays = useMemo(() => {
    if (view !== "week") return [];
    const weekStart = addDaysToDate(anchor, -dateParts(anchor).weekday);
    return Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i));
  }, [view, anchor]);

  const monthCells = useMemo(() => {
    if (view !== "month") return [];
    const monthStart = `${anchor.slice(0, 8)}01`;
    const gridStart = addDaysToDate(monthStart, -dateParts(monthStart).weekday);
    return Array.from({ length: 42 }, (_, i) => addDaysToDate(gridStart, i));
  }, [view, anchor]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Próximo">
            <ChevronRight />
          </Button>
          <Button variant="soft" size="sm" onClick={() => setAnchor(today)}>
            Hoje
          </Button>
          <span className="ml-1 font-display text-base font-semibold text-navy-950 sm:text-lg">
            {headerLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as AgendaView)}>
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="red" size="sm" onClick={() => { setNewDefaults({ date: anchor }); setNewOpen(true); }}>
            <CalendarPlus className="size-4" /> Novo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBlockOpen(true)}>
            <CalendarX className="size-4" /> Bloquear
          </Button>
        </div>
      </div>

      <Legend />

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : view === "day" ? (
        <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card sm:p-5">
          {!hourOf(anchor)?.is_open &&
          (apptsByDate.get(anchor) ?? []).filter((a) => a.status !== "cancelled").length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Barbearia fechada neste dia"
              description="Você ainda pode criar um agendamento manual se precisar."
              action={
                <Button variant="outline" size="sm" onClick={() => openNewAt(anchor, "09:00")}>
                  <CalendarPlus className="size-4" /> Agendamento manual
                </Button>
              }
            />
          ) : (
            <DayColumn
              date={anchor}
              appointments={apptsByDate.get(anchor) ?? []}
              blocked={blockedByDate.get(anchor) ?? []}
              fixedOccurrences={fixedOccurrencesFor(anchor, fixed ?? [], apptsByDate.get(anchor) ?? [])}
              businessHour={hourOf(anchor)}
              pxPerMin={1.9}
              slotInterval={slotInterval}
              onAppointmentClick={setDetailsAppt}
              onBlockedClick={setBlockedDetail}
              onFixedClick={setFixedOcc}
              onEmptyClick={openNewAt}
            />
          )}
        </div>
      ) : view === "week" ? (
        <div className="overflow-x-auto scrollbar-thin rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
          <div className="min-w-[920px]">
            <div className="mb-2 grid grid-cols-7 gap-2">
              {weekDays.map((d) => {
                const { d: dayNum, weekday } = dateParts(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setAnchor(d);
                      setView("day");
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold transition-colors cursor-pointer",
                      d === today
                        ? "bg-crimson-600 text-white"
                        : "text-navy-600 hover:bg-navy-50",
                    )}
                  >
                    {WEEKDAY_SHORT[weekday]} <span className="font-display">{dayNum}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => (
                <div key={d} className="rounded-lg border border-navy-50 bg-navy-50/30 p-1">
                  <DayColumn
                    date={d}
                    appointments={apptsByDate.get(d) ?? []}
                    blocked={blockedByDate.get(d) ?? []}
                    fixedOccurrences={fixedOccurrencesFor(d, fixed ?? [], apptsByDate.get(d) ?? [])}
                    businessHour={hourOf(d)}
                    pxPerMin={1.1}
                    compact
                    slotInterval={slotInterval}
                    onAppointmentClick={setDetailsAppt}
                    onBlockedClick={setBlockedDetail}
                    onFixedClick={setFixedOcc}
                    onEmptyClick={openNewAt}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
          <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wider text-navy-400">
            {WEEKDAY_SHORT.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {monthCells.map((d) => {
              const inMonth = d.slice(0, 7) === anchor.slice(0, 7);
              const dayAppts = (apptsByDate.get(d) ?? []).filter((a) => a.status !== "cancelled");
              const fixedCount = fixedOccurrencesFor(d, fixed ?? [], apptsByDate.get(d) ?? []).length;
              const hasBlocked = (blockedByDate.get(d) ?? []).length > 0;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setAnchor(d);
                    setView("day");
                  }}
                  className={cn(
                    "flex min-h-20 flex-col items-start gap-1 rounded-xl border p-2 text-left transition-all cursor-pointer sm:min-h-24",
                    inMonth
                      ? "border-navy-100 bg-white hover:border-navy-300 hover:shadow-sm"
                      : "border-transparent bg-navy-50/40 opacity-50",
                    d === today && "ring-2 ring-crimson-500/60",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      d === today ? "text-crimson-700" : "text-navy-500",
                    )}
                  >
                    {Number(d.slice(8))}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {dayAppts.length > 0 && (
                      <span className="rounded-full bg-navy-950 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                        {dayAppts.length}
                      </span>
                    )}
                    {fixedCount > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-crimson-100 px-1.5 py-0.5 text-[0.6rem] font-bold text-crimson-700">
                        <Repeat className="size-2.5" />
                        {fixedCount}
                      </span>
                    )}
                    {hasBlocked && <Lock className="size-3 text-navy-300" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Diálogos */}
      <NewAppointmentDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultDate={newDefaults.date}
        defaultTime={newDefaults.time}
      />
      <BlockTimeDialog open={blockOpen} onOpenChange={setBlockOpen} defaultDate={anchor} />
      <AppointmentDetailsDialog
        appointment={detailsAppt}
        open={detailsAppt !== null}
        onOpenChange={(o) => !o && setDetailsAppt(null)}
      />
      <BlockedDetailsDialog
        blocked={blockedDetail}
        open={blockedDetail !== null}
        onOpenChange={(o) => !o && setBlockedDetail(null)}
      />
      <FixedOccurrenceDialog
        occurrence={fixedOcc}
        open={fixedOcc !== null}
        onOpenChange={(o) => !o && setFixedOcc(null)}
      />
    </div>
  );
}
