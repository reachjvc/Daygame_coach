"use client"

import { Check } from "lucide-react"

export interface BottomBarProps {
  currentStep: number
  steps: string[]
  statusText: string
  ctaLabel: string
  ctaDisabled: boolean
  onCta: () => void
  onStepClick: (index: number) => void
}

export function BottomBar({
  currentStep,
  steps,
  statusText,
  ctaLabel,
  ctaDisabled,
  onCta,
  onStepClick,
}: BottomBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(5, 8, 16, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {/* Aurora gradient accent line on top */}
      <div
        className="h-px w-full"
        style={{
          background: "linear-gradient(90deg, rgba(0,255,127,0.4), rgba(124,77,255,0.5), rgba(255,64,129,0.4), rgba(0,255,127,0.3))",
          backgroundSize: "200% 100%",
          animation: "v9c-shimmer 4s linear infinite",
        }}
      />

      <div className="mx-auto max-w-3xl flex items-center justify-between px-6 pt-3 pb-2">
        <span className="text-xs text-emerald-300/50">{statusText}</span>
        <button
          onClick={onCta}
          disabled={ctaDisabled}
          className="px-5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{
            background: ctaDisabled
              ? "rgba(20, 30, 40, 0.5)"
              : "linear-gradient(135deg, #00E676, #7C4DFF)",
            color: ctaDisabled ? "rgba(0,255,127,0.3)" : "white",
            boxShadow: ctaDisabled ? "none" : "0 0 16px rgba(0,230,118,0.3), 0 0 32px rgba(124,77,255,0.15)",
          }}
        >
          {ctaLabel}
        </button>
      </div>
      <div className="mx-auto max-w-3xl flex items-center justify-center px-6 pb-3 gap-1">
        {steps.map((label, i) => {
          const isActive = i === currentStep
          const isDone = i < currentStep
          const isClickable = isDone
          return (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div className="relative w-6 sm:w-10 h-px">
                  <div
                    className="absolute inset-0"
                    style={{ background: isDone ? "rgba(0,230,118,0.5)" : "rgba(0,255,127,0.08)" }}
                  />
                  {isDone && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(0,230,118,0.8), transparent)",
                        animation: "v9c-lineShimmer 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
              )}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => isClickable && onStepClick(i)}
                  disabled={!isClickable}
                  className="flex items-center justify-center rounded-full text-xs font-bold transition-all"
                  style={{
                    width: isActive ? 30 : 24,
                    height: isActive ? 30 : 24,
                    background: isDone
                      ? "linear-gradient(135deg, #00E676, #7C4DFF)"
                      : isActive
                        ? "rgba(0,230,118,0.2)"
                        : "rgba(20, 30, 40, 0.5)",
                    color: isDone || isActive ? "white" : "rgba(0,255,127,0.3)",
                    border: isActive
                      ? "2px solid rgba(0,230,118,0.5)"
                      : isDone
                        ? "none"
                        : "1px solid rgba(0,255,127,0.1)",
                    boxShadow: isActive
                      ? "0 0 16px rgba(0,230,118,0.3)"
                      : isDone
                        ? "0 0 8px rgba(0,230,118,0.15)"
                        : "none",
                    animation: isActive ? "v9c-stepPulse 2s ease-in-out infinite" : "none",
                    cursor: isClickable ? "pointer" : "default",
                  }}
                >
                  {isDone ? <Check className="size-3" /> : i + 1}
                </button>
                <span
                  className="text-[9px] hidden sm:block"
                  style={{ color: isActive ? "#00E676" : isDone ? "#7C4DFF" : "rgba(0,255,127,0.2)" }}
                >
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes v9c-stepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0,230,118,0.3); }
          50% { box-shadow: 0 0 24px rgba(0,230,118,0.5), 0 0 40px rgba(124,77,255,0.15); }
        }
        @keyframes v9c-lineShimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes v9c-shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  )
}
