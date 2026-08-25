import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/StatusBadge";
import { CustomerPicker, customerSelectionValid, type CustomerSelection } from "./CustomerPicker";
import {
  createAppointment,
  createBlockedTime,
  createCustomer,
  deleteBlockedTime,
  fetchAllServices,
  fetchAvailableSlots,
  fetchBusinessHours,
  updateAppointment,
} from "@/lib/api";
import {
  formatBRL,
  formatDateLongPT,
  formatDuration,
  formatTimeSP,
  isoToSpParts,
  todaySpDate,
  trimTime,
  whatsappLink,
} from "@/lib/format";
import { WEEKDAY_LABEL, type Appointment, type AppointmentStatus, type BlockedTime, type FixedSchedule } from "@/lib/types";

export function useInvalidateAgenda() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["slots"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["blocked"] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };
}

/* ================= Campo de horário (slots ou manual) ================= */

function TimeField({
  date,
  serviceId,
  value,
  onChange,
}: {
  date: string;
  serviceId: string | null;
  value: string;
  onChange: (time: string) => void;
}) {
  const isPast = date < todaySpDate();
  const [manual, setManual] = useState(isPast);

  useEffect(() => {
    if (isPast) setManual(true);
  }, [isPast]);

  const { data: slots, isLoading } = useQuery({
    queryKey: ["slots", date, serviceId],
    queryFn: () => fetchAvailableSlots(date, serviceId!),
    enabled: Boolean(!manual && date && serviceId && !isPast),
  });

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="mb-0">Horário</Label>
        {!isPast && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-navy-400">
            digitar manualmente
            <Switch checked={manual} onCheckedChange={setManual} className="scale-75" />
          </label>
        )}
      </div>
      {manual ? (
        <Input type="time" step={300} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : isLoading ? (
        <div className="flex h-10 items-center gap-2 rounded-lg border border-navy-200 px-3 text-sm text-navy-400">
          <Spinner className="size-4" /> Carregando horários...
        </div>
      ) : (slots ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-navy-200 bg-navy-50/50 px-3 py-2.5 text-sm text-navy-400">
          Sem horários livres — ative “digitar manualmente” para forçar um horário.
        </p>
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um horário livre" />
          </SelectTrigger>
          <SelectContent>
            {(slots ?? []).map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

/* ================= Novo agendamento (manual/admin) ================= */

export function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
  defaultCustomer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultCustomer?: CustomerSelection;
}) {
  const invalidate = useInvalidateAgenda();
  const { data: services } = useQuery({ queryKey: ["services", "all"], queryFn: fetchAllServices });
  const activeServices = useMemo(() => (services ?? []).filter((s) => s.active), [services]);

  const [customerSel, setCustomerSel] = useState<CustomerSelection>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(todaySpDate());
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerSel(defaultCustomer ?? null);
      setServiceId(null);
      setDate(defaultDate ?? todaySpDate());
      setTime(defaultTime ?? "");
      setStatus("confirmed");
      setPrice("");
      setNotes("");
    }
  }, [open, defaultDate, defaultTime, defaultCustomer]);

  const service = activeServices.find((s) => s.id === serviceId) ?? null;

  const valid =
    customerSelectionValid(customerSel) &&
    service !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(time);

  async function handleSubmit() {
    if (!valid || !service || saving) return;
    setSaving(true);
    try {
      let customerId: string;
      if (customerSel!.kind === "existing") {
        customerId = customerSel!.customer.id;
      } else {
        const created = await createCustomer({
          name: customerSel!.name.trim(),
          whatsapp: customerSel!.whatsapp.replace(/\D/g, ""),
        });
        customerId = created.id;
      }
      const parsedPrice = price.trim() === "" ? Number(service.price) : Number(price.replace(",", "."));
      await createAppointment({
        customerId,
        serviceId: service.id,
        date,
        time,
        durationMinutes: service.duration_minutes,
        price: Number.isFinite(parsedPrice) ? parsedPrice : Number(service.price),
        status,
        notes,
        origin: "admin",
      });
      invalidate();
      toast.success("Agendamento criado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>Criado manualmente pelo painel.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Cliente</Label>
            <CustomerPicker value={customerSel} onChange={setCustomerSel} />
          </div>

          <div>
            <Label>Serviço</Label>
            <Select
              value={serviceId ?? undefined}
              onValueChange={(v) => {
                setServiceId(v);
                const s = activeServices.find((x) => x.id === v);
                if (s) setPrice(String(s.price));
                setTime("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha o serviço" />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {formatBRL(Number(s.price))} · {formatDuration(s.duration_minutes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="na-date">Data</Label>
              <Input
                id="na-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
              />
            </div>
            <div>
              <Label htmlFor="na-price">Valor (R$)</Label>
              <Input
                id="na-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={service ? String(service.price) : "0,00"}
              />
            </div>
          </div>

          <TimeField date={date} serviceId={serviceId} value={time} onChange={setTime} />

          <div>
            <Label>Status inicial</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído (registrar atendimento passado)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="na-notes">
              Observação <span className="font-normal text-navy-300">(opcional)</span>
            </Label>
            <Textarea id="na-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="red" disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? <Spinner className="text-white" /> : <CalendarCheck className="size-4" />}
            Salvar agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Detalhes / status / reagendar ================= */

const ORIGIN_LABEL: Record<Appointment["origin"], string> = {
  public: "Pelo site",
  admin: "Manual",
  fixed: "Horário fixo",
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-navy-400">{label}</span>
      <span className="min-w-0 text-right font-medium text-navy-900">{children}</span>
    </div>
  );
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
}: {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useInvalidateAgenda();
  const { data: services } = useQuery({ queryKey: ["services", "all"], queryFn: fetchAllServices });

  const [notes, setNotes] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newServiceId, setNewServiceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setNotes(appointment.notes ?? "");
      setRescheduling(false);
      const { date, time } = isoToSpParts(appointment.starts_at);
      setNewDate(date);
      setNewTime(time);
      setNewServiceId(appointment.service_id);
    }
  }, [open, appointment]);

  if (!appointment) return null;
  const a = appointment;
  const { date: aDate } = isoToSpParts(a.starts_at);

  async function setStatus(status: AppointmentStatus) {
    setBusy(true);
    try {
      await updateAppointment(a.id, { status });
      invalidate();
      toast.success(`Status atualizado: ${status === "completed" ? "concluído — lançado no financeiro" : "ok"}`);
      if (["completed", "cancelled", "no_show"].includes(status)) onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    setBusy(true);
    try {
      await updateAppointment(a.id, { notes });
      invalidate();
      toast.success("Observações salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReschedule() {
    const svc = (services ?? []).find((s) => s.id === newServiceId);
    if (!svc || !/^\d{2}:\d{2}$/.test(newTime) || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    setBusy(true);
    try {
      const startsAt = `${newDate}T${newTime}:00-03:00`;
      const endsAt = new Date(
        new Date(startsAt).getTime() + svc.duration_minutes * 60_000,
      ).toISOString();
      await updateAppointment(a.id, {
        starts_at: startsAt,
        ends_at: endsAt,
        service_id: svc.id,
        price: a.service_id === svc.id ? Number(a.price) : Number(svc.price),
      });
      invalidate();
      toast.success("Agendamento atualizado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reagendar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {a.customer?.name ?? "Cliente"}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            <Badge variant="outline">{ORIGIN_LABEL[a.origin]}</Badge>
          </div>
        </DialogHeader>

        <div className="divide-y divide-navy-50 rounded-xl border border-navy-100 px-4 py-1">
          <InfoRow label="Serviço">{a.service?.name}</InfoRow>
          <InfoRow label="Data">
            <span>{formatDateLongPT(aDate)}</span>
          </InfoRow>
          <InfoRow label="Horário">
            {formatTimeSP(a.starts_at)} – {formatTimeSP(a.ends_at)}
          </InfoRow>
          <InfoRow label="Valor">
            <span className="font-bold text-crimson-700">{formatBRL(Number(a.price))}</span>
          </InfoRow>
          {a.customer?.whatsapp && (
            <InfoRow label="WhatsApp">
              <a
                href={whatsappLink(a.customer.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700"
              >
                <MessageCircle className="size-3.5" /> Chamar
              </a>
            </InfoRow>
          )}
        </div>

        <Link
          to={`/admin/clientes/${a.customer_id}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-500 hover:text-navy-800"
          onClick={() => onOpenChange(false)}
        >
          <ExternalLink className="size-3.5" /> Ver perfil do cliente
        </Link>

        {/* Ações de status */}
        <div className="mt-4 flex flex-wrap gap-2">
          {a.status === "scheduled" && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setStatus("confirmed")}
            >
              <CheckCircle2 className="size-4" /> Confirmar
            </Button>
          )}
          {(a.status === "scheduled" || a.status === "confirmed") && (
            <Button size="sm" disabled={busy} onClick={() => setStatus("in_progress")}>
              <Play className="size-4" /> Iniciar atendimento
            </Button>
          )}
          {(a.status === "in_progress" || a.status === "confirmed" || a.status === "scheduled") && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setStatus("completed")}
            >
              <CheckCircle2 className="size-4" /> Concluir
            </Button>
          )}
          {["scheduled", "confirmed", "in_progress"].includes(a.status) && (
            <>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => setStatus("no_show")}>
                <UserX className="size-4" /> Não compareceu
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => setStatus("cancelled")}>
                <XCircle className="size-4" /> Cancelar
              </Button>
            </>
          )}
          {a.status === "completed" && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("confirmed")}>
              <RotateCcw className="size-4" /> Reabrir (remove do financeiro)
            </Button>
          )}
          {(a.status === "cancelled" || a.status === "no_show") && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("scheduled")}>
              <RotateCcw className="size-4" /> Reativar agendamento
            </Button>
          )}
        </div>

        {/* Reagendar */}
        {["scheduled", "confirmed"].includes(a.status) && (
          <div className="mt-4 rounded-xl border border-navy-100 p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-semibold text-navy-800 cursor-pointer"
              onClick={() => setRescheduling((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Pencil className="size-4 text-navy-400" /> Reagendar / trocar serviço
              </span>
              <span className="text-xs text-navy-400">{rescheduling ? "fechar" : "abrir"}</span>
            </button>
            {rescheduling && (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <Label>Serviço</Label>
                  <Select value={newServiceId ?? undefined} onValueChange={(v) => setNewServiceId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(services ?? [])
                        .filter((s) => s.active || s.id === a.service_id)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {formatBRL(Number(s.price))} · {formatDuration(s.duration_minutes)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rs-date">Data</Label>
                  <Input
                    id="rs-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <TimeField date={newDate} serviceId={newServiceId} value={newTime} onChange={setNewTime} />
                <Button variant="red" size="sm" disabled={busy} onClick={saveReschedule}>
                  Salvar alteração
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Observações */}
        <div className="mt-4">
          <Label htmlFor="ad-notes">Observações</Label>
          <Textarea id="ad-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {notes !== (a.notes ?? "") && (
            <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={saveNotes}>
              Salvar observações
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Bloquear horário ================= */

export function BlockTimeDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}) {
  const invalidate = useInvalidateAgenda();
  const { data: hours } = useQuery({ queryKey: ["business_hours"], queryFn: fetchBusinessHours });

  const [date, setDate] = useState(todaySpDate());
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(defaultDate ?? todaySpDate());
      setStart("12:00");
      setEnd("13:00");
      setReason("");
    }
  }, [open, defaultDate]);

  function fillWholeDay() {
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const bh = (hours ?? []).find((h) => h.weekday === weekday);
    setStart(bh?.is_open ? trimTime(bh.open_time) : "08:00");
    setEnd(bh?.is_open ? trimTime(bh.close_time) : "18:00");
    if (!reason) setReason("Dia bloqueado");
  }

  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(start) &&
    /^\d{2}:\d{2}$/.test(end) &&
    end > start;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await createBlockedTime({ date, startTime: start, endTime: end, reason });
      invalidate();
      toast.success("Horário bloqueado.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao bloquear horário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>
            O período bloqueado some da agenda pública imediatamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="bt-date">Data</Label>
            <Input id="bt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bt-start">Início</Label>
              <Input id="bt-start" type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bt-end">Fim</Label>
              <Input id="bt-end" type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <Button variant="soft" size="sm" className="self-start" onClick={fillWholeDay}>
            <CalendarX className="size-4" /> Bloquear o dia inteiro
          </Button>
          <div>
            <Label htmlFor="bt-reason">
              Motivo <span className="font-normal text-navy-300">(opcional)</span>
            </Label>
            <Input
              id="bt-reason"
              placeholder="Ex.: compromisso pessoal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="red" disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? <Spinner className="text-white" /> : <CalendarX className="size-4" />}
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Detalhe de bloqueio ================= */

export function BlockedDetailsDialog({
  blocked,
  open,
  onOpenChange,
}: {
  blocked: BlockedTime | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useInvalidateAgenda();
  const [busy, setBusy] = useState(false);
  if (!blocked) return null;
  const { date } = isoToSpParts(blocked.starts_at);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteBlockedTime(blocked!.id);
      invalidate();
      toast.success("Bloqueio removido — horários liberados.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover bloqueio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Horário bloqueado</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-navy-50 rounded-xl border border-navy-100 px-4 py-1">
          <InfoRow label="Data">
            <span>{formatDateLongPT(date)}</span>
          </InfoRow>
          <InfoRow label="Período">
            {formatTimeSP(blocked.starts_at)} – {formatTimeSP(blocked.ends_at)}
          </InfoRow>
          {blocked.reason && <InfoRow label="Motivo">{blocked.reason}</InfoRow>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="danger" disabled={busy} onClick={handleDelete}>
            <Trash2 className="size-4" /> Remover bloqueio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Ocorrência de horário fixo ================= */

export function FixedOccurrenceDialog({
  occurrence,
  open,
  onOpenChange,
}: {
  occurrence: { fixed: FixedSchedule; date: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useInvalidateAgenda();
  const [busy, setBusy] = useState(false);
  if (!occurrence) return null;
  const { fixed, date } = occurrence;

  async function materialize(status: "confirmed" | "cancelled") {
    if (!fixed.service || busy) return;
    setBusy(true);
    try {
      await createAppointment({
        customerId: fixed.customer_id,
        serviceId: fixed.service_id,
        date,
        time: trimTime(fixed.start_time),
        durationMinutes: fixed.service.duration_minutes,
        price: Number(fixed.service.price),
        status,
        notes: "",
        origin: "fixed",
        fixedScheduleId: fixed.id,
      });
      invalidate();
      toast.success(
        status === "confirmed"
          ? "Atendimento criado a partir do horário fixo."
          : "Horário liberado apenas nesta data.",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-crimson-700">Horário fixo</DialogTitle>
          <DialogDescription>Reservado toda {WEEKDAY_LABEL[fixed.weekday].toLowerCase()}.</DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-navy-50 rounded-xl border border-navy-100 px-4 py-1">
          <InfoRow label="Cliente">{fixed.customer?.name}</InfoRow>
          <InfoRow label="Serviço">{fixed.service?.name}</InfoRow>
          <InfoRow label="Data">
            <span>{formatDateLongPT(date)}</span>
          </InfoRow>
          <InfoRow label="Horário">{trimTime(fixed.start_time)}</InfoRow>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={() => materialize("confirmed")}
          >
            <CalendarCheck className="size-4" /> Converter em atendimento
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => materialize("cancelled")}>
            <CalendarX className="size-4" /> Liberar horário só nesta data
          </Button>
          <Link
            to="/admin/horarios-fixos"
            onClick={() => onOpenChange(false)}
            className="mt-1 text-center text-xs font-semibold text-navy-500 hover:text-navy-800"
          >
            Gerenciar horários fixos →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
