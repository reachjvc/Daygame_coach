import { initialsOf } from "../format"

/**
 * THE ONE PLACE A ROLE MODEL'S PICTURE WILL LIVE.
 *
 * The look of every role model (portraits, movement, effects) is one later
 * decision for all of them at once, so they look alike (Plans/role-models.md,
 * D6, the owner's second rule). Until then everyone gets the same plain
 * placeholder: initials, years, the category colour as a soft tinted background. No
 * image, no animation, no effect. The card, the profile and the Today card all
 * draw through this component, so the decision later changes this one file.
 */
export function RoleModelVisual({
  name,
  years,
  color,
  size = "card",
}: {
  name: string
  years: string
  color: string
  size?: "card" | "profile" | "small"
}) {
  const box =
    size === "profile"
      ? "h-40 w-40 text-5xl"
      : size === "small"
        ? "h-14 w-14 text-lg"
        : "h-24 w-24 text-3xl"
  return (
    <div
      className={`${box} flex shrink-0 flex-col items-center justify-center rounded-lg border`}
      style={{ background: `linear-gradient(135deg, ${color}40, ${color}14)`, borderColor: `${color}66`, color }}
      data-testid="role-model-visual"
      aria-hidden="true"
    >
      <span className="font-semibold leading-none">{initialsOf(name)}</span>
      {size !== "small" && <span className="mt-2 text-[11px] font-normal text-white/55">{years}</span>}
    </div>
  )
}
