"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Brain, Zap, CircleDot, FileText, Clock, Library } from "lucide-react"
import { CONTENT_PILLARS, ARTICLE_TIERS, SCALABLE_FORMATS } from "../config"
import type { ContentPillar } from "../types"

const pillarIcons: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen className="size-6 text-primary" />,
  Brain: <Brain className="size-6 text-primary" />,
  Zap: <Zap className="size-6 text-primary" />,
  Target: <CircleDot className="size-6 text-primary" />,
}

const breadthColors: Record<string, string> = {
  universal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  broad: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  narrow: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
}

function PillarCard({ pillar }: { pillar: ContentPillar }) {
  return (
    <Card className="h-full hover:border-primary/50 transition-colors" data-testid={`pillar-card-${pillar.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {pillarIcons[pillar.icon]}
          </div>
          <Badge variant="secondary" className={breadthColors[pillar.breadth]}>
            {pillar.breadth}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-4">{pillar.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">
          {pillar.description}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export function ArticlesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12" data-testid="articles-page">
      {/* Header */}
      <header className="space-y-3 text-center" data-testid="articles-header">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Articles & Research
        </p>
        <h1 className="text-4xl font-semibold text-foreground">
          Knowledge Library
        </h1>
        <p className="mx-auto max-w-3xl text-base text-muted-foreground">
          Research-backed articles on performance psychology, self-improvement, and social dynamics.
          Content that adds value whether you use the app or not.
        </p>
      </header>

      {/* Coming Soon Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="size-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Library className="size-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Content Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground">
              We're building a comprehensive library of articles covering everything from deliberate practice
              to social dynamics. Check back soon for research summaries, frameworks, and practical guides.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content Pillars */}
      <section data-testid="content-pillars">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Content Pillars</h2>
          <p className="text-muted-foreground">
            Our articles span four core areas, from universal principles to specific tactics.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTENT_PILLARS.map((pillar) => (
            <PillarCard key={pillar.id} pillar={pillar} />
          ))}
        </div>
      </section>

      {/* Article Types */}
      <section data-testid="article-types">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Article Types</h2>
          <p className="text-muted-foreground">
            Different depths for different needs.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(ARTICLE_TIERS).map(([key, tier]) => (
            <Card key={key} className="h-full" data-testid={`article-type-${key}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="size-5 text-foreground" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1">{tier.badge}</Badge>
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{tier.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Content Formats Preview */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-2">What to Expect</h2>
          <p className="text-muted-foreground">
            Practical formats designed to deliver real value.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCALABLE_FORMATS.map((format) => (
            <Card key={format.name} className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{format.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-primary font-medium">
                  "{format.example}"
                </p>
                <p className="text-xs text-muted-foreground">
                  {format.reason}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stats placeholder */}
      <section className="grid sm:grid-cols-3 gap-6">
        <Card className="text-center py-8">
          <CardContent className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-foreground">
              <FileText className="size-8 text-primary" />
              <span>0</span>
            </div>
            <p className="text-sm text-muted-foreground">Articles Published</p>
          </CardContent>
        </Card>
        <Card className="text-center py-8">
          <CardContent className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-foreground">
              <Clock className="size-8 text-primary" />
              <span>0</span>
            </div>
            <p className="text-sm text-muted-foreground">Minutes of Reading</p>
          </CardContent>
        </Card>
        <Card className="text-center py-8">
          <CardContent className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-foreground">
              <BookOpen className="size-8 text-primary" />
              <span>4</span>
            </div>
            <p className="text-sm text-muted-foreground">Content Pillars</p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
