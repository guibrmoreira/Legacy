import { createClient } from "@supabase/supabase-js";

// A anon key é pública por design — a segurança dos dados é garantida
// pelas políticas de RLS no banco (ver supabase/setup.sql).
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://nrckscuogbperulzwbbl.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yY2tzY3VvZ2JwZXJ1bHp3YmJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODc1ODIsImV4cCI6MjEwMzE2MzU4Mn0.6qRDJZ_ZSaIfzSOPjk7etvTBuuh9JlIL7vhQ5UcBO_g";

export const supabase = createClient(supabaseUrl, supabaseKey);
