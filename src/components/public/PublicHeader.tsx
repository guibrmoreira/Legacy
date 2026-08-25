import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, Menu, X } from "lucide-react";
import { LogoBadge, LogoWordmark } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Serviços", href: "#servicos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Horários e contato", href: "#contato" },
];

export function PublicHeader({ shopScriptName }: { shopScriptName: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || menuOpen
          ? "bg-navy-950/95 shadow-lg shadow-navy-950/40 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
        <a href="#inicio" className="flex items-center gap-2.5" aria-label="Início">
          <LogoBadge className="size-10 sm:size-11" name={shopScriptName} />
          <LogoWordmark light name={shopScriptName} className="hidden xs:flex sm:flex" />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-cream-100/80 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/agendar"
            className={cn(
              buttonVariants({ variant: "red", size: "sm" }),
              "hidden h-9 px-4 md:inline-flex",
            )}
          >
            <CalendarPlus className="size-4" />
            Agendar
          </Link>
          <Link
            to="/agendar"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crimson-600 px-3.5 text-sm font-semibold text-white shadow-md shadow-crimson-600/25 transition-colors hover:bg-crimson-700 md:hidden"
          >
            <CalendarPlus className="size-4" />
            Agendar
          </Link>
          <button
            className="flex size-9 items-center justify-center rounded-lg text-cream-100 transition-colors hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/10 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-cream-100/90 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
