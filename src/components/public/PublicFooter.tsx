import { Link } from "react-router-dom";
import { Instagram, Lock, MessageCircle } from "lucide-react";
import { LogoBadge, LogoWordmark } from "@/components/Logo";
import { whatsappLink } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function PublicFooter({
  settings,
  shopScriptName,
}: {
  settings?: Settings;
  shopScriptName: string;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy-950 text-cream-100">
      <div className="barber-stripes h-1.5" />
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <LogoBadge className="size-14" name={shopScriptName} />
            <LogoWordmark light name={shopScriptName} />
          </div>
          {settings?.description && (
            <p className="mt-4 text-sm leading-relaxed text-cream-100/60">{settings.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-10 sm:gap-16">
          <nav className="flex flex-col gap-2.5 text-sm">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-cream-100/40">
              Navegação
            </span>
            <a href="#inicio" className="text-cream-100/75 transition-colors hover:text-white">
              Início
            </a>
            <a href="#servicos" className="text-cream-100/75 transition-colors hover:text-white">
              Serviços
            </a>
            <a href="#contato" className="text-cream-100/75 transition-colors hover:text-white">
              Horários e contato
            </a>
            <Link to="/agendar" className="text-cream-100/75 transition-colors hover:text-white">
              Agendar horário
            </Link>
          </nav>

          <div className="flex flex-col gap-2.5 text-sm">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-cream-100/40">
              Contato
            </span>
            {settings?.whatsapp && (
              <a
                href={whatsappLink(settings.whatsapp, "Olá! Vim pelo site da barbearia.")}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-cream-100/75 transition-colors hover:text-white"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-cream-100/75 transition-colors hover:text-white"
              >
                <Instagram className="size-4" /> @{settings.instagram.replace(/^@/, "")}
              </a>
            )}
            {settings?.address && (
              <span className="text-cream-100/60">{settings.address}</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-cream-100/40 sm:flex-row sm:px-6">
          <span>
            © {year} {settings?.shop_name ?? "Barbearia Fagundes"}. Todos os direitos reservados.
          </span>
          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 transition-colors hover:text-cream-100/80"
          >
            <Lock className="size-3" /> Área do barbeiro
          </Link>
        </div>
      </div>
    </footer>
  );
}
