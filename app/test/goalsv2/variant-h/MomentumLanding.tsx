"use client"

import { Heart, Flame, ChevronRight } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { useMomentumTheme, CornerBrackets } from "./MomentumThemeProvider"

interface MomentumLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

export function MomentumLanding({ onSelectPath }: MomentumLandingProps) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"
  const { onePerson, abundance } = getCatalogGroups()

  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom" && a.id !== "daygame")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", paddingTop: 16 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: isCyber ? 2 : 999,
            background: theme.accentFaded,
            color: theme.accent,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
            border: isCyber ? `1px solid ${theme.accent}30` : "none",
          }}
        >
          {isCyber ? "> " : ""}{theme.vocab.momentum}{isCyber ? " v2.0" : " Builder"}
        </div>
        <h1
          style={{
            fontSize: isCyber ? 24 : 28,
            fontWeight: theme.headingWeight,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: isCyber ? "0.08em" : "-0.02em",
            marginTop: 12,
            color: theme.text,
          }}
        >
          {isCyber ? "INITIALIZE_VECTOR" : "Build Your Momentum"}
        </h1>
        <p
          style={{
            color: theme.textMuted,
            fontSize: 14,
            fontFamily: theme.fontFamily,
            maxWidth: 500,
            margin: "8px auto 0",
            textTransform: isCyber ? "uppercase" : "none",
            letterSpacing: isCyber ? "0.04em" : "normal",
          }}
        >
          {isCyber
            ? "Select primary trajectory. System will generate optimized goal vectors."
            : "Choose your direction. We'll build a growth curve with milestones that match your rhythm."
          }
        </p>
      </div>

      {/* Two Main Paths */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          maxWidth: 700,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Find The One */}
        <PathCard
          onClick={() => onSelectPath("one_person")}
          icon={<Heart style={{ width: 24, height: 24, color: "#ec4899" }} />}
          title={isCyber ? "FIND_ONE" : "Find the One"}
          subtitle={isCyber ? "CONNECTION_PROTOCOL" : "Connection & commitment"}
          description={isCyber
            ? "Optimize for deep pair-bonding. Single-target acquisition."
            : "I want to find one special person and build something real."
          }
          goals={onePerson}
          accentColor="#ec4899"
        />

        {/* Abundance */}
        <PathCard
          onClick={() => onSelectPath("abundance")}
          icon={<Flame style={{ width: 24, height: 24, color: "#f97316" }} />}
          title={isCyber ? "ABUNDANCE" : "Abundance"}
          subtitle={isCyber ? "MULTI_VECTOR" : "Freedom & experience"}
          description={isCyber
            ? "Maximize throughput. Parallel target engagement."
            : "I want to experience abundance and freedom in dating."
          }
          goals={abundance}
          accentColor="#f97316"
        />
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <div style={{ flex: 1, borderTop: `1px solid ${theme.border}` }} />
        <span
          style={{
            fontSize: 10,
            color: theme.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: theme.fontFamily,
            opacity: 0.6,
          }}
        >
          {isCyber ? "ALT_SECTORS" : "Other life areas"}
        </span>
        <div style={{ flex: 1, borderTop: `1px solid ${theme.border}` }} />
      </div>

      {/* Other Life Areas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          maxWidth: 700,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {visibleAreas.map((area) => {
          const Icon = area.icon
          return (
            <div
              key={area.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: 16,
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.border}`,
                background: theme.cardBg,
                opacity: 0.5,
                cursor: "default",
              }}
            >
              <div
                style={{
                  padding: 8,
                  borderRadius: isCyber ? 2 : 8,
                  background: `${area.hex}12`,
                }}
              >
                <Icon style={{ width: 20, height: 20, color: area.hex }} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: theme.textMuted,
                  fontFamily: theme.fontFamily,
                  textAlign: "center",
                  textTransform: theme.textTransform,
                }}
              >
                {area.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Path Card Component
// ============================================================================

function PathCard({
  onClick,
  icon,
  title,
  subtitle,
  description,
  goals,
  accentColor,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  goals: { id: string; title: string }[]
  accentColor: string
}) {
  const { theme, themeId } = useMomentumTheme()
  const isCyber = themeId === "cyberpunk"

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: theme.borderRadiusLg,
        border: `2px solid ${theme.border}`,
        padding: 24,
        textAlign: "left",
        cursor: "pointer",
        background: theme.cardBg,
        transition: "all 0.3s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}60`
        e.currentTarget.style.boxShadow = isCyber
          ? `0 0 30px ${accentColor}20, inset 0 0 30px ${accentColor}05`
          : `0 4px 20px ${accentColor}15`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.border
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      {isCyber && <CornerBrackets color={accentColor} />}

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              borderRadius: isCyber ? 2 : 12,
              background: `${accentColor}15`,
              padding: 12,
            }}
          >
            {icon}
          </div>
          <div>
            <h2
              style={{
                fontSize: isCyber ? 14 : 18,
                fontWeight: theme.headingWeight,
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: theme.letterSpacing,
                color: theme.text,
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontSize: isCyber ? 10 : 12,
                color: theme.textMuted,
                fontFamily: theme.fontFamily,
                textTransform: theme.textTransform,
                letterSpacing: isCyber ? "0.04em" : "normal",
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: isCyber ? 11 : 13,
            color: theme.textMuted,
            lineHeight: 1.6,
            fontFamily: theme.fontFamily,
            textTransform: isCyber ? "uppercase" : "none",
            letterSpacing: isCyber ? "0.03em" : "normal",
          }}
        >
          {description}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {goals.slice(0, 3).map((g) => (
            <div
              key={g.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: `${theme.textMuted}cc`,
                fontFamily: theme.fontFamily,
                textTransform: isCyber ? "uppercase" : "none",
              }}
            >
              <ChevronRight style={{ width: 12, height: 12, color: `${accentColor}80` }} />
              <span>{g.title}</span>
            </div>
          ))}
          {goals.length > 3 && (
            <span style={{ fontSize: 11, color: `${accentColor}80`, paddingLeft: 20, fontFamily: theme.fontFamily }}>
              +{goals.length - 3} {isCyber ? "VECTORS" : "more paths"}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: accentColor,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: theme.letterSpacing,
          }}
        >
          {isCyber ? "> ENGAGE" : "Explore this path"}
          <ChevronRight style={{ width: 16, height: 16 }} />
        </div>
      </div>
    </button>
  )
}
