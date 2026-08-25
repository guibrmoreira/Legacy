import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarPlus,
  ClipboardList,
  MessageCircle,
  Pencil,
  Repeat,
  Scissors,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AppointmentDetailsDialog,
  NewAppointmentDialog,
  useInvalidateAgenda,
} from "@/components/admin/AppointmentDialogs";
import {
  deleteCustomer,
  fetchAppointmentsOfCustomer,
  fetchCustomer,
  fetchFixedSchedules,
  updateCustomer,
} from "@/lib/api";
import {
  formatBRL,
  formatDateShortPT,
  formatPhoneBR,
  formatTimeSP,
  isoToSpParts,
  onlyDigits,
  trimTime,
  whatsappLink,
} from "@/lib/format";
import { WEEKDAY_LABEL, type Appointment } from "@/lib/types";

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invalidate = useInvalidateAgenda();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customers", id],
    queryFn: () => fetchCustomer(id!),
    enabled: Boolean(id),
  });
  const { data: history } = useQuery({
    queryKey: ["appointments", "customer", id],
    queryFn: () => fetchAppointmentsOfCustomer(id!),
    enabled: Boolean(id),
  });
  const { data: fixed } = useQuery({ queryKey: ["fixed"], queryFn: fetchFixedSchedules });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [details, setDetails] = useState<Appointment | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setWhatsapp(formatPhoneBR(customer.whatsapp));
      setNotes(customer.notes ?? "");
    }
  }, [customer]);

  const stats = useMemo(() => {
    const completed = (history ?? []).filter((a) => a.status === "completed");
    const total = completed.reduce((sum, a) => sum + Number(a.price), 0);
    const last = completed[0] ? isoToSpParts(completed[0].starts_at).date : null;
    const byService = new Map<string, number>();
    completed.forEach((a) => {
      const key = a.service?.name ?? "—";
      byService.set(key, (byService.get(key) ?? 0) + 1);
    });
    const favorite = [...byService.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { count: completed.length, total, last, favorite };
  }, [history]);

  const customerFixed = useMemo(
    () => (fixed ?? []).filter((f) => f.customer_id === id && f.active),
    [fixed, id],
  );

  async function saveEdit() {
    if (!customer || busy) return;
    setBusy(true);
    try {
      await updateCustomer(customer.id, {
        name: name.trim(),
        whatsapp: onlyDigits(whatsapp),
        notes,
      });
      invalidate();
      toast.success("Cliente atualizado.");
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!customer || busy) return;
    setBusy(true);
    try {
      await updateCustomer(customer.id, { notes });
      invalidate();
      toast.success("Observações salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!customer || busy) return;
    setBusy(true);
    try {
      await deleteCustomer(customer.id);
      invalidate();
      toast.success("Cliente excluído.");
      navigate("/admin/clientes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
      setBusy(false);
    }
  }

  if (isLoading || !customer) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-400 transition-colors hover:text-navy-800"
      >
        <ArrowLeft className="size-4" /> Voltar para clientes
      </Link>

      {/* Cabeçalho do perfil */}
      <div className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-navy-950 font-display text-xl font-bold text-cream-100">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold uppercase tracking-wide text-navy-950">
              {customer.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {customer.whatsapp && (
                <a
                  href={whatsappLink(customer.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  <MessageCircle className="size-3.5" />
                  {formatPhoneBR(customer.whatsapp)}
                </a>
              )}
              <span className="text-xs text-navy-300">
                cliente desde {formatDateShortPT(isoToSpParts(customer.created_at).date)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="red" size="sm" onClick={() => setNewApptOpen(true)}>
            <CalendarPlus className="size-4" /> Novo agendamento
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Horários fixos do cliente */}
      {customerFixed.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-crimson-200 bg-crimson-50/60 p-4">
          <Repeat className="size-4 text-crimson-600" />
          <span className="text-sm font-semibold text-crimson-800">Horário fixo:</span>
          {customerFixed.map((f) => (
            <Badge key={f.id} variant="red-solid">
              {WEEKDAY_LABEL[f.weekday]}s — {trimTime(f.start_time)} · {f.service?.name}
            </Badge>
          ))}
          <Link
            to="/admin/horarios-fixos"
            className="ml-auto text-xs font-semibold text-crimson-700 hover:text-crimson-800"
          >
            Gerenciar →
          </Link>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total de atendimentos" value={stats.count} icon={ClipboardList} />
        <StatCard label="Total gasto" value={formatBRL(stats.total)} icon={Wallet} />
        <StatCard
          label="Último atendimento"
          value={stats.last ? formatDateShortPT(stats.last) : "—"}
          icon={CalendarPlus}
        />
        <StatCard label="Serviço favorito" value={stats.favorite ?? "—"} icon={Scissors} />
      </div>

      {/* Observações */}
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <Label htmlFor="cd-notes">Observações do cliente</Label>
        <Textarea
          id="cd-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferências, máquina, corte de costume..."
        />
        {notes !== (customer.notes ?? "") && (
          <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={saveNotes}>
            Salvar observações
          </Button>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Histórico de atendimentos
        </p>
        {(history ?? []).length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum atendimento ainda"
            description="Crie o primeiro agendamento para este cliente."
            action={
              <Button variant="red" size="sm" onClick={() => setNewApptOpen(true)}>
                <CalendarPlus className="size-4" /> Agendar
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-navy-50">
            {(history ?? []).map((a) => {
              const { date } = isoToSpParts(a.starts_at);
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setDetails(a)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-navy-50/50 sm:px-2 cursor-pointer"
                  >
                    <span className="w-24 shrink-0 text-sm font-medium text-navy-600">
                      {formatDateShortPT(date)}
                    </span>
                    <span className="w-12 shrink-0 font-mono text-sm text-navy-500">
                      {formatTimeSP(a.starts_at)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">
                      {a.service?.name}
                    </span>
                    <span className="hidden w-20 text-right text-sm font-semibold text-navy-900 sm:block">
                      {formatBRL(Number(a.price))}
                    </span>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Diálogo editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="ce-name">Nome</Label>
              <Input id="ce-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ce-phone">WhatsApp</Label>
              <Input
                id="ce-phone"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="red"
              disabled={busy || name.trim().length < 2}
              onClick={saveEdit}
            >
              {busy ? <Spinner className="text-white" /> : <Pencil className="size-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo excluir */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              Isso apaga também todo o histórico de agendamentos de {customer.name}. O faturamento
              já registrado é preservado. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={busy} onClick={handleDelete}>
              <Trash2 className="size-4" /> Excluir de vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NewAppointmentDialog
        open={newApptOpen}
        onOpenChange={setNewApptOpen}
        defaultCustomer={{ kind: "existing", customer }}
      />
      <AppointmentDetailsDialog
        appointment={details}
        open={details !== null}
        onOpenChange={(o) => !o && setDetails(null)}
      />
    </div>
  );
}
