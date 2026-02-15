"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface ActionToastProps {
  message: string
  variant: "error" | "success"
  onDismiss: () => void
  style?: React.CSSProperties
}

export function ActionToast({ message, variant, onDismiss, style }: ActionToastProps) {
  useEffect(() => {
    const timeout = variant === "error" ? 6000 : 4000
    const timer = setTimeout(onDismiss, timeout)
    return () => clearTimeout(timer)
  }, [onDismiss, variant])

  const bg = variant === "error"
    ? "bg-red-600/90 border-red-500/50"
    : "bg-green-600/90 border-green-500/50"

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-lg border text-white text-sm shadow-lg transition-all ${bg}`}
      style={style}
    >
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-1 hover:opacity-70 transition-opacity" aria-label="Dismiss">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
