import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Scissors, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ServiceIcon, SERVICE_ICON_OPTIONS } from "@/components/ServiceIcon";
import { useInvalidateAgenda } from "@/components/admin/AppointmentDialogs";
import { createService, deleteService, fetchAllServices, updateService } from "@/lib/api";
import { formatBRL, formatDuration } from "@/lib/format";
import type { Service } from "@/lib/types";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];

function ServiceFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Service | null;
}) {
  const invalidate = useInvalidateAgenda();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState(30);
  const [icon, setIcon] = useState("scissors");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setPrice(editing ? String(editing.price) : "");
      setDuration(editing?.duration_minutes ?? 30);
      setIcon(editing?.icon ?? "scissors");
      setImageUrl(editing?.image_url ?? "");
      setSortOrder(String(editing?.sort_order ?? 0));
      setActive(editing?.active ?? true);
    }
  }, [open, editing]);

  const parsedPrice = Number(price.replace(",", "."));
  const valid = name.trim().length >= 2 && Number.isFinite(parsedPrice) && parsedPrice >= 0;

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      description,
      price: parsedPrice,
      duration_minutes: duration,
      icon,
      image_url: imageUrl.trim() || null,
      sort_order: Number(sortOrder) || 0,
      active,
    };
    try {
      if (editing) await updateService(editing.id, payload);
      else await createService(payload);
      invalidate();
      toast.success(editing ? "Serviço atualizado!" : "Serviço criado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar serviço.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          <DialogDescription>
            As alterações aparecem imediatamente no site público.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="sv-name">Nome</Label>
            <Input id="sv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Corte degradê" />
          </div>
          <div>
            <Label htmlFor="sv-desc">Descrição</Label>
            <Textarea
              id="sv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que está incluso nesse serviço?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sv-price">Preço (R$)</Label>
              <Input
                id="sv-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="40,00"
              />
            </div>
            <div>
              <Label>Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {formatDuration(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  onClick={() => setIcon(opt.value)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl border transition-all cursor-pointer",
                    icon === opt.value
                      ? "border-crimson-600 bg-crimson-600 text-white shadow-md"
                      : "border-navy-200 bg-white text-navy-600 hover:border-navy-400",
                  )}
                >
                  <ServiceIcon icon={opt.value} className="size-5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="sv-image">
              URL da imagem <span className="font-normal text-navy-300">(opcional)</span>
            </Label>
            <Input
              id="sv-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <div>
              <Label htmlFor="sv-order">Ordem de exibição</Label>
              <Input
                id="sv-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-navy-200 px-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <span className="text-sm font-medium text-navy-800">
                {active ? "Visível no site" : "Oculto do site"}
              </span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="red" disabled={!valid || saving} onClick={handleSubmit}>
            {saving ? <Spinner className="text-white" /> : <Plus className="size-4" />}
            {editing ? "Salvar alterações" : "Criar serviço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ServicesPage() {
  const invalidate = useInvalidateAgenda();
  const { data: services, isLoading } = useQuery({
    queryKey: ["services", "all"],
    queryFn: fetchAllServices,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...(services ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [services],
  );

  async function toggleActive(service: Service, value: boolean) {
    try {
      await updateService(service.id, { active: value });
      invalidate();
      toast.success(value ? `“${service.name}” visível no site.` : `“${service.name}” oculto do site.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  }

  async function handleDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await deleteService(deleting.id);
      invalidate();
      toast.success("Serviço excluído.");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-400">
          Os serviços abaixo alimentam o site público e o agendamento.
        </p>
        <Button
          variant="red"
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Novo serviço
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço cadastrado"
          description="Cadastre o primeiro serviço para liberar o agendamento online."
          action={
            <Button variant="red" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" /> Criar serviço
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((service) => (
            <div
              key={service.id}
              className={cn(
                "flex flex-col rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition-all",
                !service.active && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-navy-950 text-cream-100">
                  <ServiceIcon icon={service.icon} className="size-5" />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditing(service);
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
                    onClick={() => setDeleting(service)}
                    aria-label="Excluir"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold uppercase tracking-wide text-navy-950">
                {service.name}
              </h3>
              {service.description && (
                <p className="mt-1 line-clamp-2 text-sm text-navy-400">{service.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-crimson-700">
                    {formatBRL(Number(service.price))}
                  </span>
                  <Badge variant="gray" className="gap-1">
                    <Timer className="size-3" />
                    {formatDuration(service.duration_minutes)}
                  </Badge>
                </div>
                <label className="flex cursor-pointer items-center gap-2" title={service.active ? "Visível no site" : "Oculto do site"}>
                  <Switch
                    checked={service.active}
                    onCheckedChange={(v) => toggleActive(service, v)}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              Se este serviço já tiver atendimentos no histórico, prefira desativá-lo — a exclusão
              será bloqueada para preservar os registros.
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
