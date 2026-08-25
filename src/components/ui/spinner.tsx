import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-navy-400", className)} />;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950">
      <div className="flex flex-col items-center gap-4">
        <div className="size-14 animate-pulse-soft rounded-full border-2 border-cream-100/30 border-t-crimson-500" />
        <Loader2 className="size-6 animate-spin text-cream-100/70" />
      </div>
    </div>
  );
}
