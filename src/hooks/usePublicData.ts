import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveServices,
  fetchAvailableSlots,
  fetchBusinessHours,
  fetchSettings,
} from "@/lib/api";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: fetchSettings, staleTime: 60_000 });
}

export function useActiveServices() {
  return useQuery({ queryKey: ["services", "active"], queryFn: fetchActiveServices });
}

export function useBusinessHours() {
  return useQuery({ queryKey: ["business_hours"], queryFn: fetchBusinessHours, staleTime: 60_000 });
}

export function useAvailableSlots(date: string | null, serviceId: string | null) {
  return useQuery({
    queryKey: ["slots", date, serviceId],
    queryFn: () => fetchAvailableSlots(date!, serviceId!),
    enabled: Boolean(date && serviceId),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}
