/**
 * Helpers de formatação e fuso horário.
 *
 * Todos os horários do sistema são armazenados como timestamptz e
 * interpretados no fuso da barbearia (America/Sao_Paulo, UTC-3 fixo
 * desde 2019). O backend (funções SQL) faz a mesma conversão.
 */

export const SHOP_TZ = "America/Sao_Paulo";
export const SHOP_UTC_OFFSET = "-03:00";

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata telefone brasileiro: (19) 99999-9999 */
export function formatPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Link de conversa no WhatsApp (aceita número com ou sem DDI). */
export function whatsappLink(phone: string, message?: string): string {
  let d = onlyDigits(phone);
  if (d && d.length <= 11) d = `55${d}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${d}${text}`;
}

/** Monta um ISO com offset fixo de São Paulo a partir de data (yyyy-MM-dd) e hora (HH:mm). */
export function spDateTimeToIso(date: string, time: string): string {
  return `${date}T${time}:00${SHOP_UTC_OFFSET}`;
}

/** Extrai { date: yyyy-MM-dd, time: HH:mm } de um ISO, no fuso da barbearia. */
export function isoToSpParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

/** Hora HH:mm de um ISO no fuso da barbearia. */
export function formatTimeSP(iso: string): string {
  return isoToSpParts(iso).time;
}

/** Data de hoje (yyyy-MM-dd) no fuso da barbearia. */
export function todaySpDate(): string {
  return isoToSpParts(new Date().toISOString()).date;
}

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Componentes de uma data pura yyyy-MM-dd (sem fuso). */
export function dateParts(date: string): { y: number; m: number; d: number; weekday: number } {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  return { y, m, d, weekday };
}

/** Primeira letra maiúscula (para datas pt-BR, sem Title Case). */
export function capFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Terça-feira, 26 de agosto" a partir de yyyy-MM-dd. */
export function formatDateLongPT(date: string): string {
  const { m, d, weekday } = dateParts(date);
  return capFirst(`${WEEKDAYS_PT[weekday]}, ${d} de ${MONTHS_PT[m - 1]}`);
}

/** "26/08/2026" a partir de yyyy-MM-dd. */
export function formatDateShortPT(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** "26/08 14:30" a partir de um ISO, no fuso da barbearia. */
export function formatDateTimeShortSP(iso: string): string {
  const { date, time } = isoToSpParts(iso);
  const [, m, d] = date.split("-");
  return `${d}/${m} ${time}`;
}

/** "Agosto de 2026" a partir de yyyy-MM (ou yyyy-MM-dd). */
export function formatMonthPT(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return capFirst(`${MONTHS_PT[m - 1]} de ${y}`);
}

/** Soma dias a uma data pura yyyy-MM-dd. */
export function addDaysToDate(date: string, days: number): string {
  const { y, m, d } = dateParts(date);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;
}

/** Diferença em minutos entre dois HH:mm. */
export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/** Minutos desde 00:00 de um HH:mm (ou HH:mm:ss). */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** HH:mm a partir de minutos desde 00:00. */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Normaliza "08:00:00" -> "08:00". */
export function trimTime(time: string): string {
  return time.slice(0, 5);
}

/** Saudação conforme a hora local da barbearia. */
export function greetingPT(): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: SHOP_TZ, hour: "2-digit", hour12: false }).format(
      new Date(),
    ),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Duração humanizada: 90 -> "1h30", 60 -> "1h", 45 -> "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Link "Adicionar à agenda" (Google Calendar). */
export function googleCalendarLink(opts: {
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  details?: string;
  location?: string;
}): string {
  const startMin = timeToMinutes(opts.time);
  const endMin = startMin + opts.durationMinutes;
  const dateCompact = opts.date.replaceAll("-", "");
  const endDate =
    endMin >= 24 * 60 ? addDaysToDate(opts.date, 1).replaceAll("-", "") : dateCompact;
  const fmt = (min: number) =>
    `${String(Math.floor(min / 60) % 24).padStart(2, "0")}${String(min % 60).padStart(2, "0")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${dateCompact}T${fmt(startMin)}/${endDate}T${fmt(endMin)}`,
    ctz: SHOP_TZ,
  });
  if (opts.details) params.set("details", opts.details);
  if (opts.location) params.set("location", opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
