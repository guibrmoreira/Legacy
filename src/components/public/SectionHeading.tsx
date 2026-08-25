import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  dark?: boolean;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "mb-10 flex max-w-2xl flex-col gap-2 sm:mb-14",
        align === "center" ? "mx-auto items-center text-center" : "items-start text-left",
      )}
    >
      <span
        className={cn("font-script text-xl italic sm:text-2xl", dark ? "text-crimson-400" : "text-crimson-600")}
      >
        {eyebrow}
      </span>
      <h2
        className={cn(
          "font-display text-3xl font-semibold uppercase tracking-wide sm:text-4xl",
          dark ? "text-white" : "text-navy-950",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-1 text-sm sm:text-base", dark ? "text-cream-100/60" : "text-navy-400")}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
