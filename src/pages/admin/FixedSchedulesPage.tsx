import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { CustomerPicker, customerSelectionValid, type CustomerSelection } from "@/components/admin/CustomerPicker";
import { useInvalidateAgenda } from "@/components/admin/AppointmentDialogs";
import { useSettings } from "@/hooks/usePublicData";
import {
  createCustomer,
  createFixedSchedule,
  deleteFixedSchedule,
  fetchAllServices,
  fetchBusinessHours,
  fetchFixedSchedules,
  updateFixedSchedule,
} from "@/lib/api";
import {
  formatBRL,
  formatDuration,
  minutesToTime,
  onlyDigits,
  timeToMinutes,
  trimTime,
} from "@/lib/format";
import { WEEKDAY_LABEL, type FixedSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function FixedFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FixedSchedule | null;
}) {
  const invalidate = useInvalidateAgenda();
  const { data: services } = useQuery({ queryKey: ["services", "all"], queryFn: fetchAllServices });
  const { data: hours } = useQuery({ queryKey: ["business_hours"], queryFn: fetchBusinessHours });
  const { data: allFixed } = useQuery({ queryKey: ["fixed"], queryFn: fetchFixedSchedules });
  const { data: settings } = useSettings();

  const [customerSel, setCustomerSel] = useState<CustomerSelection>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [weekday, setWeekday] = useState(2);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerSel(
        editing?.customer ? { kind: "existing", customer: editing.customer } : null,
      );
      setServiceId(editing?.service_id ?? null);
      setWeekday(editing?.weekday ?? 2);
      setTime(editing ? trimTime(editing.start_time) : "");
      setNotes(editing?.notes ?? "");
    }
  }, [open, editing]);

  const activeServices = useMemo(() => (services ?? []).filter((s) => s.active), [services]);
  const service = activeServices.find((s) => s.id === serviceId) ?? null;

  // Opções de horário conforme o funcionamento do dia escolhido
  const timeOptions = useMemo(() => {
    const bh = (hours ?? []).find((h) => h.weekday === weekday);
    const step = settings?.slot_interval_minutes ?? 30;
    const start = bh?.is_open ? timeToMinutes(trimTime(bh.open_time)) : 8 * 60;
    const end = bh?.is_open ? timeToMinutes(trimTime(bh.close_time)) : 20 * 60;
    const opts: string[] = [];
    for (let m = start; m < end; m += step) opts.push(minutesToTime(m));
    if (time && !opts.includes(time)) opts.unshift(time);
    return opts;
  }, [hours, weekday, settings, time]);

  // Aviso de conflito com outro horário fixo do mesmo dia
  const conflict = useMemo(() => {
    if (!time || !service) return null;
    const start = timeToMinutes(time);
    const end = start + service.duration_minutes;
    return (
      (allFixed ?? []).find((f) => {
        if (!f.active || f.weekday !== weekday || f.id === editing?.id) return false;
        const fs = timeToMinutes(trimTime(f.start_time));
        const fe = fs + (f.service?.duration_minutes ?? 30);
        return fs < end && fe > start;
      }) ?? null
    );
  }, [allFixed, weekday, time, service, editing]);

  const valid = customerSelectionValid(customerSel) && service !== null && /^\d{2}:\d{2}$/.test(time);

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
          whatsapp: onlyDigits(customerSel!.whatsapp),
        });
        customerId = created.id;
      }
      if (editing) {
        await updateFixedSchedule(editing.id, {
          customer_id: customerId,
          service_id: service.id,
          weekday,
          start_time: time,
          notes,
        });
      } else {
        await createFixedSchedule({
          customerId,
          serviceId: service.id,
          weekday,
          startTime: time,
          notes,
        });
      }
      invalidate();
      toast.success(editing ? "Horário fixo atualizado!" : "Horário fixo criado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar horário fixo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar horário fixo" : "Novo horário fixo"}</DialogTitle>
          <DialogDescription>
            O horário fica reservado para este cliente toda semana e some do site.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Cliente</Label>
            <CustomerPicker value={customerSel} onChange={setCustomerSel} />
          </div>

          <div>
            <Label>Serviço</Label>
            <Select value={serviceId ?? undefined} onValueChange={setServiceId}>
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
              <Label>Dia da semana</Label>
              <Select value={String(weekday)} onValueChange={(v) => setWeekday(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_ORDER.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {WEEKDAY_LABEL[w]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horário</Label>
              <Select value={time || undefined} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="--:--" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {conflict && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              Atenção: conflita com o horário fixo de {conflict.customer?.name} (
              {trimTime(conflict.start_time)}). Você ainda pode salvar, mas os dois vão disputar o
              mesmo horário.
            </p>
          )}

          <div>
            <Label htmlFor="fx-notes">
              Observações <span className="font-normal text-navy-300">(opcional)</span>
            </Label>
            <Textarea id="fx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="red" disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? <Spinner className="text-white" /> : <Repeat className="size-4" />}
            {editing ? "Salvar alterações" : "Criar horário fixo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FixedSchedulesPage() {
  const invalidate = useInvalidateAgenda();
  const { data: fixed, isLoading } = useQuery({ queryKey: ["fixed"], queryFn: fetchFixedSchedules });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FixedSchedule | null>(null);
  const [deleting, setDeleting] = useState<FixedSchedule | null>(null);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<number, FixedSchedule[]>();
    (fixed ?? []).forEach((f) => map.set(f.weekday, [...(map.get(f.weekday) ?? []), f]));
    map.forEach((list) => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [fixed]);

  async function toggleActive(f: FixedSchedule, value: boolean) {
    try {
      await updateFixedSchedule(f.id, { active: value });
      invalidate();
      toast.success(
        value
          ? "Horário fixo reativado — voltou a bloquear a agenda."
          : "Horário fixo pausado — o horário voltou a ficar disponível no site.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  }

  async function handleDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteFixedSchedule(deleting.id);
      invalidate();
      toast.success("Horário fixo excluído.");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50/60 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-navy-400" />
        <p className="text-sm text-navy-500">
          <span className="font-semibold text-navy-800">Horários fixos</span> são reservas
          semanais permanentes para clientes de costume. Eles ficam indisponíveis no site
          automaticamente e aparecem destacados em vermelho na agenda — de lá você converte cada
          semana em atendimento ou libera datas específicas.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant="red"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo horário fixo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (fixed ?? []).length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhum horário fixo cadastrado"
          description="Ex.: João, toda terça-feira às 18:00. O horário fica garantido para ele toda semana."
          action={
            <Button variant="red" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Criar horário fixo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {WEEKDAY_ORDER.filter((w) => grouped.has(w)).map((w) => (
            <div key={w}>
              <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-wider text-navy-400">
                {WEEKDAY_LABEL[w]}
              </h3>
              <div className="flex flex-col gap-2">
                {grouped.get(w)!.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-navy-100 border-l-4 border-l-crimson-600 bg-white p-4 shadow-card",
                      !f.active && "opacity-55 border-l-navy-300",
                    )}
                  >
                    <span className="rounded-xl bg-crimson-600 px-2.5 py-1.5 font-display text-base font-bold text-white">
                      {trimTime(f.start_time)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-900">
                        {f.customer?.name}
                        <Badge variant="red" className="text-[0.6rem] uppercase tracking-wider">
                          Horário fixo
                        </Badge>
                        {!f.active && (
                          <Badge variant="gray" className="text-[0.6rem] uppercase">
                            pausado
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-navy-400">
                        {f.service?.name} · {formatBRL(Number(f.service?.price ?? 0))}
                        {f.notes ? ` · ${f.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={f.active} onCheckedChange={(v) => toggleActive(f, v)} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditing(f);
                          setFormOpen(true);
                        }}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-crimson-600 hover:bg-crimson-50"
                        onClick={() => setDeleting(f)}
                        aria-label="Excluir"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <FixedFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir horário fixo?</DialogTitle>
            <DialogDescription>
              O horário de {deleting?.customer?.name} (
              {deleting ? `${WEEKDAY_LABEL[deleting.weekday]}s ${trimTime(deleting.start_time)}` : ""})
              voltará a ficar disponível para agendamento no site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={busy} onClick={handleDelete}>
              <Trash2 className="size-4" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
