"use client";

import { useState } from "react";
import { Sparkles, Heart, Crown, Dumbbell, Briefcase, Brain, Cigarette, ChevronRight } from "lucide-react";

const PATHS = [
  { id: "fto", label: "Find The One", desc: "Deep connection with your ideal partner", color: "#ffbe0b", icon: Heart },
  { id: "abundance", label: "Abundance", desc: "Freedom, options, and a lifestyle of choice", color: "#8338ec", icon: Crown },
] as const;

const REASONS = ["Get a girlfriend", "Find my dream girl", "Get engaged", "Be in a fulfilling relationship"];

const LIFE_AREAS = [
  { id: "health", label: "Health", desc: "Body & fitness", color: "#22c55e", icon: Dumbbell },
  { id: "career", label: "Career", desc: "Work & ambition", color: "#a855f7", icon: Briefcase },
  { id: "growth", label: "Personal Growth", desc: "Mind & skills", color: "#eab308", icon: Brain },
  { id: "vices", label: "Vices", desc: "Habits to break", color: "#ef4444", icon: Cigarette },
];

function NeonDot({ color }: { color: string }) {
  return (
    <div
      className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${color}80` }}
    />
  );
}

export function VariantA() {
  const [selectedPath, setSelectedPath] = useState<"fto" | "abundance" | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());

  const toggleReason = (r: string) => {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  };

  const toggleArea = (id: string) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cyan = "#00fff2";

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto flex flex-col gap-5" style={{ background: "#0a0a0f" }}>
      {/* Heading */}
      <div className="flex items-center gap-3 mb-2">
        <Sparkles size={22} style={{ color: cyan, filter: `drop-shadow(0 0 8px ${cyan})` }} />
        <h1 className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
          Shape Your Path to Mastery
        </h1>
      </div>

      {/* Dating & Daygame header */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ border: `1px solid ${cyan}`, background: "transparent" }}
      >
        <Heart size={18} style={{ color: cyan, filter: `drop-shadow(0 0 6px ${cyan})` }} />
        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
          Dating &amp; Daygame
        </span>
      </div>

      {/* Path cards */}
      <div className="grid grid-cols-2 gap-3">
        {PATHS.map((p) => {
          const sel = selectedPath === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPath(sel ? null : p.id)}
              className="relative rounded-xl px-4 py-4 text-left transition-all"
              style={{
                border: `${sel ? 2 : 1}px solid ${p.color}`,
                background: "transparent",
                boxShadow: sel ? `0 0 20px ${p.color}30, inset 0 0 20px ${p.color}10` : "none",
              }}
            >
              {sel && <NeonDot color={p.color} />}
              <Icon
                size={20}
                className="mb-2"
                style={{ color: p.color, filter: `drop-shadow(0 0 6px ${p.color})` }}
              />
              <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
                {p.label}
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {p.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Reasons — only when a path is selected */}
      {selectedPath && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
            Your reasons
          </span>
          {REASONS.map((r) => {
            const sel = selectedReasons.has(r);
            const pathColor = PATHS.find((p) => p.id === selectedPath)!.color;
            return (
              <button
                key={r}
                onClick={() => toggleReason(r)}
                className="relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-all"
                style={{
                  border: `${sel ? 2 : 1}px solid ${sel ? pathColor : "rgba(255,255,255,0.12)"}`,
                  background: "transparent",
                  boxShadow: sel ? `0 0 12px ${pathColor}20` : "none",
                }}
              >
                {sel && <NeonDot color={pathColor} />}
                <div
                  className="w-4 h-4 rounded border flex-shrink-0"
                  style={{
                    borderColor: sel ? pathColor : "rgba(255,255,255,0.2)",
                    background: sel ? pathColor : "transparent",
                    boxShadow: sel ? `0 0 8px ${pathColor}60` : "none",
                  }}
                />
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {r}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Done button */}
      <button
        className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
        style={{
          background: "#f97316",
          color: "#fff",
          boxShadow: "0 0 20px #f9731640",
        }}
      >
        Done
      </button>

      {/* Skip card */}
      <button
        className="w-full rounded-xl px-4 py-3 flex items-center justify-between transition-all"
        style={{ border: "1px solid #f97316", background: "transparent" }}
      >
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          Skip to goal selection
        </span>
        <ChevronRight size={16} style={{ color: "#f97316" }} />
      </button>

      {/* Divider */}
      <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

      {/* Other Life Areas */}
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
        Other Life Areas
      </span>
      <div className="grid grid-cols-2 gap-3">
        {LIFE_AREAS.map((a) => {
          const sel = selectedAreas.has(a.id);
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => toggleArea(a.id)}
              className="relative rounded-xl px-4 py-4 text-left transition-all"
              style={{
                border: `${sel ? 2 : 1}px solid ${a.color}`,
                background: "transparent",
                boxShadow: sel ? `0 0 20px ${a.color}30, inset 0 0 20px ${a.color}10` : "none",
              }}
            >
              {sel && <NeonDot color={a.color} />}
              <Icon
                size={20}
                className="mb-2"
                style={{ color: a.color, filter: `drop-shadow(0 0 6px ${a.color})` }}
              />
              <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
                {a.label}
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {a.desc}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
