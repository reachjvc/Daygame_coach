"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  ROLE_MODELS,
  ROLE_MODEL_CATEGORIES,
  type RoleModel,
  type RoleModelCategory,
} from "@/src/inner-game/data/roleModels"
import { CATEGORIES } from "@/src/inner-game/config"
import { AmbientEffects, useIsVisible } from "@/src/inner-game/components/AmbientEffects"

const MARCUS_STILL = "/marcus-test/marcus_alive4_01.png"
const MARCUS_VIDEO = "/Marcus/liveportrait_output/marcus_loop_01--test7.mp4"

// ============================================================================
// Value Color Lookup
// ============================================================================

const VALUE_COLOR_MAP: Record<string, string> = {}
CATEGORIES.forEach((category) => {
  category.values.forEach((valueName) => {
    const valueId = valueName.toLowerCase().replace(/\s+/g, "-")
    VALUE_COLOR_MAP[valueId] = category.color
  })
})

function getValueColor(valueId: string): string {
  return VALUE_COLOR_MAP[valueId] || "#78909C"
}

// ============================================================================
// Value Tag Component
// ============================================================================

function ValueTag({ valueId }: { valueId: string }) {
  const color = getValueColor(valueId)
  const displayName = valueId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

  return (
    <span
      className="px-2 py-0.5 rounded text-xs border"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        color: color,
      }}
    >
      {displayName}
    </span>
  )
}

// ============================================================================
// Role Model Card Component
// ============================================================================

