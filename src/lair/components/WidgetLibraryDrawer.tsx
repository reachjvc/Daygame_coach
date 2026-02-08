"use client"

import { useState } from "react"
import { Plus, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { WIDGET_CATEGORIES } from "../config"
import { getAvailableWidgetsForTab, getWidgetsByCategory } from "../lairService"
import type { UserLairLayout, WidgetCategory, WidgetDefinition } from "../types"

interface WidgetLibraryDrawerProps {
  layout: UserLairLayout
  tabId: string
  onAddWidget: (widgetId: string) => void
}

export function WidgetLibraryDrawer({
  layout,
  tabId,
  onAddWidget,
}: WidgetLibraryDrawerProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const availableWidgets = getAvailableWidgetsForTab(layout, tabId)
  const widgetsByCategory = getWidgetsByCategory()

  // Filter available widgets by category and search query
  const filteredWidgets = availableWidgets.filter((w) => {
    const matchesCategory = selectedCategory === "all" || w.category === selectedCategory
    const matchesSearch = searchQuery === "" ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleAddWidget = (widget: WidgetDefinition) => {
    onAddWidget(widget.id)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap pb-2 border-b">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Button>
          {(Object.keys(WIDGET_CATEGORIES) as WidgetCategory[]).map((category) => {
            const hasAvailable = availableWidgets.some((w) => w.category === category)
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                disabled={!hasAvailable}
                className={cn(!hasAvailable && "opacity-50")}
              >
                {WIDGET_CATEGORIES[category].label}
              </Button>
            )
          })}
        </div>

        {/* Widget List */}
        <div className="overflow-y-auto flex-1 py-4">
          {filteredWidgets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {availableWidgets.length === 0
                ? "All widgets are already added to this tab"
                : "No widgets in this category"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredWidgets.map((widget) => (
                <Card
                  key={widget.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleAddWidget(widget)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {widget.name}
                          {widget.premium && (
                            <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {widget.description}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {widget.size}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
