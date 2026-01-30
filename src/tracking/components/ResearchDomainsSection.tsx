"use client"

/**
 * Research domains data - the 12 fields from which principles were sourced
 */
const RESEARCH_DOMAINS = [
  { name: "Military", detail: "US Army After Action Reviews", icon: "🎖️" },
  { name: "Sports Psychology", detail: "Elite athlete debriefs", icon: "🏆" },
  { name: "CBT", detail: "Cognitive Behavioral Therapy", icon: "🧠" },
  { name: "Habit Science", detail: "BJ Fogg, James Clear", icon: "🔄" },
  { name: "Learning Theory", detail: "Kolb, Ericsson", icon: "📚" },
  { name: "Self-Compassion", detail: "Kristin Neff research", icon: "💚" },
  { name: "Trading/Poker", detail: "Decision journaling", icon: "🎰" },
  { name: "Aviation", detail: "Crew Resource Management", icon: "✈️" },
  { name: "Improv Comedy", detail: "Second City methods", icon: "🎭" },
  { name: "Healthcare", detail: "Gibbs & Driscoll models", icon: "🏥" },
  { name: "BJJ/Martial Arts", detail: "Video analysis methods", icon: "🥋" },
  { name: "Agile/Software", detail: "Retrospectives", icon: "💻" },
]

/**
 * Displays the 12+ research domains from which principles were sourced
 * Simple grid layout showing the breadth of research backing
 */
export function ResearchDomainsSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">Sourced From 15+ Domains</h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We didn&apos;t invent these principles. We synthesized decades of research from fields that have mastered the art of learning from experience.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {RESEARCH_DOMAINS.map((domain) => (
          <div
            key={domain.name}
            className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
          >
            <div className="text-2xl mb-2">{domain.icon}</div>
            <h4 className="font-semibold text-foreground text-sm">{domain.name}</h4>
            <p className="text-muted-foreground text-xs">{domain.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
