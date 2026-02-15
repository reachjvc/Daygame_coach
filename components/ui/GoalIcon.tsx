import type { SVGProps } from "react"

/**
 * Custom "flowing flag" icon for the Goals feature.
 * Matches the lucide-react icon API (className, size via Tailwind classes).
 * Designed to pair with the Crosshair brand mark style.
 */
export function GoalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Pole */}
      <line x1="8" y1="4" x2="8" y2="28" />
      {/* Flag body - soft wave shape */}
      <path
        d="M8 5 Q14 3, 20 7 Q26 11, 24 15 Q18 13, 12 16 Q8 18, 8 14"
        fill="currentColor"
        fillOpacity={0.15}
      />
      {/* Ground dot */}
      <circle cx="8" cy="28" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}
