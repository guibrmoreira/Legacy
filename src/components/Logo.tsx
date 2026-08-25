import { cn } from "@/lib/utils";

/**
 * Recriação vetorial da logo da Barbearia Fagundes:
 * selo circular com borda ondulada azul, anel vermelho, poste de barbeiro,
 * arco "BARBEARIA", script "Fagundes" e bigode.
 */
export function LogoBadge({ className, name = "Fagundes" }: { className?: string; name?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("select-none", className)} aria-label={`Barbearia ${name}`}>
      {/* Borda ondulada (pontos ao redor) + discos */}
      <circle
        cx="100"
        cy="100"
        r="94"
        fill="none"
        stroke="#22406c"
        strokeWidth="7"
        strokeDasharray="0.6 12.68"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="91" fill="#22406c" />
      <circle cx="100" cy="100" r="85" fill="#fdfbf5" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#b7202f" strokeWidth="2.4" />

      {/* BARBEARIA em arco */}
      <defs>
        <path id="bf-arc" d="M 34 106 A 66 66 0 0 1 166 106" fill="none" />
        <clipPath id="bf-pole">
          <rect x="-6" y="-9" width="12" height="30" rx="3.5" />
        </clipPath>
      </defs>
      <text
        fontFamily="Oswald, 'Arial Narrow', sans-serif"
        fontWeight="700"
        fontSize="21.5"
        fill="#22406c"
        letterSpacing="3.4"
      >
        <textPath href="#bf-arc" startOffset="50%" textAnchor="middle">
          BARBEARIA
        </textPath>
      </text>

      {/* Poste de barbeiro */}
      <g transform="translate(100 71)">
        <circle cx="0" cy="-17.5" r="5.6" fill="#98a1ac" />
        <rect x="-7.5" y="-13.5" width="15" height="4.5" rx="2" fill="#98a1ac" />
        <rect x="-6" y="-9" width="12" height="30" rx="3.5" fill="#ffffff" stroke="#98a1ac" strokeWidth="1.1" />
        <g clipPath="url(#bf-pole)">
          <rect x="-16" y="-12" width="32" height="5" fill="#b7202f" transform="rotate(-32)" />
          <rect x="-16" y="-4" width="32" height="5" fill="#22406c" transform="rotate(-32)" />
          <rect x="-16" y="4" width="32" height="5" fill="#b7202f" transform="rotate(-32)" />
          <rect x="-16" y="12" width="32" height="5" fill="#22406c" transform="rotate(-32)" />
          <rect x="-16" y="20" width="32" height="5" fill="#b7202f" transform="rotate(-32)" />
        </g>
        <rect x="-7.5" y="20.5" width="15" height="4.5" rx="2" fill="#98a1ac" />
      </g>

      {/* Nome em script */}
      <text
        x="100"
        y="134"
        textAnchor="middle"
        fontFamily="'Lobster Two', 'Segoe Script', cursive"
        fontStyle="italic"
        fontWeight="700"
        fontSize="35"
        fill="#b7202f"
      >
        {name}
      </text>
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fontFamily="Oswald, 'Arial Narrow', sans-serif"
        fontWeight="600"
        fontSize="10.5"
        letterSpacing="4.6"
        fill="#22406c"
      >
        BARBER SHOP
      </text>

      {/* Bigode */}
      <path
        d="M100 163 C 95 157, 86 154.5, 79.5 157.3 C 75 159.2, 70 158.2, 67.3 154.5 C 68.5 162.5, 75.5 167.3, 83.5 166 C 89.9 165, 96 163.2, 100 167.2 C 104 163.2, 110.1 165, 116.5 166 C 124.5 167.3, 131.5 162.5, 132.7 154.5 C 130 158.2, 125 159.2, 120.5 157.3 C 114 154.5, 105 157, 100 163 Z"
        fill="#22406c"
      />
    </svg>
  );
}

/** Marca horizontal para cabeçalhos: "BARBEARIA" + nome em script. */
export function LogoWordmark({
  name = "Fagundes",
  light = false,
  className,
}: {
  name?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-display text-[0.58rem] font-semibold tracking-[0.42em]",
          light ? "text-cream-100/70" : "text-navy-500",
        )}
      >
        BARBEARIA
      </span>
      <span
        className={cn(
          "-mt-0.5 font-script text-[1.55rem] italic",
          light ? "text-white" : "text-navy-900",
        )}
      >
        {name}
      </span>
    </span>
  );
}
