"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import type { FieldReportRow } from "@/src/db/trackingTypes"
import { getSystemTemplateInfo, TEMPLATE_COLORS, type TemplateSlug } from "../../data/templates"
import { TEMPLATE_ICONS } from "../templateIcons"

interface RecentFieldReportsCardProps {
  reports: FieldReportRow[]
  onDeleteReport: (reportId: string) => Promise<boolean>
}

export function RecentFieldReportsCard({ reports, onDeleteReport }: RecentFieldReportsCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this field report? This cannot be undone.")) {
      return
    }
    setDeletingReportId(reportId)
    await onDeleteReport(reportId)
    setDeletingReportId(null)
  }

  const toggleReportExpand = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId)
  }

  return (
    <div className="md:col-span-2 relative">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recent Field Reports</h2>
          <Link
            href="/dashboard/tracking/history"
            className="text-sm text-primary hover:underline"
          >
            View All
          </Link>
        </div>
        {reports.length > 0 ? (
          <div className="space-y-3">
            {(expanded ? reports : reports.slice(0, 3)).map((report) => {
              const templateInfo = report.system_template_slug
                ? getSystemTemplateInfo(report.system_template_slug)
                : null
              const templateSlug = (report.system_template_slug || "custom") as TemplateSlug
              const colors = TEMPLATE_COLORS[templateSlug] || TEMPLATE_COLORS.custom
              const isExpanded = expandedReportId === report.id

              return (
                <div
                  key={report.id}
                  className="rounded-lg bg-muted/30 overflow-hidden"
                >
                  {/* Clickable header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleReportExpand(report.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-[3.5rem] text-center">
                        <div className={`text-3xl font-bold ${
                          (report.approach_count ?? 0) > 0 ? "text-primary" : "text-muted-foreground/50"
                        }`}>
                          {report.approach_count ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          approaches
                        </div>
                      </div>
                      <div className={`p-2 rounded-lg ${colors.icon} shrink-0`}>
                        {TEMPLATE_ICONS[templateSlug] || <FileText className="size-5" />}
                      </div>
                      <div>
                        <div className="font-medium">
                          {report.title || templateInfo?.name || "Field Report"}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>
                            {new Date(report.reported_at).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {report.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                {report.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.is_draft && (
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                          Draft
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleReportExpand(report.id)
                        }}
                      >
                        {isExpanded ? "Close" : "View"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/tracking/report?edit=${report.id}`)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(report.id)
                        }}
                        disabled={deletingReportId === report.id}
                      >
                        {deletingReportId === report.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border/50 p-5 bg-gradient-to-b from-muted/20 to-transparent">
                      <div className="grid gap-4">
                        {Object.entries(report.fields).map(([key, value]) => {
                          if (value === null || value === undefined || value === "") return null
                          if (Array.isArray(value) && value.length === 0) return null

                          const label = key
                            .replace(/_/g, " ")
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase())
                            .trim()

                          const isMoodField = key.toLowerCase().includes("mood")
                          const isScaleField = typeof value === "number" && value >= 1 && value <= 10

                          let displayValue: React.ReactNode
                          if (Array.isArray(value)) {
                            displayValue = (
                              <div className="flex flex-wrap gap-2">
                                {value.map((item, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs px-2 py-1">
                                    {String(item)}
                                  </Badge>
                                ))}
                              </div>
                            )
                          } else if (typeof value === "boolean") {
                            displayValue = (
                              <Badge variant={value ? "default" : "secondary"}>
                                {value ? "Yes" : "No"}
                              </Badge>
                            )
                          } else if (isMoodField && typeof value === "number") {
                            const moodEmojis = ["", "😫", "😔", "😐", "🙂", "😄"]
                            displayValue = (
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{moodEmojis[value] || "😐"}</span>
                                <span className="text-sm text-muted-foreground">{value}/5</span>
                              </div>
                            )
                          } else if (isScaleField) {
                            displayValue = (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-32">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${(value as number) * 10}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{value}/10</span>
                              </div>
                            )
                          } else if (typeof value === "number") {
                            displayValue = (
                              <span className="text-lg font-semibold text-primary">{value}</span>
                            )
                          } else {
                            displayValue = (
                              <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">{String(value)}</p>
                            )
                          }

                          const isLongText = typeof value === "string" && value.length > 80

                          return (
                            <div
                              key={key}
                              className={`rounded-lg p-3 bg-card/50 border border-border/30 ${isLongText ? "col-span-full" : ""}`}
                            >
                              <dt className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{label}</dt>
                              <dd>{displayValue}</dd>
                            </div>
                          )
                        })}
                        {Object.keys(report.fields).length === 0 && (
                          <p className="text-sm text-muted-foreground italic text-center py-4">No fields recorded</p>
                        )}
                      </div>
                      <div className="mt-5 pt-4 border-t border-border/30 flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleReportExpand(report.id)}
                        >
                          Close
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/dashboard/tracking/report?edit=${report.id}`)}
                        >
                          <Pencil className="size-4 mr-2" />
                          Edit Report
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="size-12 mx-auto mb-3 opacity-30" />
            <p>No field reports yet</p>
            <p className="text-sm">Write your first report to reflect on your sessions</p>
          </div>
        )}
      </Card>
      {reports.length > 3 && (
        <div className="flex justify-center -mt-5 relative z-10">
          <button
            onClick={() => setExpanded(!expanded)}
            className="group flex items-center gap-2 pl-4 pr-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 hover:shadow-xl"
            data-testid="reports-expand-button"
          >
            <span className="text-sm font-medium">
              {expanded ? "Show less" : `${reports.length - 3} more`}
            </span>
            {expanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
