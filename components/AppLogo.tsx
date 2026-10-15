import Link from "next/link"

/**
 * The logo and name, linking home. One copy for the public home page's header
 * (`AppHeader`) and the signed-in app's frame (`AppFrame`). `shrink-0` so a
 * crowded laptop header scrolls its links rather than squeezing the name.
 */
export function AppLogo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 font-bold text-xl text-foreground">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className="shrink-0">
        <circle cx="16" cy="16" r="11" fill="none" stroke="#ff6b35" strokeWidth="2"/>
        <circle cx="16" cy="16" r="2.5" fill="#ff6b35"/>
        <line x1="16" y1="1" x2="16" y2="7" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="25" x2="16" y2="31" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
        <line x1="1" y1="16" x2="7" y2="16" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
        <line x1="25" y1="16" x2="31" y2="16" stroke="#ff6b35" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span>DayGame Coach</span>
    </Link>
  )
}
