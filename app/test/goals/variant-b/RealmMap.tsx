"use client"

import { useState } from "react"
import { Shield, ChevronRight, Swords, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Realm } from "./quest-data"

interface RealmMapProps {
  realms: Realm[]
  selectedRealm: Realm | null
  onSelectRealm: (realm: Realm) => void
}

export function RealmMap({ realms, selectedRealm, onSelectRealm }: RealmMapProps) {
  const mainRealms = realms.filter((r) => r.tier === "main")
  const sideRealms = realms.filter((r) => r.tier === "side")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Swords className="size-6 text-amber-500" />
          <h2 className="text-2xl font-bold tracking-tight">Choose Your Realm</h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Each realm unlocks unique quests and skill trees. Start with your primary focus,
          then branch out as you level up.
        </p>
      </div>

      {/* Main Realm (Daygame) - Featured card */}
      {mainRealms.map((realm) => (
        <button
          key={realm.id}
          onClick={() => onSelectRealm(realm)}
          className={`
            w-full text-left rounded-xl border-2 p-6 transition-all duration-200 cursor-pointer
            hover:scale-[1.01] hover:shadow-lg
            ${selectedRealm?.id === realm.id
              ? "shadow-lg"
              : "border-border hover:border-opacity-60"
            }
          `}
          style={{
            borderColor: selectedRealm?.id === realm.id ? realm.hex : undefined,
            background: selectedRealm?.id === realm.id
              ? `linear-gradient(135deg, ${realm.hex}08, ${realm.hex}15)`
              : undefined,
          }}
          data-testid={`realm-${realm.id}`}
        >
          <div className="flex items-start gap-4">
            <div
              className="rounded-lg p-3 flex-shrink-0"
              style={{ background: `${realm.hex}20` }}
            >
              <realm.icon className="size-8" style={{ color: realm.hex }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold">{realm.name}</h3>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{ color: realm.hex, borderColor: `${realm.hex}40` }}
                >
                  MAIN QUEST
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{realm.config.name}</p>
              <p className="text-sm text-muted-foreground">{realm.tagline}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="size-3" />
                  {realm.questCount} quests available
                </span>
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="size-3 fill-amber-500" />
                  Full skill tree
                </span>
              </div>
            </div>
            <ChevronRight
              className="size-5 text-muted-foreground flex-shrink-0 mt-2 transition-transform"
              style={{
                transform: selectedRealm?.id === realm.id ? "translateX(4px)" : undefined,
                color: selectedRealm?.id === realm.id ? realm.hex : undefined,
              }}
            />
          </div>
        </button>
      ))}

      {/* Side Realms Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            Side Quests
          </span>
          <div className="flex-1 border-t border-border/30" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sideRealms.map((realm) => (
            <button
              key={realm.id}
              onClick={() => onSelectRealm(realm)}
              className={`
                text-left rounded-lg border p-4 transition-all duration-200 cursor-pointer
                hover:scale-[1.02] hover:shadow-md
                ${selectedRealm?.id === realm.id
                  ? "shadow-md"
                  : "border-border"
                }
              `}
              style={{
                borderColor: selectedRealm?.id === realm.id ? realm.hex : undefined,
                background: selectedRealm?.id === realm.id
                  ? `linear-gradient(135deg, ${realm.hex}08, ${realm.hex}12)`
                  : undefined,
              }}
              data-testid={`realm-${realm.id}`}
            >
              <div
                className="rounded-md p-2 w-fit mb-2"
                style={{ background: `${realm.hex}15` }}
              >
                <realm.icon className="size-5" style={{ color: realm.hex }} />
              </div>
              <h4 className="text-sm font-semibold mb-0.5">{realm.name}</h4>
              <p className="text-[11px] text-muted-foreground line-clamp-1">{realm.config.name}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                {realm.questCount} quests
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
