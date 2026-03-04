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
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Date input that only accepts future dates (tomorrow or later).
 *
 * Approach: let the user type freely, show a persistent warning when
 * the value is in the past. The invalid value stays visible so the user
 * knows what they entered. Past dates are excluded at submission time.
 */
export function FutureDateInput({ value, onChange, className, onKeyDown }: FutureDateInputProps) {
  const tomorrow = getTomorrow()
  const isPast = !!value && value < tomorrow

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div>
      <input
        type="date"
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        min={tomorrow}
        className={`${className ?? ""}${isPast ? " ring-1 ring-red-400/60" : ""}`}
      />
      {isPast && (
        <p className="mt-1.5 text-xs text-red-400">
          This date is in the past — please pick a future date
        </p>
      )}
    </div>
  )
}
