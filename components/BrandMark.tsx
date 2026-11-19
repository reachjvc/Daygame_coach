/**
 * The brand mark, drawn in one place (Plans/rebrand-10kdaysclub.md, Phase 4b).
 * The header (`AppLogo`), the five sign-in pages and the share images all render
 * this, so the logo is swapped in this one file. "10K plate" (mark 2 on the
 * brand board): an orange plate with 10K in dark ink, slanted a little. The
 * owner picked it and said the mark always wears the umbrella colour, in every
 * part, so there is no colour switch.
 */
export const MARK_COLOUR = "#ff6b35"
const INK = "#121212"

export function BrandMark({ size = 24, className = "shrink-0" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7.5" fill={MARK_COLOUR} />
      <g
        transform="translate(16 16) skewX(-9) translate(-16 -16)"
        fill="none"
        stroke={INK}
        strokeWidth="3.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M5.2 12.6 L8.2 9.8 V22.4" />
        <rect x="11.6" y="11.4" width="5.4" height="9.4" rx="2.7" />
        <path d="M21.4 9.8 V22.4 M27.2 9.8 L22.6 16.1 L27.2 22.4" />
      </g>
    </svg>
  )
}

/** The part's badge: a plate in the part's colour with its letter (L, Q or D). */
export function PartBadge({ part, size = 18, className = "shrink-0" }: { part: "life" | "quit" | "dating"; size?: number; className?: string }) {
  const letter = { life: "L", quit: "Q", dating: "D" }[part]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect x="0" y="0" width="20" height="20" rx="5" style={{ fill: `var(--facet-${part})` }} />
      <text
        x="10"
        y="14.6"
        textAnchor="middle"
        fontWeight="900"
        fontSize="11"
        fill={INK}
        transform="translate(10 10) skewX(-9) translate(-10 -10)"
      >
        {letter}
      </text>
    </svg>
  )
}
