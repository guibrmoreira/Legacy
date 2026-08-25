export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentOrigin = "public" | "admin" | "fixed";

export interface Settings {
  id: number;
  shop_name: string;
  tagline: string;
  description: string;
  logo_url: string | null;
  whatsapp: string;
  instagram: string;
  address: string;
  slot_interval_minutes: number;
  booking_window_days: number;
  min_lead_minutes: number;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  image_url: string | null;
  icon: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  notes: string;
  created_at: string;
}

export interface BusinessHour {
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

export interface FixedSchedule {
  id: string;
  customer_id: string;
  service_id: string;
  weekday: number;
  start_time: string;
  active: boolean;
  notes: string;
  created_at: string;
  customer?: Customer;
  service?: Service;
}

export interface Appointment {
  id: string;
  customer_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price: number;
  notes: string;
  origin: AppointmentOrigin;
  fixed_schedule_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  service?: Service;
}

export interface BlockedTime {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  appointment_id: string | null;
  type: "income" | "expense";
  amount: number;
  description: string;
  occurred_on: string;
  created_at: string;
}

export interface BookingResult {
  id: string;
  customer_name: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  date: string;
  time: string;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

/** Status que ocupam horário na agenda (mesmo predicado da constraint no banco). */
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
];

export const WEEKDAY_LABEL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
