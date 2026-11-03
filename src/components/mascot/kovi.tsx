import type { MascotMood } from "@/features/mascot/store";
import { cn } from "@/lib/utils";

const MOUTH: Record<MascotMood, string> = {
  happy: "M48 66 Q60 77 72 66",
  worried: "M49 72 Q60 64 71 72",
  thinking: "M51 70 Q57 68 69 70",
};

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === "worried") {
    return (
      <>
        <rect className="kovi-eye" x="42" y="50" width="11" height="12" rx="5.5" />
        <rect className="kovi-eye" x="67" y="50" width="11" height="12" rx="5.5" />
        <path
          d="M40 47 L53 43 M80 47 L67 43"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }
  if (mood === "thinking") {
    return (
      <>
        <rect className="kovi-eye" x="45" y="45" width="10" height="14" rx="5" />
        <rect className="kovi-eye" x="69" y="45" width="10" height="14" rx="5" />
      </>
    );
  }
  return (
    <>
      <rect className="kovi-eye" x="42" y="46" width="11" height="16" rx="5.5" />
      <rect className="kovi-eye" x="67" y="46" width="11" height="16" rx="5.5" />
    </>
  );
}

/**
 * Kovi, la mascota de Kova: un robot con cabeza de monitor, antena con luz y
 * un ventilador en el pecho. Dibujado en SVG; el neón sale de --lime (lima en
 * la tienda, rosa en Arma tu PC). Las animaciones están en mascot.css.
 */
export function Kovi({ mood = "happy", className }: { mood?: MascotMood; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 150"
      data-mood={mood}
      aria-hidden
      className={cn("kovi overflow-visible", className)}
    >
      <line x1="60" y1="20" x2="60" y2="8" stroke="#2c3542" strokeWidth="3" />
      <circle cx="60" cy="7" r="9" className="kovi-halo" />
      <circle cx="60" cy="7" r="4.5" className="kovi-led" />
      <rect
        x="12"
        y="20"
        width="96"
        height="76"
        rx="20"
        fill="#1f262f"
        stroke="var(--lime)"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <rect x="22" y="30" width="76" height="56" rx="12" fill="#0b0e12" />
      <g className="kovi-eyes" fill="var(--lime)" color="var(--lime)">
        <Eyes mood={mood} />
      </g>
      <path
        className="kovi-mouth"
        d={MOUTH[mood]}
        stroke="var(--lime)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {mood === "happy" && (
        <>
          <circle cx="38" cy="67" r="4" fill="var(--tech)" opacity="0.35" />
          <circle cx="82" cy="67" r="4" fill="var(--tech)" opacity="0.35" />
        </>
      )}
      <rect x="52" y="96" width="16" height="8" fill="#1f262f" />
      <rect
        x="32"
        y="103"
        width="56"
        height="40"
        rx="12"
        fill="#1f262f"
        stroke="#2c3542"
        strokeWidth="2"
      />
      <g transform="translate(60 123)">
        <circle r="13" fill="#0b0e12" stroke="#2c3542" strokeWidth="2" />
        <g className="kovi-fan" fill="var(--lime)" opacity="0.85">
          {[0, 72, 144, 216, 288].map((angle) => (
            <path
              key={angle}
              d="M0 0 C 2.6 -6.5 9.75 -7.15 10.4 -1.95 Z"
              transform={`rotate(${angle})`}
            />
          ))}
        </g>
        <circle r="2.9" fill="#1f262f" />
      </g>
      <path
        d="M32 112 Q20 116 18 128"
        stroke="#1f262f"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <g className="kovi-wave">
        <path
          d="M88 112 Q100 104 102 92"
          stroke="#1f262f"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="102" cy="90" r="6" fill="var(--lime)" />
      </g>
    </svg>
  );
}
