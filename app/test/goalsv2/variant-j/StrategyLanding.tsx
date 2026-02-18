"use client"

import { Heart, Flame, ChevronRight, Shield } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"
import { useWarRoomTheme, ThemedCard } from "./WarRoomTheme"

interface StrategyLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
  onSelectLifeArea: (areaId: string) => void
}

export function StrategyLanding({ onSelectPath, onSelectLifeArea }: StrategyLandingProps) {
  const { theme, themeId } = useWarRoomTheme()
  const isZen = themeId === "zen"
  const { onePerson, abundance } = getCatalogGroups()
  const visibleAreas = LIFE_AREAS.filter((a) => a.id !== "custom" && a.id !== "daygame")

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "24px 0 32px" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: isZen ? 20 : theme.borderRadius,
            background: theme.accentFaded,
            border: `1px solid ${isZen ? theme.accentSecondary + "30" : theme.accent + "30"}`,
            marginBottom: 16,
          }}
        >
          <Shield size={14} style={{ color: isZen ? theme.accentSecondary : theme.accent }} />
          <span
            style={{
              fontSize: isZen ? 12 : 10,
              fontWeight: 700,
              fontFamily: theme.fontFamily,
              textTransform: theme.textTransform,
              letterSpacing: theme.letterSpacing,
              color: isZen ? theme.accentSecondary : theme.accent,
            }}
          >
            {isZen ? "Begin Your Campaign" : "CAMPAIGN_INIT"}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: isZen ? 28 : 22,
            fontWeight: theme.headingWeight,
            fontFamily: theme.fontFamily,
            textTransform: theme.textTransform,
            letterSpacing: isZen ? "0.01em" : "0.1em",
            lineHeight: 1.2,
            marginBottom: 8,
            color: theme.text,
          }}
        >
          {isZen
            ? "What territory shall you claim?"
            : "SELECT_PRIMARY_OBJECTIVE"}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: isZen ? 14 : 11,
            color: theme.textMuted,
            maxWidth: 500,
            margin: "0 auto",
            fontFamily: theme.fontFamily,
            textTransform: isZen ? "none" : "uppercase",
            letterSpacing: isZen ? "0.01em" : "0.06em",
            lineHeight: 1.5,
          }}
        >
          {isZen
            ? "Every great strategist begins with a clear vision. Choose your campaign and we shall chart the course to victory."
            : "INITIALIZING TACTICAL CAMPAIGN PLANNER // SELECT PRIMARY VECTOR FOR OPERATION DEPLOYMENT"}
        </p>
      </div>

      {/* Two Main Paths */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
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
            e.currentTarget.style.borderColor = isZen ? "#ec489960" : "#ff003360"
            e.currentTarget.style.boxShadow = isZen
              ? "0 4px 30px rgba(236,72,153,0.08)"
              : "0 0 30px rgba(255,0,51,0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {theme.cornerBrackets && (
            <>
              <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid #ff0033`, borderLeft: `2px solid #ff0033` }} />
              <div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTop: `2px solid #ff0033`, borderRight: `2px solid #ff0033` }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottom: `2px solid #ff0033`, borderLeft: `2px solid #ff0033` }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: `2px solid #ff0033`, borderRight: `2px solid #ff0033` }} />
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                padding: 10,
                borderRadius: isZen ? 10 : 2,
                background: "rgba(236,72,153,0.1)",
              }}
            >
              <Heart size={20} style={{ color: "#ec4899" }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: isZen ? 16 : 13,
                  fontWeight: theme.headingWeight,
                  fontFamily: theme.fontFamily,
                  textTransform: theme.textTransform,
                  letterSpacing: theme.letterSpacing,
                  color: theme.text,
                }}
              >
                {isZen ? "Find the One" : "OPERATION: ONE_TARGET"}
              </h2>
              <span
                style={{
                  fontSize: isZen ? 11 : 9,
                  color: theme.textMuted,
                  fontFamily: theme.fontFamily,
                  textTransform: theme.textTransform,
                }}
              >
                {isZen ? "Connection & Commitment" : "SINGLE_VECTOR // COMMITMENT"}
              </span>
            </div>
          </div>

          <p
            style={{
              fontSize: isZen ? 13 : 10,
              color: theme.textMuted,
              lineHeight: 1.5,
              marginBottom: 12,
              fontFamily: theme.fontFamily,
              textTransform: isZen ? "none" : "uppercase",
            }}
          >
            {isZen
              ? "A campaign to find and build something real with one special person."
              : "DEPLOY RESOURCES TOWARD SINGLE HIGH-VALUE TARGET ACQUISITION"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {onePerson.slice(0, 3).map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: isZen ? 12 : 9 }}>
                <ChevronRight size={10} style={{ color: "#ec4899", opacity: 0.6 }} />
                <span style={{ color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
                  {g.title}
                </span>
              </div>
            ))}
            {onePerson.length > 3 && (
              <span style={{ fontSize: isZen ? 11 : 8, color: "#ec489960", paddingLeft: 16, fontFamily: theme.fontFamily }}>
                +{onePerson.length - 3} more {isZen ? "paths" : "vectors"}
              </span>
            )}
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
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
            e.currentTarget.style.borderColor = isZen ? "#f9731660" : "#00ff4160"
            e.currentTarget.style.boxShadow = isZen
              ? "0 4px 30px rgba(249,115,22,0.08)"
              : "0 0 30px rgba(0,255,65,0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.border
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {theme.cornerBrackets && (
            <>
              <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}` }} />
              <div style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderTop: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}` }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, width: 10, height: 10, borderBottom: `2px solid ${theme.accent}`, borderLeft: `2px solid ${theme.accent}` }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: `2px solid ${theme.accent}`, borderRight: `2px solid ${theme.accent}` }} />
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                padding: 10,
                borderRadius: isZen ? 10 : 2,
                background: isZen ? "rgba(249,115,22,0.1)" : "rgba(0,255,65,0.06)",
              }}
            >
              <Flame size={20} style={{ color: isZen ? "#f97316" : "#00ff41" }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: isZen ? 16 : 13,
                  fontWeight: theme.headingWeight,
                  fontFamily: theme.fontFamily,
                  textTransform: theme.textTransform,
                  letterSpacing: theme.letterSpacing,
                  color: theme.text,
                }}
              >
                {isZen ? "Abundance" : "OPERATION: ABUNDANCE"}
              </h2>
              <span
                style={{
                  fontSize: isZen ? 11 : 9,
                  color: theme.textMuted,
                  fontFamily: theme.fontFamily,
                  textTransform: theme.textTransform,
                }}
              >
                {isZen ? "Freedom & Experience" : "MULTI_VECTOR // FREEDOM"}
              </span>
            </div>
          </div>

          <p
            style={{
              fontSize: isZen ? 13 : 10,
              color: theme.textMuted,
              lineHeight: 1.5,
              marginBottom: 12,
              fontFamily: theme.fontFamily,
              textTransform: isZen ? "none" : "uppercase",
            }}
          >
            {isZen
              ? "A campaign to experience abundance, variety, and total dating freedom."
              : "MULTI-TARGET DEPLOYMENT // MAXIMIZE SOCIAL VECTOR THROUGHPUT"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {abundance.slice(0, 3).map((g) => (
              <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: isZen ? 12 : 9 }}>
                <ChevronRight size={10} style={{ color: isZen ? "#f97316" : "#00ff41", opacity: 0.6 }} />
                <span style={{ color: theme.textMuted, fontFamily: theme.fontFamily, textTransform: theme.textTransform }}>
                  {g.title}
                </span>
              </div>
            ))}
            {abundance.length > 3 && (
              <span style={{ fontSize: isZen ? 11 : 8, color: isZen ? "#f9731660" : "#00ff4160", paddingLeft: 16, fontFamily: theme.fontFamily }}>
                +{abundance.length - 3} more {isZen ? "paths" : "vectors"}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: theme.border, opacity: 0.5 }} />
        <span
          style={{
            fontSize: isZen ? 11 : 9,
            color: theme.textFaint,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            fontFamily: theme.fontFamily,
            fontWeight: 600,
          }}
        >
          {isZen ? "Other Realms" : "OTHER_SECTORS"}
        </span>
        <div style={{ flex: 1, height: 1, background: theme.border, opacity: 0.5 }} />
      </div>

      {/* Other Life Areas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        {visibleAreas.map((area) => {
          const Icon = area.icon
          return (
            <button
              key={area.id}
              onClick={() => onSelectLifeArea(area.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: 16,
                borderRadius: theme.borderRadius,
                border: `1px solid ${theme.border}50`,
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = theme.border
                e.currentTarget.style.background = theme.bgSecondary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.border + "50"
                e.currentTarget.style.background = "transparent"
              }}
            >
              <div
                style={{
                  padding: 8,
                  borderRadius: isZen ? 8 : 2,
                  background: `${area.hex}12`,
                }}
              >
                <Icon size={18} style={{ color: area.hex }} />
              </div>
              <span
                style={{
                  fontSize: isZen ? 11 : 9,
                  fontWeight: 600,
                  fontFamily: theme.fontFamily,
                  textTransform: theme.textTransform,
                  letterSpacing: theme.letterSpacing,
                  color: theme.textMuted,
                  textAlign: "center",
                }}
              >
                {area.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
