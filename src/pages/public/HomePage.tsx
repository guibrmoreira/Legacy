import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  ChevronDown,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Scissors,
  Timer,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { SectionHeading } from "@/components/public/SectionHeading";
import { LogoBadge } from "@/components/Logo";
import { MustacheIcon, ServiceIcon } from "@/components/ServiceIcon";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useActiveServices, useBusinessHours, useSettings } from "@/hooks/usePublicData";
import {
  dateParts,
  formatBRL,
  formatDuration,
  todaySpDate,
  trimTime,
  whatsappLink,
} from "@/lib/format";
import { WEEKDAY_LABEL, type BusinessHour, type Service } from "@/lib/types";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

function scriptNameFrom(shopName?: string): string {
  if (!shopName) return "Fagundes";
  const cleaned = shopName.replace(/^barbearia\s+/i, "").trim();
  return cleaned || "Fagundes";
}

/* ============================= HERO ============================= */

function Hero({
  tagline,
  description,
  scriptName,
  todayHours,
  address,
  instagram,
}: {
  tagline: string;
  description: string;
  scriptName: string;
  todayHours: BusinessHour | undefined;
  address: string;
  instagram: string;
}) {
  const sentences = tagline
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  const scriptPart = sentences.length > 1 ? `${sentences[sentences.length - 1]}.` : null;
  const displayPart =
    sentences.length > 1 ? sentences.slice(0, -1).join(". ") + "." : tagline;

  return (
    <section id="inicio" className="relative overflow-hidden bg-navy-950">
      <div className="hero-glow absolute inset-0" />
      <div className="dark-grid absolute inset-0" />
      <div className="pointer-events-none absolute -right-32 top-1/2 hidden -translate-y-1/2 opacity-[0.05] lg:block">
        <LogoBadge className="size-[46rem]" name={scriptName} />
      </div>

      <div className="relative mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center gap-10 px-4 pb-20 pt-28 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="max-w-xl text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm"
          >
            <span className="barber-stripes block h-2.5 w-8 rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cream-100/80">
              Atendimento com hora marcada
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[2.6rem] font-bold uppercase leading-[1.05] tracking-wide text-white sm:text-6xl"
          >
            {displayPart}
            {scriptPart && (
              <span className="mt-1 block font-script text-5xl font-bold normal-case italic text-crimson-500 sm:text-7xl">
                {scriptPart}
              </span>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-base leading-relaxed text-cream-100/70 sm:text-lg"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link
              to="/agendar"
              className={cn(buttonVariants({ variant: "red", size: "lg" }), "w-full sm:w-auto")}
            >
              <CalendarPlus className="size-5" />
              Agendar meu horário
            </Link>
            <a
              href="#servicos"
              className={cn(buttonVariants({ variant: "light", size: "lg" }), "w-full sm:w-auto")}
            >
              Conhecer os serviços
              <ArrowRight className="size-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-cream-100/70">
              <Clock className="size-3.5 text-crimson-400" />
              {todayHours?.is_open
                ? `Hoje: ${trimTime(todayHours.open_time)} – ${trimTime(todayHours.close_time)}`
                : "Hoje: fechado"}
            </span>
            {address && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-cream-100/70">
                <MapPin className="size-3.5 text-crimson-400" />
                {address}
              </span>
            )}
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-cream-100/70 transition-colors hover:border-white/30 hover:text-white"
              >
                <Instagram className="size-3.5 text-crimson-400" />@{instagram.replace(/^@/, "")}
              </a>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative shrink-0"
        >
          <div className="absolute inset-0 -z-10 scale-110 rounded-full bg-crimson-600/20 blur-3xl" />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <LogoBadge
              className="size-56 drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)] sm:size-72 lg:size-80"
              name={scriptName}
            />
          </motion.div>
        </motion.div>
      </div>

      <motion.a
        href="#servicos"
        aria-label="Rolar para serviços"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-cream-100/40 transition-colors hover:text-white sm:block"
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <ChevronDown className="size-6" />
        </motion.div>
      </motion.a>

      <div className="barber-stripes absolute inset-x-0 bottom-0 h-1.5" />
    </section>
  );
}

/* =========================== SERVIÇOS =========================== */

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col rounded-2xl border border-navy-100 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover"
    >
      {service.image_url ? (
        <img
          src={service.image_url}
          alt={service.name}
          className="mb-4 h-36 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-navy-950 text-cream-100 transition-colors duration-300 group-hover:bg-crimson-600">
          <ServiceIcon icon={service.icon} className="size-5" />
        </div>
      )}
      <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-navy-950">
        {service.name}
      </h3>
      {service.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-navy-400">
          {service.description}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-crimson-700">{formatBRL(service.price)}</span>
        <Badge variant="gray" className="gap-1">
          <Timer className="size-3" />
          {formatDuration(service.duration_minutes)}
        </Badge>
      </div>
      <Link
        to={`/agendar?servico=${service.id}`}
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-navy-100/80 text-sm font-semibold text-navy-800 transition-all hover:bg-navy-950 hover:text-white"
      >
        <CalendarPlus className="size-4" />
        Agendar
      </Link>
    </motion.div>
  );
}

