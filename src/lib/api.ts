import { supabase } from "./supabase";
import { spDateTimeToIso } from "./format";
import type {
  Appointment,
  AppointmentStatus,
  BlockedTime,
  BookingResult,
  BusinessHour,
  Customer,
  FinancialTransaction,
  FixedSchedule,
  Service,
  Settings,
} from "./types";

function fail(error: { message: string } | null): never | void {
  if (error) throw new Error(error.message);
}

const APPOINTMENT_SELECT = "*, customer:customers(*), service:services(*)";

/* ===================== Público ===================== */

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  fail(error);
  return data as Settings;
}

export async function fetchActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  fail(error);
  return (data ?? []) as Service[];
}

export async function fetchBusinessHours(): Promise<BusinessHour[]> {
  const { data, error } = await supabase.from("business_hours").select("*").order("weekday");
  fail(error);
  return (data ?? []) as BusinessHour[];
}

export async function fetchAvailableSlots(date: string, serviceId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_date: date,
    p_service_id: serviceId,
  });
  fail(error);
  return ((data ?? []) as { slot: string }[]).map((r) => r.slot);
}

const BOOKING_ERRORS: Record<string, string> = {
  NOME_OBRIGATORIO: "Informe seu nome para continuar.",
  WHATSAPP_INVALIDO: "Informe um número de WhatsApp válido com DDD.",
  HORA_INVALIDA: "Horário inválido. Escolha novamente.",
  SERVICO_INDISPONIVEL: "Este serviço não está mais disponível.",
  HORARIO_INDISPONIVEL: "Esse horário acabou de ser reservado. Escolha outro, por favor.",
  LIMITE_AGENDAMENTOS: "Você já possui 3 agendamentos futuros. Fale com a barbearia para agendar mais.",
};

export function friendlyBookingError(message: string): string {
  for (const [code, friendly] of Object.entries(BOOKING_ERRORS)) {
    if (message.includes(code)) return friendly;
  }
  return "Não foi possível concluir o agendamento. Tente novamente.";
}

export async function createBooking(input: {
  name: string;
  whatsapp: string;
  serviceId: string;
  date: string;
  time: string;
  notes: string;
}): Promise<BookingResult> {
  const { data, error } = await supabase.rpc("create_booking", {
    p_name: input.name,
    p_whatsapp: input.whatsapp,
    p_service_id: input.serviceId,
    p_date: input.date,
    p_time: input.time,
    p_notes: input.notes,
  });
  if (error) throw new Error(friendlyBookingError(error.message));
  return data as BookingResult;
}

/* ===================== Admin: serviços ===================== */

export async function fetchAllServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("sort_order")
    .order("name");
  fail(error);
  return (data ?? []) as Service[];
}

export type ServiceInput = Omit<Service, "id" | "created_at" | "updated_at">;

export async function createService(input: ServiceInput): Promise<void> {
  const { error } = await supabase.from("services").insert(input);
  fail(error);
}

export async function updateService(id: string, input: Partial<ServiceInput>): Promise<void> {
  const { error } = await supabase.from("services").update(input).eq("id", id);
  fail(error);
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) {
    if (error.message.includes("violates foreign key")) {
      throw new Error(
        "Este serviço já possui atendimentos no histórico. Desative-o em vez de excluir.",
      );
    }
    throw new Error(error.message);
  }
}

/* ===================== Admin: clientes ===================== */

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select("*").order("name");
  fail(error);
  return (data ?? []) as Customer[];
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
  fail(error);
  return data as Customer;
}

export async function createCustomer(input: {
  name: string;
  whatsapp: string;
  notes?: string;
}): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: input.name, whatsapp: input.whatsapp, notes: input.notes ?? "" })
    .select("*")
    .single();
  if (error) {
    if (error.message.includes("customers_whatsapp_key")) {
      throw new Error("Já existe um cliente com esse WhatsApp.");
    }
    throw new Error(error.message);
  }
  return data as Customer;
}

export async function updateCustomer(
  id: string,
  input: Partial<Pick<Customer, "name" | "whatsapp" | "notes">>,
): Promise<void> {
  const { error } = await supabase.from("customers").update(input).eq("id", id);
  if (error) {
    if (error.message.includes("customers_whatsapp_key")) {
      throw new Error("Já existe um cliente com esse WhatsApp.");
    }
    throw new Error(error.message);
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  fail(error);
}

/* ===================== Admin: agendamentos ===================== */

export async function fetchAppointmentsBetween(
  fromIso: string,
  toIso: string,
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at");
  fail(error);
  return (data ?? []) as Appointment[];
}

export async function fetchAppointmentsOfCustomer(customerId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("customer_id", customerId)
    .order("starts_at", { ascending: false });
  fail(error);
  return (data ?? []) as Appointment[];
}

/** Versão leve (sem joins pesados) para agregações de clientes/relatórios. */
export interface AppointmentLite {
  id: string;
  customer_id: string;
  service_id: string;
  status: AppointmentStatus;
  price: number;
  starts_at: string;
  customer: { name: string } | null;
  service: { name: string } | null;
}

export async function fetchAppointmentsLite(fromIso?: string, toIso?: string): Promise<AppointmentLite[]> {
  let query = supabase
    .from("appointments")
    .select("id, customer_id, service_id, status, price, starts_at, customer:customers(name), service:services(name)")
    .order("starts_at", { ascending: false })
    .limit(5000);
  if (fromIso) query = query.gte("starts_at", fromIso);
  if (toIso) query = query.lt("starts_at", toIso);
  const { data, error } = await query;
  fail(error);
  return (data ?? []) as unknown as AppointmentLite[];
}

export async function fetchNextAppointment(): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .in("status", ["scheduled", "confirmed", "in_progress"])
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(1);
  fail(error);
  return ((data ?? [])[0] as Appointment) ?? null;
}

