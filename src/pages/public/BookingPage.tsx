import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  MessageCircle,
  Moon,
  Pencil,
  Sun,
  Sunrise,
  Timer,
} from "lucide-react";
import { LogoBadge } from "@/components/Logo";
import { ServiceIcon } from "@/components/ServiceIcon";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useActiveServices, useAvailableSlots, useBusinessHours, useSettings } from "@/hooks/usePublicData";
import { createBooking } from "@/lib/api";
import {
  addDaysToDate,
  formatBRL,
  formatDateLongPT,
  formatDuration,
  formatPhoneBR,
  googleCalendarLink,
  onlyDigits,
  todaySpDate,
  whatsappLink,
} from "@/lib/format";
import type { BookingResult, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Serviço", "Data", "Horário", "Seus dados"];

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36 }),
};

/* ========================= Calendário ========================= */

function MiniCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  closedWeekdays,
}: {
  value: string | null;
  onChange: (date: string) => void;
  minDate: string;
  maxDate: string;
  closedWeekdays: Set<number>;
}) {
  const [viewYm, setViewYm] = useState(() => (value ?? minDate).slice(0, 7));
  const [viewYear, viewMonth] = viewYm.split("-").map(Number);

  const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();

  const minYm = minDate.slice(0, 7);
  const maxYm = maxDate.slice(0, 7);

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYm(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const today = todaySpDate();

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shiftMonth(-1)}
          disabled={viewYm <= minYm}
          aria-label="Mês anterior"
        >
          <ChevronLeft />
        </Button>
        <span className="font-display text-sm font-semibold uppercase tracking-wider text-navy-900">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shiftMonth(1)}
          disabled={viewYm >= maxYm}
          aria-label="Próximo mês"
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="py-1 text-xs font-semibold text-navy-300">
            {d}
          </span>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewYm}-${String(day).padStart(2, "0")}`;
          const weekday = (firstWeekday + i) % 7;
          const disabled =
            dateStr < minDate || dateStr > maxDate || closedWeekdays.has(weekday);
          const selected = value === dateStr;
          const isToday = dateStr === today;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              className={cn(
                "relative mx-auto flex size-10 items-center justify-center rounded-full text-sm font-medium transition-all",
                disabled
                  ? "cursor-not-allowed text-navy-200 line-through decoration-navy-200"
                  : "cursor-pointer text-navy-800 hover:bg-navy-100",
                selected && "bg-crimson-600 text-white shadow-md shadow-crimson-600/30 hover:bg-crimson-600",
                !selected && isToday && "ring-1 ring-inset ring-crimson-400",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs text-navy-300">
        Dias riscados: fechado ou fora do período de agendamento
      </p>
    </div>
  );
}

/* ====================== Página de agendamento ====================== */

export function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const { data: settings } = useSettings();
  const { data: services, isLoading: loadingServices } = useActiveServices();
  const { data: hours } = useBusinessHours();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const appliedPreselect = useRef(false);

  const service = useMemo(
    () => services?.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const { data: slots, isLoading: loadingSlots } = useAvailableSlots(
    step === 3 ? date : null,
    step === 3 ? serviceId : null,
  );

  // Pré-seleção via ?servico=<id> (link dos cards da home)
  useEffect(() => {
    if (appliedPreselect.current || !services) return;
    const pre = searchParams.get("servico");
    if (pre && services.some((s) => s.id === pre)) {
      setServiceId(pre);
      setStep(2);
    }
    appliedPreselect.current = true;
  }, [services, searchParams]);

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const closedWeekdays = useMemo(() => {
    const set = new Set<number>();
    (hours ?? []).forEach((h) => {
      if (!h.is_open) set.add(h.weekday);
    });
    return set;
  }, [hours]);

  const minDate = todaySpDate();
  const maxDate = addDaysToDate(minDate, settings?.booking_window_days ?? 30);

  const groupedSlots = useMemo(() => {
    const morning: string[] = [];
    const afternoon: string[] = [];
    const evening: string[] = [];
    (slots ?? []).forEach((slot) => {
      const hour = Number(slot.slice(0, 2));
      if (hour < 12) morning.push(slot);
      else if (hour < 18) afternoon.push(slot);
      else evening.push(slot);
    });
    return [
      { label: "Manhã", icon: Sunrise, slots: morning },
      { label: "Tarde", icon: Sun, slots: afternoon },
      { label: "Noite", icon: Moon, slots: evening },
    ].filter((g) => g.slots.length > 0);
  }, [slots]);

  const nameValid = name.trim().length >= 2;
  const phoneValid = onlyDigits(whatsapp).length >= 10;

  async function handleSubmit() {
    if (!service || !date || !time || submitting) return;
    setSubmitting(true);
    try {
      const booking = await createBooking({
        name: name.trim(),
        whatsapp,
        serviceId: service.id,
        date,
        time,
        notes,
      });
      setResult(booking);
      setStep(5);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao agendar.";
      toast.error(message);
      if (message.includes("reservado")) {
        setTime(null);
        queryClient.invalidateQueries({ queryKey: ["slots"] });
        goTo(3);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const handleBack = () => {
    if (step === 1 || step === 5) navigate("/");
    else goTo(step - 1);
  };

  return (
    <div className="min-h-svh bg-cream-50">
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <button
            onClick={handleBack}
            className="flex size-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900 cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link to="/" aria-label="Início">
            <LogoBadge className="size-10" />
          </Link>
          <span className="w-9 text-right text-xs font-semibold text-navy-300">
            {step <= 4 ? `${step}/4` : ""}
          </span>
        </div>
        {step <= 4 && (
          <div className="mx-auto flex max-w-lg gap-1.5 px-4 pb-3">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    "h-1 rounded-full transition-colors duration-300",
                    i < step ? "bg-crimson-600" : "bg-navy-100",
                  )}
                />
                <span
                  className={cn(
                    "mt-1 hidden text-[0.65rem] font-medium sm:block",
                    i === step - 1 ? "text-crimson-700" : "text-navy-300",
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 pb-28">
        {/* Resumo do que já foi escolhido */}
        {step > 1 && step <= 4 && service && (
          <div className="mb-5 flex flex-wrap items-center gap-2 animate-fade-in">
            <button
              onClick={() => goTo(1)}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:border-crimson-300 cursor-pointer"
            >
              <ServiceIcon icon={service.icon} className="size-3.5 text-crimson-600" />
              {service.name}
              <Pencil className="size-3 text-navy-300" />
            </button>
            {date && step > 2 && (
              <button
                onClick={() => goTo(2)}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:border-crimson-300 cursor-pointer"
              >
                <CalendarDays className="size-3.5 text-crimson-600" />
                {formatDateLongPT(date)}
                <Pencil className="size-3 text-navy-300" />
              </button>
            )}
            {time && step > 3 && (
              <button
                onClick={() => goTo(3)}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:border-crimson-300 cursor-pointer"
              >
                <Clock className="size-3.5 text-crimson-600" />
                {time}
                <Pencil className="size-3 text-navy-300" />
              </button>
            )}
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction}>
          {/* ============ Passo 1: serviço ============ */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-navy-950">
                Qual serviço você quer?
              </h1>
              <p className="mt-1 text-sm text-navy-400">Escolha uma opção para continuar.</p>
              <div className="mt-5 flex flex-col gap-3">
                {loadingServices &&
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                {services?.map((s: Service) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServiceId(s.id);
                      setTime(null);
                      goTo(2);
                    }}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-card transition-all cursor-pointer",
                      serviceId === s.id
                        ? "border-crimson-500 ring-2 ring-crimson-500/20"
                        : "border-navy-100 hover:border-navy-300 hover:shadow-card-hover",
                    )}
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-cream-100 transition-colors group-hover:bg-crimson-600">
                      <ServiceIcon icon={s.icon} className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-semibold uppercase tracking-wide text-navy-950">
                        {s.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-navy-400">
                        <Timer className="size-3" />
                        {formatDuration(s.duration_minutes)}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-crimson-700">{formatBRL(s.price)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============ Passo 2: data ============ */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-navy-950">
                Escolha o dia
              </h1>
              <p className="mt-1 text-sm text-navy-400">
                Agendamentos até {settings?.booking_window_days ?? 30} dias à frente.
              </p>
              <div className="mt-5">
                <MiniCalendar
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setTime(null);
                    goTo(3);
                  }}
                  minDate={minDate}
                  maxDate={maxDate}
                  closedWeekdays={closedWeekdays}
                />
              </div>
            </motion.div>
          )}

          {/* ============ Passo 3: horário ============ */}
          {step === 3 && date && (
            <motion.div
              key="step3"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-navy-950">
                Escolha o horário
              </h1>
              <p className="mt-1 text-sm text-navy-400">{formatDateLongPT(date)}</p>

              {loadingSlots ? (
                <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-11" />
                  ))}
                </div>
              ) : (slots ?? []).length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    icon={Clock}
                    title="Sem horários livres neste dia"
                    description="Escolha outra data — os horários são atualizados em tempo real."
                    action={
                      <Button variant="outline" onClick={() => goTo(2)}>
                        <CalendarDays className="size-4" />
                        Escolher outra data
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-6">
                  {groupedSlots.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-navy-400">
                        <group.icon className="size-3.5" />
                        {group.label}
                      </p>
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {group.slots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => {
                              setTime(slot);
                              goTo(4);
                            }}
                            className={cn(
                              "h-11 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
                              time === slot
                                ? "border-crimson-600 bg-crimson-600 text-white shadow-md shadow-crimson-600/30"
                                : "border-navy-200 bg-white text-navy-800 hover:border-crimson-400 hover:text-crimson-700",
                            )}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ============ Passo 4: dados ============ */}
          {step === 4 && service && date && time && (
            <motion.div
              key="step4"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-navy-950">
                Quase lá!
              </h1>
              <p className="mt-1 text-sm text-navy-400">Confirme seus dados para reservar.</p>

              <div className="mt-5 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between border-b border-navy-50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-navy-950 text-cream-100">
                      <ServiceIcon icon={service.icon} className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy-950">{service.name}</p>
                      <p className="text-xs text-navy-400">
                        {formatDuration(service.duration_minutes)}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-crimson-700">
                    {formatBRL(service.price)}
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-3 text-sm text-navy-700">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-crimson-600" />
                    {formatDateLongPT(date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4 text-crimson-600" />
                    {time}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                <div>
                  <Label htmlFor="bf-name">Seu nome</Label>
                  <Input
                    id="bf-name"
                    placeholder="Como podemos te chamar?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="bf-phone">WhatsApp</Label>
                  <Input
                    id="bf-phone"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
                    autoComplete="tel"
                  />
                  <p className="mt-1 text-xs text-navy-300">
                    Usamos seu WhatsApp apenas para confirmar o horário.
                  </p>
                </div>
                <div>
                  <Label htmlFor="bf-notes">
                    Observação <span className="font-normal text-navy-300">(opcional)</span>
                  </Label>
                  <Textarea
                    id="bf-notes"
                    placeholder="Ex.: prefiro máquina 2 nas laterais"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ============ Sucesso ============ */}
          {step === 5 && result && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center pt-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className="flex size-20 items-center justify-center rounded-full bg-emerald-100"
              >
                <CheckCircle2 className="size-11 text-emerald-600" />
              </motion.div>
              <h1 className="mt-5 font-display text-3xl font-bold uppercase tracking-wide text-navy-950">
                Agendamento confirmado!
              </h1>
              <p className="mt-2 text-navy-500">
                Te esperamos na {settings?.shop_name ?? "Barbearia Fagundes"}
                {result.customer_name ? `, ${result.customer_name.split(" ")[0]}` : ""}. 💈
              </p>

              <div className="mt-6 w-full rounded-2xl border border-navy-100 bg-white p-5 text-left shadow-card">
                <dl className="flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-navy-400">Serviço</dt>
                    <dd className="font-semibold text-navy-950">{result.service_name}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-navy-400">Data</dt>
                    <dd className="font-semibold text-navy-950">
                      {formatDateLongPT(result.date)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-navy-400">Horário</dt>
                    <dd className="font-semibold text-navy-950">{result.time}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-navy-400">Nome</dt>
                    <dd className="font-semibold text-navy-950">{result.customer_name}</dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-navy-50 pt-3">
                    <dt className="text-navy-400">Valor</dt>
                    <dd className="text-lg font-bold text-crimson-700">{formatBRL(result.price)}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 flex w-full flex-col gap-2.5">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    window.open(
                      googleCalendarLink({
                        title: `${settings?.shop_name ?? "Barbearia Fagundes"} — ${result.service_name}`,
                        date: result.date,
                        time: result.time,
                        durationMinutes: result.duration_minutes,
                        details: "Agendamento feito pelo site.",
                        location: settings?.address || undefined,
                      }),
                      "_blank",
                    )
                  }
                >
                  <CalendarPlus className="size-5" />
                  Adicionar à agenda
                </Button>
                {settings?.whatsapp && (
                  <Button
                    variant="red"
                    size="lg"
                    className="w-full"
                    onClick={() =>
                      window.open(
                        whatsappLink(
                          settings.whatsapp,
                          `Olá! Acabei de agendar ${result.service_name} para ${formatDateLongPT(result.date)} às ${result.time}. Meu nome é ${result.customer_name}.`,
                        ),
                        "_blank",
                      )
                    }
                  >
                    <MessageCircle className="size-5" />
                    Falar com a barbearia
                  </Button>
                )}
                <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
                  <Home className="size-4" />
                  Voltar ao início
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Barra fixa de confirmação (passo 4) */}
      {step === 4 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 p-4 backdrop-blur-md">
          <div className="mx-auto max-w-lg">
            <Button
              variant="red"
              size="lg"
              className="w-full"
              disabled={!nameValid || !phoneValid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Spinner className="text-white" /> Confirmando...
                </>
              ) : (
                <>Confirmar agendamento</>
              )}
            </Button>
            {!phoneValid && whatsapp.length > 0 && (
              <p className="mt-1.5 text-center text-xs text-crimson-600">
                Informe um WhatsApp válido com DDD.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
