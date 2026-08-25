import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useInvalidateAgenda } from "@/components/admin/AppointmentDialogs";
import { createCustomer, fetchAppointmentsLite, fetchCustomers } from "@/lib/api";
import { formatBRL, formatDateShortPT, formatPhoneBR, isoToSpParts, onlyDigits, whatsappLink } from "@/lib/format";

interface CustomerStats {
  count: number;
  total: number;
  last: string | null;
}

export function NewCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const invalidate = useInvalidateAgenda();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setWhatsapp("");
      setNotes("");
    }
  }, [open]);

  const valid = name.trim().length >= 2 && onlyDigits(whatsapp).length >= 10;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const created = await createCustomer({
        name: name.trim(),
        whatsapp: onlyDigits(whatsapp),
        notes,
      });
      invalidate();
      toast.success("Cliente cadastrado!");
      onOpenChange(false);
      onCreated?.(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nc-name">Nome</Label>
            <Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label htmlFor="nc-phone">WhatsApp</Label>
            <Input
              id="nc-phone"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <Label htmlFor="nc-notes">
              Observações <span className="font-normal text-navy-300">(opcional)</span>
            </Label>
            <Textarea id="nc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferências, máquina, corte de costume..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="red" disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? <Spinner className="text-white" /> : <UserPlus className="size-4" />}
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: liteAppointments } = useQuery({
    queryKey: ["appointments", "lite", "all"],
    queryFn: () => fetchAppointmentsLite(),
  });

  const statsByCustomer = useMemo(() => {
    const map = new Map<string, CustomerStats>();
    (liteAppointments ?? [])
      .filter((a) => a.status === "completed")
      .forEach((a) => {
        const prev = map.get(a.customer_id) ?? { count: 0, total: 0, last: null };
        const date = isoToSpParts(a.starts_at).date;
        map.set(a.customer_id, {
          count: prev.count + 1,
          total: prev.total + Number(a.price),
          last: prev.last && prev.last > date ? prev.last : date,
        });
      });
    return map;
  }, [liteAppointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = onlyDigits(search);
    return (customers ?? []).filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (digits.length >= 2 && c.whatsapp.includes(digits)),
    );
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
          <Input
            placeholder="Buscar por nome ou WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="red" size="sm" onClick={() => setNewOpen(true)}>
          <UserPlus className="size-4" /> Novo cliente
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          description={
            search
              ? "Tente outro nome ou número."
              : "Os clientes são criados automaticamente quando agendam pelo site — ou cadastre manualmente."
          }
          action={
            <Button variant="red" size="sm" onClick={() => setNewOpen(true)}>
              <UserPlus className="size-4" /> Cadastrar cliente
            </Button>
          }
        />
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden rounded-2xl border border-navy-100 bg-white shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Cliente</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="text-right">Total gasto</TableHead>
                  <TableHead className="text-right">Último atendimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const stats = statsByCustomer.get(c.id);
                  return (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell>
                        <Link to={`/admin/clientes/${c.id}`} className="flex items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-cream-100">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-navy-900">{c.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {c.whatsapp ? (
                          <a
                            href={whatsappLink(c.whatsapp)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700"
                          >
                            <MessageCircle className="size-3.5" />
                            {formatPhoneBR(c.whatsapp)}
                          </a>
                        ) : (
                          <span className="text-navy-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{stats?.count ?? 0}</TableCell>
                      <TableCell className="text-right font-semibold text-navy-900">
                        {formatBRL(stats?.total ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-navy-500">
                        {stats?.last ? formatDateShortPT(stats.last) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Cards mobile */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {filtered.map((c) => {
              const stats = statsByCustomer.get(c.id);
              return (
                <Link
                  key={c.id}
                  to={`/admin/clientes/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3.5 shadow-card"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-cream-100">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{c.name}</p>
                    <p className="text-xs text-navy-400">
                      {stats?.count ?? 0} atendimentos · {formatBRL(stats?.total ?? 0)}
                    </p>
                  </div>
                  {c.whatsapp && (
                    <span className="text-xs text-navy-400">{formatPhoneBR(c.whatsapp)}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <NewCustomerDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}
