"use client"

interface FutureDateInputProps {
  value: string
  onChange: (date: string) => void
  className?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

/**
 * Date input that only accepts future dates (tomorrow or later).
 *
 * Approach: let the user type freely, show a persistent warning when
 * the value is in the past, and clear it on blur. No blocking mid-typing.
 */
export function FutureDateInput({ value, onChange, className, onKeyDown }: FutureDateInputProps) {
  const tomorrow = getTomorrow()
  const isPast = !!value && value < tomorrow

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleBlur = () => {
    if (isPast) {
      onChange("")
    }
  }

  return (
    <div>
      <input
        type="date"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        min={tomorrow}
        className={className}
      />
      {isPast && (
        <p className="mt-1.5 text-xs text-amber-400/80">
          That date is in the past — pick a future date
        </p>
      )}
    </div>
  )
}
