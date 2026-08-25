import {
  Baby,
  Brush,
  Crown,
  Eye,
  Scissors,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícone de bigode (não existe no lucide) no mesmo estilo de traço. */
export function MustacheIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={cn("size-4", className)}
      aria-hidden
    >
      <path d="M12 13.4 C 10.5 11.6, 7.9 10.8, 6 11.7 C 4.7 12.3, 3.2 12, 2.4 10.9 C 2.7 13.5, 4.9 15.2, 7.4 14.7 C 9.3 14.4, 11 13.8, 12 15 C 13 13.8, 14.7 14.4, 16.6 14.7 C 19.1 15.2, 21.3 13.5, 21.6 10.9 C 20.8 12, 19.3 12.3, 18 11.7 C 16.1 10.8, 13.5 11.6, 12 13.4 Z" />
    </svg>
  );
}

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  crown: Crown,
  baby: Baby,
  zap: Zap,
  eye: Eye,
  sparkles: Sparkles,
  star: Star,
  brush: Brush,
};

/** Opções disponíveis no painel ao cadastrar serviços. */
export const SERVICE_ICON_OPTIONS = [
  { value: "scissors", label: "Tesoura" },
  { value: "mustache", label: "Bigode" },
  { value: "crown", label: "Coroa" },
  { value: "baby", label: "Infantil" },
  { value: "zap", label: "Rápido" },
  { value: "eye", label: "Olhar" },
  { value: "sparkles", label: "Brilho" },
  { value: "star", label: "Estrela" },
  { value: "brush", label: "Pincel" },
];

export function ServiceIcon({ icon, className }: { icon: string; className?: string }) {
  if (icon === "mustache") return <MustacheIcon className={className} />;
  const Icon = LUCIDE_ICONS[icon] ?? Scissors;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