function RoleModelCard({
  roleModel,
  categoryColor,
}: {
  roleModel: RoleModel
  categoryColor: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { ref, isVisible } = useIsVisible()

  const isMarcus = roleModel.id === "marcus-aurelius"
  const placeholderBg = `${categoryColor}20`
  const placeholderBorder = `${categoryColor}40`

  return (
    <>
      <div
        ref={ref}
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          bg-gradient-to-b from-zinc-800/50 to-zinc-900 rounded-xl overflow-hidden
          border transition-all duration-300 cursor-pointer flex-shrink-0 flex flex-col
          ${isHovered
            ? "w-[300px] border-white/30 shadow-lg scale-[1.02] z-10"
            : "w-[220px] border-white/10 hover:border-white/20"
          }
        `}
        style={{
          boxShadow: isHovered ? `0 8px 32px ${categoryColor}20` : undefined,
        }}
      >
        {/* Image / Placeholder */}
        <div
          className={`relative w-full transition-all duration-300 flex-shrink-0 ${isHovered ? "h-[240px]" : "h-[200px]"}`}
          style={{
            backgroundColor: isMarcus ? undefined : placeholderBg,
            borderBottom: `1px solid ${placeholderBorder}`,
          }}
        >
          {isMarcus ? (
            <Image
              src={MARCUS_STILL}
              alt={roleModel.name}
              fill
              className="object-cover"
              style={{ transform: "scale(1.03)" }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-5xl font-bold opacity-30"
                style={{ color: categoryColor }}
              >
                {roleModel.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-900" />

          {/* Ambient effects — only render when card is visible */}
          {isVisible && <AmbientEffects />}

          {/* Hover glow */}
          <div
            className={`absolute inset-0 bg-gradient-to-t transition-all duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background: `linear-gradient(to top, ${categoryColor}15, transparent)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-4 -mt-8 relative z-10 flex flex-col flex-1">
          <h2
            className={`font-bold transition-colors duration-300 ${
              isHovered ? "text-lg" : "text-base"
            }`}
            style={{ color: isHovered ? categoryColor : "white" }}
          >
            {roleModel.name}
          </h2>

          <p className="text-white/40 text-xs mt-0.5">
            {ROLE_MODEL_CATEGORIES.find((c) => c.id === roleModel.category)?.label}
          </p>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isHovered ? "max-h-16 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <p className="text-white/60 text-sm italic leading-snug line-clamp-2">
              {roleModel.tagline}
            </p>
          </div>

          <div className="h-[40px] mt-2 overflow-hidden">
            <p className="text-white/50 text-xs italic line-clamp-2">
              &ldquo;{roleModel.quote.slice(0, 80)}{roleModel.quote.length > 80 ? "..." : ""}&rdquo;
            </p>
          </div>

          <div className="flex gap-1.5 mt-2 flex-wrap">
            {roleModel.values.slice(0, 3).map((value) => (
              <ValueTag key={value} valueId={value} />
            ))}
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isHovered ? "max-h-20 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <p className="text-white/40 text-xs leading-relaxed line-clamp-3">
              {roleModel.whyThisPerson.slice(0, 150)}...
            </p>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isHovered ? "max-h-8 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <p
              className="text-center text-xs font-medium"
              style={{ color: categoryColor }}
            >
              Click to read full profile →
            </p>
          </div>
        </div>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with video (Marcus) or placeholder */}
            <div
              className="relative h-[500px] overflow-hidden"
              style={{ backgroundColor: isMarcus ? undefined : placeholderBg }}
            >
              {isMarcus ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  src={MARCUS_VIDEO}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scale(1.03)", objectPosition: "center 10%" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-8xl font-bold opacity-20"
                    style={{ color: categoryColor }}
                  >
                    {roleModel.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
              )}

              <AmbientEffects large />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-900" style={{ zIndex: 3 }} />

              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 flex items-center justify-center transition-all z-10"
              >
                ✕
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: categoryColor }}
                >
                  {ROLE_MODEL_CATEGORIES.find((c) => c.id === roleModel.category)?.label}
                </p>
                <h2 className="text-white text-3xl font-bold">{roleModel.name}</h2>
                <p className="text-white/60 mt-1">{roleModel.tagline}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                {roleModel.values.map((value) => {
                  const color = getValueColor(value)
                  return (
                    <span
                      key={value}
                      className="px-3 py-1.5 rounded-full text-sm border"
                      style={{
                        backgroundColor: `${color}15`,
                        borderColor: `${color}30`,
                        color: color,
                      }}
                    >
                      {value.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  )
                })}
              </div>

              <blockquote
                className="border-l-2 pl-4 py-2"
                style={{ borderColor: `${categoryColor}50` }}
              >
                <p className="text-white/90 text-lg italic">&ldquo;{roleModel.quote}&rdquo;</p>
                {roleModel.quoteSource && (
                  <cite className="text-white/50 text-sm mt-1 block">— {roleModel.quoteSource}</cite>
                )}
              </blockquote>

              <div>
                <h3 className="font-semibold mb-2" style={{ color: categoryColor }}>
                  Why {roleModel.name}?
                </h3>
                <p className="text-white/70 leading-relaxed">{roleModel.whyThisPerson}</p>
              </div>

              {roleModel.corePhilosophy && roleModel.corePhilosophy.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: categoryColor }}>
                    Core Philosophy
                  </h3>
                  <ul className="space-y-2">
                    {roleModel.corePhilosophy.map((principle, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/70">
                        <span style={{ color: categoryColor }} className="mt-1">•</span>
                        <span>{principle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {roleModel.definingMoment && (
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: categoryColor }}>
                    Defining Moment
                  </h3>
                  <p className="text-white/70 leading-relaxed">{roleModel.definingMoment}</p>
                </div>
              )}

              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: `${categoryColor}08`,
                  borderColor: `${categoryColor}20`,
                  borderWidth: "1px",
                }}
              >
                <h3 className="font-semibold mb-2" style={{ color: categoryColor }}>
                  How This Helps You
                </h3>
                <p className="text-white/80 leading-relaxed">{roleModel.howThisHelpsYou}</p>
              </div>

              {roleModel.additionalQuotes && roleModel.additionalQuotes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: categoryColor }}>
                    More Wisdom
                  </h3>
                  <div className="space-y-3">
                    {roleModel.additionalQuotes.map((q, i) => (
                      <blockquote key={i} className="border-l border-white/20 pl-3 py-1">
                        <p className="text-white/60 italic">&ldquo;{q.text}&rdquo;</p>
                        {q.source && (
                          <cite className="text-white/40 text-sm">— {q.source}</cite>
                        )}
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="w-full py-4 text-white font-semibold rounded-xl transition-all hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${categoryColor}, ${categoryColor}cc)`,
                }}
              >
                Select {roleModel.name} as Role Model
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// Category Section Component
// ============================================================================

function CategorySection({
  categoryId,
  roleModels,
}: {
  categoryId: RoleModelCategory
  roleModels: RoleModel[]
}) {
  const category = ROLE_MODEL_CATEGORIES.find((c) => c.id === categoryId)
  if (!category) return null

  return (
    <section className="mb-12">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-1 h-8 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <h2 className="text-2xl font-bold text-white">{category.label}</h2>
          <span className="text-white/30 text-sm">({roleModels.length})</span>
        </div>
        <p className="text-white/50 ml-4 pl-3">{category.description}</p>
      </div>

      <div className="flex flex-wrap gap-4 ml-4 items-start">
        {roleModels.map((roleModel) => (
          <RoleModelCard
            key={roleModel.id}
            roleModel={roleModel}
            categoryColor={category.color}
          />
        ))}
      </div>
    </section>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RoleModelsGalleryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<RoleModelCategory | "all">("all")

  const roleModelsByCategory = useMemo(() => {
    const grouped: Record<RoleModelCategory, RoleModel[]> = {
      charisma: [],
      warriors: [],
      philosophers: [],
      icons: [],
      titans: [],
      mindset: [],
    }

    ROLE_MODELS.forEach((rm) => {
      grouped[rm.category].push(rm)
    })

    return grouped
  }, [])

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase()

    return ROLE_MODEL_CATEGORIES.filter((category) => {
      if (selectedCategory !== "all" && category.id !== selectedCategory) {
        return false
      }
      return true
    }).map((category) => ({
      category,
      roleModels: roleModelsByCategory[category.id].filter((rm) => {
        if (!query) return true
        return (
          rm.name.toLowerCase().includes(query) ||
          rm.tagline.toLowerCase().includes(query) ||
          rm.values.some((v) => v.toLowerCase().includes(query))
        )
      }),
    })).filter(({ roleModels }) => roleModels.length > 0)
  }, [roleModelsByCategory, searchQuery, selectedCategory])

  const totalFiltered = filteredCategories.reduce((sum, { roleModels }) => sum + roleModels.length, 0)

  return (
    <div className="min-h-screen bg-zinc-950 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Role Models Gallery</h1>
        <p className="text-white/50">
          Browse 30 iconic figures across 6 categories. Click any card for full profile.
        </p>
      </div>

      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, tagline, or value..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === "all"
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-white/60 hover:text-white hover:bg-zinc-700"
            }`}
          >
            All ({ROLE_MODELS.length})
          </button>
          {ROLE_MODEL_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? "text-white"
                  : "bg-zinc-800 text-white/60 hover:text-white hover:bg-zinc-700"
              }`}
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : undefined,
              }}
            >
              {category.label.split(" ")[0]} ({roleModelsByCategory[category.id].length})
            </button>
          ))}
        </div>
      </div>

      {searchQuery && (
        <div className="max-w-7xl mx-auto mb-6">
          <p className="text-white/40 text-sm">
            Found {totalFiltered} role model{totalFiltered !== 1 ? "s" : ""} matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(({ category, roleModels }) => (
            <CategorySection
              key={category.id}
              categoryId={category.id}
              roleModels={roleModels}
            />
          ))
        ) : (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg">No role models found matching your search.</p>
            <button
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
              }}
              className="mt-4 px-6 py-2 bg-zinc-800 text-white/60 rounded-lg hover:text-white hover:bg-zinc-700 transition-all"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10">
        <p className="text-white/30 text-sm text-center">
          Role Models Gallery • Ambient effects active • Marcus has video, others are placeholders
        </p>
      </div>
    </div>
  )
}