function ServicesSection({ services, loading }: { services: Service[]; loading: boolean }) {
  return (
    <section id="servicos" className="scroll-mt-20 bg-cream-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Tabela de serviços"
          title="Escolha seu estilo"
          description="Preços e durações transparentes. Escolha o serviço e agende na hora."
        />
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-navy-100 bg-white p-6">
                <Skeleton className="mb-4 size-12 rounded-xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-6 h-8 w-1/3" />
                <Skeleton className="mt-5 h-10 w-full" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="Serviços em breve"
            description="A tabela de serviços está sendo preparada. Volte em instantes!"
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ========================= EXPERIÊNCIA ========================= */

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Agende em 1 minuto",
    text: "Escolha o serviço, o dia e o horário direto do celular. Sem ligação, sem espera, a qualquer hora.",
  },
  {
    icon: Clock,
    title: "Seu horário é só seu",
    text: "Com hora marcada não tem fila: você chega, senta e é atendido no horário combinado.",
  },
  {
    icon: MustacheIcon,
    title: "Acabamento clássico",
    text: "Navalha, toalha quente e finalização caprichada em cada atendimento, do início ao fim.",
  },
];

function ExperienceSection() {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-20 sm:py-28">
      <div className="dark-grid absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          dark
          eyebrow="A experiência"
          title="Feito para quem valoriza o próprio tempo"
        />
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-colors duration-300 hover:border-crimson-500/40 hover:bg-white/[0.08]"
            >
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-crimson-600 text-white shadow-lg shadow-crimson-600/30">
                <feature.icon className="size-5" />
              </div>
              <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cream-100/60">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================== COMO FUNCIONA ======================== */

const STEPS = [
  { number: "01", title: "Escolha o serviço", text: "Corte, barba, combo — tudo com preço e duração na tela." },
  { number: "02", title: "Escolha data e horário", text: "Você só vê horários realmente livres. Sem conflito, sem surpresa." },
  { number: "03", title: "Confirme seus dados", text: "Nome e WhatsApp. Pronto — seu horário está reservado." },
];

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Como funciona"
          title="Três passos e pronto"
          description="Nada de formulário gigante. O agendamento leva menos de um minuto."
        />
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="absolute left-0 right-0 top-7 hidden border-t-2 border-dashed border-navy-100 md:block" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="z-10 mb-4 flex size-14 items-center justify-center rounded-full border-2 border-crimson-600 bg-white font-display text-lg font-bold text-crimson-600 shadow-md">
                {step.number}
              </div>
              <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-navy-950">
                {step.title}
              </h3>
              <p className="mt-2 max-w-60 text-sm text-navy-400">{step.text}</p>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="mt-12 text-center">
          <Link to="/agendar" className={buttonVariants({ variant: "red", size: "lg" })}>
            <CalendarPlus className="size-5" />
            Agendar meu horário
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ====================== HORÁRIOS E CONTATO ====================== */

function InfoSection({
  hours,
  address,
  whatsapp,
  instagram,
}: {
  hours: BusinessHour[];
  address: string;
  whatsapp: string;
  instagram: string;
}) {
  const todayWeekday = dateParts(todaySpDate()).weekday;

  return (
    <section id="contato" className="scroll-mt-20 bg-cream-50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading eyebrow="Visite a gente" title="Horários e contato" />
        <div className="grid gap-5 md:grid-cols-2">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-navy-100 bg-white p-7 shadow-card"
          >
            <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-navy-950">
              <Clock className="size-5 text-crimson-600" />
              Horário de funcionamento
            </h3>
            <ul className="divide-y divide-navy-50">
              {hours.map((bh) => (
                <li
                  key={bh.weekday}
                  className={cn(
                    "flex items-center justify-between py-2.5 text-sm",
                    bh.weekday === todayWeekday ? "font-semibold text-navy-950" : "text-navy-600",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {WEEKDAY_LABEL[bh.weekday]}
                    {bh.weekday === todayWeekday && (
                      <Badge variant="red" className="text-[0.65rem]">
                        hoje
                      </Badge>
                    )}
                  </span>
                  {bh.is_open ? (
                    <span>
                      {trimTime(bh.open_time)} – {trimTime(bh.close_time)}
                    </span>
                  ) : (
                    <span className="text-navy-300">Fechado</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col rounded-2xl border border-navy-100 bg-white p-7 shadow-card"
          >
            <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold uppercase tracking-wide text-navy-950">
              <MapPin className="size-5 text-crimson-600" />
              Onde nos encontrar
            </h3>
            {address ? (
              <>
                <p className="text-sm leading-relaxed text-navy-600">{address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-crimson-600 hover:text-crimson-700"
                >
                  Ver no mapa <ArrowRight className="size-3.5" />
                </a>
              </>
            ) : (
              <p className="text-sm text-navy-400">
                Endereço em breve. Fale com a gente pelo WhatsApp para saber como chegar.
              </p>
            )}
            <div className="mt-auto flex flex-col gap-2.5 pt-6">
              {whatsapp && (
                <a
                  href={whatsappLink(whatsapp, "Olá! Vim pelo site da barbearia.")}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "red" }), "w-full")}
                >
                  <MessageCircle className="size-4" />
                  Chamar no WhatsApp
                </a>
              )}
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  <Instagram className="size-4" />
                  Seguir no Instagram
                </a>
              )}
              <Link to="/agendar" className={cn(buttonVariants({ variant: "default" }), "w-full")}>
                <CalendarPlus className="size-4" />
                Agendar horário
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================ PÁGINA ============================ */

export function HomePage() {
  const { data: settings } = useSettings();
  const { data: services, isLoading: loadingServices } = useActiveServices();
  const { data: hours } = useBusinessHours();

  const scriptName = scriptNameFrom(settings?.shop_name);
  const todayWeekday = dateParts(todaySpDate()).weekday;
  const todayHours = hours?.find((h) => h.weekday === todayWeekday);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader shopScriptName={scriptName} />
      <main>
        <Hero
          tagline={settings?.tagline || "Seu corte. Seu estilo. Seu horário."}
          description={
            settings?.description ||
            "Tradição de barbearia clássica com acabamento moderno. Atendimento com hora marcada, do jeito que você merece."
          }
          scriptName={scriptName}
          todayHours={todayHours}
          address={settings?.address ?? ""}
          instagram={settings?.instagram ?? ""}
        />
        <ServicesSection services={services ?? []} loading={loadingServices} />
        <ExperienceSection />
        <HowItWorksSection />
        <InfoSection
          hours={hours ?? []}
          address={settings?.address ?? ""}
          whatsapp={settings?.whatsapp ?? ""}
          instagram={settings?.instagram ?? ""}
        />
      </main>
      <PublicFooter settings={settings} shopScriptName={scriptName} />
    </div>
  );
}
