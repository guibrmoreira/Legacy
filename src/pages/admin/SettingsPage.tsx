import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, KeyRound, LogOut, Save, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { LogoBadge } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/usePublicData";
import { fetchBusinessHours, updateSettings, upsertBusinessHours } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { formatPhoneBR, onlyDigits, trimTime } from "@/lib/format";
import { WEEKDAY_LABEL, type BusinessHour } from "@/lib/types";
import { useNavigate } from "react-router-dom";

/* ===================== Aba: barbearia ===================== */

function ShopTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useSettings();

  const [form, setForm] = useState({
    shop_name: "",
    tagline: "",
    description: "",
    logo_url: "",
    whatsapp: "",
    instagram: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        shop_name: settings.shop_name,
        tagline: settings.tagline,
        description: settings.description,
        logo_url: settings.logo_url ?? "",
        whatsapp: formatPhoneBR(settings.whatsapp),
        instagram: settings.instagram,
        address: settings.address,
      });
    }
  }, [settings]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await updateSettings({
        shop_name: form.shop_name.trim() || "Barbearia Fagundes",
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        logo_url: form.logo_url.trim() || null,
        whatsapp: onlyDigits(form.whatsapp),
        instagram: form.instagram.replace(/^@/, "").trim(),
        address: form.address.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Informações salvas — o site já está atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="flex items-center gap-4">
        {form.logo_url ? (
          <img
            src={form.logo_url}
            alt="Logo"
            className="size-16 rounded-full object-cover shadow-md"
          />
        ) : (
          <LogoBadge className="size-16" />
        )}
        <div className="flex-1">
          <Label htmlFor="st-logo">
            URL da logo <span className="font-normal text-navy-300">(opcional — sem URL, usamos o selo padrão)</span>
          </Label>
          <Input
            id="st-logo"
            placeholder="https://..."
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="st-name">Nome da barbearia</Label>
          <Input
            id="st-name"
            value={form.shop_name}
            onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="st-tagline">Frase de impacto (hero)</Label>
          <Input
            id="st-tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="st-desc">Descrição</Label>
        <Textarea
          id="st-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="st-wpp">WhatsApp da barbearia</Label>
          <Input
            id="st-wpp"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: formatPhoneBR(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="st-insta">Instagram</Label>
          <Input
            id="st-insta"
            placeholder="@barbearia"
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="st-addr">Endereço</Label>
        <Input
          id="st-addr"
          placeholder="Rua, número — bairro, cidade"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      <Button variant="red" className="self-end" disabled={saving} onClick={handleSave}>
        {saving ? <Spinner className="text-white" /> : <Save className="size-4" />}
        Salvar informações
      </Button>
    </div>
  );
}

/* ===================== Aba: agenda ===================== */

function AgendaTab() {
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const { data: hours, isLoading } = useQuery({
    queryKey: ["business_hours"],
    queryFn: fetchBusinessHours,
  });

  const [rows, setRows] = useState<BusinessHour[]>([]);
  const [slotInterval, setSlotInterval] = useState(30);
  const [windowDays, setWindowDays] = useState(30);
  const [leadMinutes, setLeadMinutes] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hours) {
      setRows(
        [...hours]
          .sort((a, b) => a.weekday - b.weekday)
          .map((h) => ({
            ...h,
            open_time: trimTime(h.open_time),
            close_time: trimTime(h.close_time),
            break_start: h.break_start ? trimTime(h.break_start) : null,
            break_end: h.break_end ? trimTime(h.break_end) : null,
          })),
      );
    }
  }, [hours]);

  useEffect(() => {
    if (settings) {
      setSlotInterval(settings.slot_interval_minutes);
      setWindowDays(settings.booking_window_days);
      setLeadMinutes(settings.min_lead_minutes);
    }
  }, [settings]);

  function updateRow(weekday: number, patch: Partial<BusinessHour>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    if (saving) return;
    for (const r of rows) {
      if (!r.is_open) continue;
      if (r.close_time <= r.open_time) {
        toast.error(`${WEEKDAY_LABEL[r.weekday]}: o fechamento deve ser depois da abertura.`);
        return;
      }
      const hasBreak = Boolean(r.break_start) !== Boolean(r.break_end);
      if (hasBreak) {
        toast.error(`${WEEKDAY_LABEL[r.weekday]}: preencha início e fim do intervalo (ou deixe ambos vazios).`);
        return;
      }
      if (r.break_start && r.break_end) {
        if (r.break_end <= r.break_start || r.break_start < r.open_time || r.break_end > r.close_time) {
          toast.error(`${WEEKDAY_LABEL[r.weekday]}: intervalo fora do horário de funcionamento.`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await upsertBusinessHours(
        rows.map((r) => ({
          weekday: r.weekday,
          is_open: r.is_open,
          open_time: r.open_time,
          close_time: r.close_time,
          break_start: r.is_open ? r.break_start : null,
          break_end: r.is_open ? r.break_end : null,
        })),
      );
      await updateSettings({
        slot_interval_minutes: slotInterval,
        booking_window_days: windowDays,
        min_lead_minutes: leadMinutes,
      });
      queryClient.invalidateQueries({ queryKey: ["business_hours"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Agenda atualizada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar agenda.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Dias e horários de funcionamento
        </p>
        <div className="flex flex-col divide-y divide-navy-50">
          {rows.map((r) => (
            <div key={r.weekday} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:gap-4">
              <label className="flex w-44 shrink-0 cursor-pointer items-center gap-2.5">
                <Switch checked={r.is_open} onCheckedChange={(v) => updateRow(r.weekday, { is_open: v })} />
                <span className={r.is_open ? "text-sm font-semibold text-navy-900" : "text-sm text-navy-300"}>
                  {WEEKDAY_LABEL[r.weekday]}
                </span>
              </label>
              {r.is_open ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-navy-500">
                  <Input
                    type="time"
                    className="h-9 w-28"
                    value={r.open_time}
                    onChange={(e) => updateRow(r.weekday, { open_time: e.target.value })}
                  />
                  <span>às</span>
                  <Input
                    type="time"
                    className="h-9 w-28"
                    value={r.close_time}
                    onChange={(e) => updateRow(r.weekday, { close_time: e.target.value })}
                  />
                  <span className="ml-2 text-xs text-navy-300">intervalo:</span>
                  <Input
                    type="time"
                    className="h-9 w-28"
                    value={r.break_start ?? ""}
                    onChange={(e) => updateRow(r.weekday, { break_start: e.target.value || null })}
                  />
                  <span>—</span>
                  <Input
                    type="time"
                    className="h-9 w-28"
                    value={r.break_end ?? ""}
                    onChange={(e) => updateRow(r.weekday, { break_end: e.target.value || null })}
                  />
                  {(r.break_start || r.break_end) && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-crimson-600 hover:text-crimson-700 cursor-pointer"
                      onClick={() => updateRow(r.weekday, { break_start: null, break_end: null })}
                    >
                      limpar intervalo
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-sm text-navy-300">Fechado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Regras de agendamento online
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Grade de horários</Label>
            <Select value={String(slotInterval)} onValueChange={(v) => setSlotInterval(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">A cada 15 minutos</SelectItem>
                <SelectItem value="30">A cada 30 minutos</SelectItem>
                <SelectItem value="60">A cada 1 hora</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="ag-window">Agendar com até (dias)</Label>
            <Input
              id="ag-window"
              type="number"
              min={1}
              max={120}
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="ag-lead">Antecedência mínima (min)</Label>
            <Input
              id="ag-lead"
              type="number"
              min={0}
              max={1440}
              step={15}
              value={leadMinutes}
              onChange={(e) => setLeadMinutes(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <Button variant="red" className="self-end" disabled={saving} onClick={handleSave}>
        {saving ? <Spinner className="text-white" /> : <Save className="size-4" />}
        Salvar agenda
      </Button>
    </div>
  );
}

/* ===================== Aba: conta ===================== */

function AccountTab() {
  const { session, signOut, displayName } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    if (password.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setPassword("");
      setConfirm("");
      toast.success("Senha alterada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Sua conta
        </p>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-crimson-600 font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-navy-900">{displayName}</p>
            <p className="text-sm text-navy-400">{session?.user.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Alterar senha
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="ac-pass">Nova senha</Label>
            <Input
              id="ac-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ac-confirm">Confirmar nova senha</Label>
            <Input
              id="ac-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button variant="red" className="self-start" disabled={saving} onClick={changePassword}>
            {saving ? <Spinner className="text-white" /> : <KeyRound className="size-4" />}
            Alterar senha
          </Button>
        </div>
      </div>

      <Button
        variant="outline"
        className="self-start"
        onClick={async () => {
          await signOut();
          navigate("/admin/login");
        }}
      >
        <LogOut className="size-4" /> Sair da conta
      </Button>
    </div>
  );
}

/* ===================== Página ===================== */

export function SettingsPage() {
  return (
    <Tabs defaultValue="shop">
      <TabsList>
        <TabsTrigger value="shop">
          <Store className="size-4" /> Barbearia
        </TabsTrigger>
        <TabsTrigger value="agenda">
          <Clock className="size-4" /> Agenda
        </TabsTrigger>
        <TabsTrigger value="account">
          <KeyRound className="size-4" /> Conta
        </TabsTrigger>
      </TabsList>
      <TabsContent value="shop">
        <ShopTab />
      </TabsContent>
      <TabsContent value="agenda">
        <AgendaTab />
      </TabsContent>
      <TabsContent value="account">
        <AccountTab />
      </TabsContent>
    </Tabs>
  );
}
