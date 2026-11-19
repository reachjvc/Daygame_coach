/**
 * The brand mark, drawn in one place (Plans/rebrand-10kdaysclub.md, Phase 1).
 * The header (`AppLogo`) and the five sign-in pages all render this, so the
 * logo is swapped in this one file. Still the old crosshair until the owner
 * picks the new mark (Phase 4).
 */
export function BrandMark({ size = 24, className = "shrink-0" }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="none" stroke="#ff6b35" strokeWidth="2"/>
      <circle cx="16" cy="16" r="2.5" fill="#ff6b35"/>
      <line x1="16" y1="1" x2="16" y2="7" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="25" x2="16" y2="31" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
      <line x1="1" y1="16" x2="7" y2="16" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
      <line x1="25" y1="16" x2="31" y2="16" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
