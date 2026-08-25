import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Plus, Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCustomers } from "@/lib/api";
import { formatPhoneBR, onlyDigits } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Cliente escolhido: existente OU novo (criado na confirmação do formulário). */
export type CustomerSelection =
  | { kind: "existing"; customer: Customer }
  | { kind: "new"; name: string; whatsapp: string }
  | null;

export function customerSelectionValid(sel: CustomerSelection): boolean {
  if (!sel) return false;
  if (sel.kind === "existing") return true;
  return sel.name.trim().length >= 2 && onlyDigits(sel.whatsapp).length >= 10;
}

export function CustomerPicker({
  value,
  onChange,
}: {
  value: CustomerSelection;
  onChange: (value: CustomerSelection) => void;
}) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = onlyDigits(search);
    if (!q) return (customers ?? []).slice(0, 5);
    return (customers ?? [])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || (digits.length >= 2 && c.whatsapp.includes(digits)),
      )
      .slice(0, 6);
  }, [customers, search]);

  if (value?.kind === "existing") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-navy-200 bg-navy-50/60 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-cream-100">
            {value.customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-900">{value.customer.name}</p>
            {value.customer.whatsapp && (
              <p className="text-xs text-navy-400">{formatPhoneBR(value.customer.whatsapp)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex size-7 items-center justify-center rounded-lg text-navy-400 transition-colors hover:bg-white hover:text-navy-700 cursor-pointer"
          aria-label="Trocar cliente"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (creating) {
    const newValue = value?.kind === "new" ? value : { kind: "new" as const, name: "", whatsapp: "" };
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-navy-300 bg-navy-50/40 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">
            Novo cliente
          </p>
          <button
            type="button"
            className="text-xs font-semibold text-crimson-600 hover:text-crimson-700 cursor-pointer"
            onClick={() => {
              setCreating(false);
              onChange(null);
            }}
          >
            usar cliente existente
          </button>
        </div>
        <div>
          <Label htmlFor="cp-name">Nome</Label>
          <Input
            id="cp-name"
            placeholder="Nome do cliente"
            value={newValue.name}
            onChange={(e) => onChange({ ...newValue, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cp-phone">WhatsApp</Label>
          <Input
            id="cp-phone"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            value={newValue.whatsapp}
            onChange={(e) => onChange({ ...newValue, whatsapp: formatPhoneBR(e.target.value) })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
        <Input
          placeholder="Buscar cliente por nome ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-44 overflow-y-auto scrollbar-thin rounded-xl border border-navy-100">
        {results.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-navy-400">Nenhum cliente encontrado.</p>
        ) : (
          results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ kind: "existing", customer: c })}
              className={cn(
                "flex w-full items-center gap-2.5 border-b border-navy-50 px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-navy-50 cursor-pointer",
              )}
            >
              <UserRound className="size-4 shrink-0 text-navy-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-navy-900">{c.name}</span>
                {c.whatsapp && (
                  <span className="block text-xs text-navy-400">{formatPhoneBR(c.whatsapp)}</span>
                )}
              </span>
              <Check className="size-4 text-transparent" />
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setCreating(true);
          onChange({ kind: "new", name: search.trim(), whatsapp: "" });
        }}
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-crimson-600 transition-colors hover:text-crimson-700 cursor-pointer"
      >
        <Plus className="size-4" /> Cadastrar novo cliente
      </button>
    </div>
  );
}
