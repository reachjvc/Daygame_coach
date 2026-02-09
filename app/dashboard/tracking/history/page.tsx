"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  ArrowLeft,
  FileText,
  MapPin,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  Calendar,
  Filter,
} from "lucide-react"
import { useFieldReports } from "@/src/tracking/hooks"
import { getSystemTemplateInfo, TEMPLATE_COLORS, type TemplateSlug } from "@/src/tracking/data/templates"
import { TEMPLATE_ICONS } from "@/src/tracking/components/templateIcons"
import type { FieldReportRow } from "@/src/db/trackingTypes"

type FilterMode = "all" | "submitted" | "drafts"

export default function FieldReportHistoryPage() {
  const { state, loadMore, setFilterMode, deleteReport } = useFieldReports()
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) {
      return
    }
    setDeletingId(reportId)
    await deleteReport(reportId)
    setDeletingId(null)
  }

  const toggleExpand = (reportId: string) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId)
  }

  const filterOptions: { value: FilterMode; label: string }[] = [
    { value: "all", label: "All Reports" },
    { value: "submitted", label: "Submitted" },
    { value: "drafts", label: "Drafts" },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/tracking"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Tracking
        </Link>
        <h1 className="text-3xl font-bold">Field Report History</h1>
        <p className="text-muted-foreground mt-2">
          Review your past field reports and reflections
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="size-4 text-muted-foreground" />
        <div className="flex gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterMode(option.value)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                state.filterMode === option.value
                  ? "bg-primary text-primary-foreground font-medium"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {state.isLoading && state.reports.length === 0 && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <Card className="p-6 text-center">
          <p className="text-destructive">{state.error}</p>
        </Card>
      )}

      {/* Empty State */}
      {!state.isLoading && state.reports.length === 0 && !state.error && (
        <Card className="p-12 text-center">
          <FileText className="size-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-semibold mb-2">No Field Reports Yet</h2>
          <p className="text-muted-foreground mb-6">
            {state.filterMode === "drafts"
              ? "You don't have any draft reports."
              : "Write your first field report to start reflecting on your sessions."}
          </p>
          <Link href="/dashboard/tracking/report">
            <Button>Write Field Report</Button>
          </Link>
        </Card>
      )}

      {/* Reports List */}
      {state.reports.length > 0 && (
        <div className="space-y-4">
          {state.reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isExpanded={expandedReportId === report.id}
              onToggleExpand={() => toggleExpand(report.id)}
              onDelete={() => handleDelete(report.id)}
              isDeleting={deletingId === report.id}
            />
          ))}

          {/* Load More Button */}
          {state.hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={state.isLoading}
                className="gap-2"
              >
                {state.isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ReportCardProps {
  report: FieldReportRow
  isExpanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
  isDeleting: boolean
}

function ReportCard({ report, isExpanded, onToggleExpand, onDelete, isDeleting }: ReportCardProps) {
  const router = useRouter()
  const templateInfo = report.system_template_slug
    ? getSystemTemplateInfo(report.system_template_slug)
    : null
  const templateSlug = (report.system_template_slug || "custom") as TemplateSlug
  const colors = TEMPLATE_COLORS[templateSlug] || TEMPLATE_COLORS.custom

  return (
    <Card className="overflow-hidden">
      {/* Card Header - Always visible */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Template icon */}
            <div className={`p-3 rounded-xl ${colors.icon} shadow-md`}>
              {TEMPLATE_ICONS[templateSlug] || <FileText className="size-5" />}
            </div>
            <div>
              <div className="font-semibold text-lg">
                {report.title || templateInfo?.name || "Field Report"}
              </div>
              <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {new Date(report.reported_at).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {report.approach_count !== null && report.approach_count > 0 && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span>{report.approach_count} approaches</span>
                  </>
                )}
                {report.location && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {report.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {report.is_draft && (
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                Draft
              </Badge>
            )}
            {templateInfo && (
              <Badge variant="secondary" className={colors.bg}>
                {templateInfo.name}
              </Badge>
            )}
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
                onDelete()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
            <div className="p-2">
              {isExpanded ? (
                <ChevronUp className="size-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border/50 p-6 bg-muted/10">
          <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
            Report Fields
          </h3>
          <div className="space-y-4">
            {Object.entries(report.fields).map(([key, value]) => {
              // Skip empty values
              if (value === null || value === undefined || value === "") return null
              if (Array.isArray(value) && value.length === 0) return null

              // Format the key to be human-readable
              const label = key
                .replace(/_/g, " ")
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .trim()

              // Format the value based on type
              let displayValue: React.ReactNode
              if (Array.isArray(value)) {
                displayValue = (
                  <div className="flex flex-wrap gap-2">
                    {value.map((item, i) => (
                      <Badge key={i} variant="outline">
                        {String(item)}
                      </Badge>
                    ))}
                  </div>
                )
              } else if (typeof value === "boolean") {
                displayValue = value ? "Yes" : "No"
              } else {
                displayValue = (
                  <p className="whitespace-pre-wrap text-foreground/90">{String(value)}</p>
                )
              }

              return (
                <div key={key} className="border-b border-border/30 pb-4 last:border-0 last:pb-0">
                  <dt className="text-sm font-medium text-muted-foreground mb-1">{label}</dt>
                  <dd>{displayValue}</dd>
                </div>
              )
            })}
          </div>

          {/* Tags */}
          {report.tags && report.tags.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/30">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {report.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