function friendlyConflictError(message: string): Error {
  if (message.includes("appointments_no_overlap")) {
    return new Error("Conflito de horário: já existe um atendimento nesse intervalo.");
  }
  return new Error(message);
}

export async function createAppointment(input: {
  customerId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMinutes: number;
  price: number;
  status: AppointmentStatus;
  notes: string;
  origin: "admin" | "fixed";
  fixedScheduleId?: string;
}): Promise<void> {
  const startsAt = spDateTimeToIso(input.date, input.time);
  const endsAt = new Date(
    new Date(startsAt).getTime() + input.durationMinutes * 60_000,
  ).toISOString();
  const { error } = await supabase.from("appointments").insert({
    customer_id: input.customerId,
    service_id: input.serviceId,
    starts_at: startsAt,
    ends_at: endsAt,
    status: input.status,
    price: input.price,
    notes: input.notes,
    origin: input.origin,
    fixed_schedule_id: input.fixedScheduleId ?? null,
  });
  if (error) throw friendlyConflictError(error.message);
}

export async function updateAppointment(
  id: string,
  input: Partial<{
    starts_at: string;
    ends_at: string;
    status: AppointmentStatus;
    notes: string;
    service_id: string;
    price: number;
  }>,
): Promise<void> {
  const { error } = await supabase.from("appointments").update(input).eq("id", id);
  if (error) throw friendlyConflictError(error.message);
}

/* ===================== Admin: bloqueios ===================== */

export async function fetchBlockedBetween(fromIso: string, toIso: string): Promise<BlockedTime[]> {
  const { data, error } = await supabase
    .from("blocked_times")
    .select("*")
    .lt("starts_at", toIso)
    .gt("ends_at", fromIso)
    .order("starts_at");
  fail(error);
  return (data ?? []) as BlockedTime[];
}

export async function createBlockedTime(input: {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.from("blocked_times").insert({
    starts_at: spDateTimeToIso(input.date, input.startTime),
    ends_at: spDateTimeToIso(input.date, input.endTime),
    reason: input.reason,
  });
  fail(error);
}

export async function deleteBlockedTime(id: string): Promise<void> {
  const { error } = await supabase.from("blocked_times").delete().eq("id", id);
  fail(error);
}

/* ===================== Admin: horários fixos ===================== */

export async function fetchFixedSchedules(): Promise<FixedSchedule[]> {
  const { data, error } = await supabase
    .from("fixed_schedules")
    .select("*, customer:customers(*), service:services(*)")
    .order("weekday")
    .order("start_time");
  fail(error);
  return (data ?? []) as FixedSchedule[];
}

export async function createFixedSchedule(input: {
  customerId: string;
  serviceId: string;
  weekday: number;
  startTime: string;
  notes: string;
}): Promise<void> {
  const { error } = await supabase.from("fixed_schedules").insert({
    customer_id: input.customerId,
    service_id: input.serviceId,
    weekday: input.weekday,
    start_time: input.startTime,
    notes: input.notes,
  });
  fail(error);
}

export async function updateFixedSchedule(
  id: string,
  input: Partial<{
    customer_id: string;
    service_id: string;
    weekday: number;
    start_time: string;
    active: boolean;
    notes: string;
  }>,
): Promise<void> {
  const { error } = await supabase.from("fixed_schedules").update(input).eq("id", id);
  fail(error);
}

export async function deleteFixedSchedule(id: string): Promise<void> {
  const { error } = await supabase.from("fixed_schedules").delete().eq("id", id);
  fail(error);
}

/* ===================== Admin: financeiro ===================== */

export async function fetchTransactionsBetween(
  fromDate: string,
  toDate: string,
): Promise<FinancialTransaction[]> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .gte("occurred_on", fromDate)
    .lte("occurred_on", toDate)
    .order("occurred_on");
  fail(error);
  return (data ?? []) as FinancialTransaction[];
}

/* ===================== Admin: configurações ===================== */

export async function updateSettings(input: Partial<Omit<Settings, "id" | "updated_at">>): Promise<void> {
  const { error } = await supabase.from("settings").update(input).eq("id", 1);
  fail(error);
}

export async function upsertBusinessHours(hours: BusinessHour[]): Promise<void> {
  const { error } = await supabase
    .from("business_hours")
    .upsert(hours, { onConflict: "weekday" });
  fail(error);
}
