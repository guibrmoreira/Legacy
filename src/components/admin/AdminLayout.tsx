import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat,
  Scissors,
  Settings,
  Users,
  Wallet,
  X,
  ExternalLink,
} from "lucide-react";
import { LogoBadge, LogoWordmark } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { fetchAppointmentsBetween } from "@/lib/api";
import { addDaysToDate, capFirst, formatTimeSP, spDateTimeToIso, todaySpDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/admin/agendamentos", label: "Agendamentos", icon: ClipboardList },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/servicos", label: "Serviços", icon: Scissors },
  { to: "/admin/horarios-fixos", label: "Horários Fixos", icon: Repeat },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function pageTitle(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";
  if (pathname.startsWith("/admin/agenda")) return "Agenda";
  if (pathname.startsWith("/admin/agendamentos")) return "Agendamentos";
  if (/^\/admin\/clientes\/.+/.test(pathname)) return "Perfil do cliente";
  if (pathname.startsWith("/admin/clientes")) return "Clientes";
  if (pathname.startsWith("/admin/servicos")) return "Serviços";
  if (pathname.startsWith("/admin/horarios-fixos")) return "Horários Fixos";
  if (pathname.startsWith("/admin/financeiro")) return "Financeiro";
  if (pathname.startsWith("/admin/relatorios")) return "Relatórios";
  if (pathname.startsWith("/admin/configuracoes")) return "Configurações";
  return "Painel";
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin px-3 py-4">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-white/10 text-white"
                : "text-cream-100/60 hover:bg-white/5 hover:text-white",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-crimson-500 transition-all",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                )}
              />
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function NotificationsBell() {
  const today = todaySpDate();
  const { data: todayAppointments } = useQuery({
    queryKey: ["appointments", "today", today],
    queryFn: () =>
      fetchAppointmentsBetween(
        spDateTimeToIso(today, "00:00"),
        spDateTimeToIso(addDaysToDate(today, 1), "00:00"),
      ),
    refetchInterval: 60_000,
  });

  const upcoming = useMemo(
    () =>
      (todayAppointments ?? []).filter(
        (a) =>
          ["scheduled", "confirmed", "in_progress"].includes(a.status) &&
          new Date(a.ends_at).getTime() > Date.now(),
      ),
    [todayAppointments],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex size-9 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900 cursor-pointer"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          {upcoming.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-crimson-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-crimson-600" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Próximos de hoje</DropdownMenuLabel>
        {upcoming.length === 0 ? (
          <p className="px-2.5 py-3 text-sm text-navy-400">
            Nenhum atendimento restante para hoje.
          </p>
        ) : (
          upcoming.slice(0, 6).map((a) => (
            <DropdownMenuItem key={a.id} asChild>
              <Link to="/admin/agenda" className="flex items-start gap-2.5">
                <span className="mt-0.5 rounded-md bg-navy-950 px-1.5 py-0.5 font-mono text-xs font-semibold text-cream-100">
                  {formatTimeSP(a.starts_at)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-navy-900">
                    {a.customer?.name ?? "Cliente"}
                  </span>
                  <span className="block truncate text-xs text-navy-400">{a.service?.name}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { displayName, signOut, session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const todayLabel = capFirst(
    new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );

  async function handleSignOut() {
    await signOut();
    navigate("/admin/login");
  }

  const sidebarInner = (
    <>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <LogoBadge className="size-11" />
        <LogoWordmark light />
      </div>
      <NavLinks onNavigate={() => setMobileOpen(false)} />
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-crimson-600 text-sm font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-cream-100/40">{session?.user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex size-8 items-center justify-center rounded-lg text-cream-100/50 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-svh bg-navy-50/60">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-950 lg:flex">
        {sidebarInner}
      </aside>

      {/* Drawer mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-950 shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex size-9 items-center justify-center rounded-lg text-cream-100/60 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
              {sidebarInner}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex size-9 items-center justify-center rounded-lg text-navy-600 transition-colors hover:bg-navy-50 lg:hidden cursor-pointer"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-semibold uppercase tracking-wide text-navy-950">
                  {pageTitle(location.pathname)}
                </h1>
                <p className="hidden text-xs text-navy-400 sm:block">{todayLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                to="/"
                target="_blank"
                className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900 sm:flex"
                title="Ver site público"
              >
                <ExternalLink className="size-4" />
                Ver site
              </Link>
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-1 flex size-9 items-center justify-center rounded-full bg-crimson-600 text-sm font-bold text-white transition-transform hover:scale-105 cursor-pointer"
                    aria-label="Menu do usuário"
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => navigate("/admin/configuracoes")}>
                    <Settings /> Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:pb-10"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Navegação inferior mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {[
            NAV_ITEMS[0],
            NAV_ITEMS[1],
            NAV_ITEMS[2],
            NAV_ITEMS[3],
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium transition-colors",
                  isActive ? "text-crimson-600" : "text-navy-400 hover:text-navy-700",
                )
              }
            >
              <item.icon className="size-5" />
              {item.label === "Agendamentos" ? "Agend." : item.label}
            </NavLink>
          ))}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[0.65rem] font-medium text-navy-400 transition-colors hover:text-navy-700 cursor-pointer"
          >
            <Menu className="size-5" />
            Mais
          </button>
        </div>
      </nav>
    </div>
  );
}
