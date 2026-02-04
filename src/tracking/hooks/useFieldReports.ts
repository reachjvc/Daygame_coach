"use client"

import { useState, useEffect, useCallback } from "react"
import type { FieldReportRow } from "@/src/db/trackingTypes"

type FilterMode = "all" | "submitted" | "drafts"

interface UseFieldReportsState {
  reports: FieldReportRow[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  filterMode: FilterMode
}

interface UseFieldReportsReturn {
  state: UseFieldReportsState
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  setFilterMode: (mode: FilterMode) => void
  deleteReport: (reportId: string) => Promise<boolean>
}

const PAGE_SIZE = 10

export function useFieldReports(): UseFieldReportsReturn {
  const [state, setState] = useState<UseFieldReportsState>({
    reports: [],
    isLoading: true,
    error: null,
    hasMore: true,
    filterMode: "all",
  })

  const fetchReports = useCallback(async (offset = 0, append = false) => {
    try {
      if (!append) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))
      }

      const isDrafts = state.filterMode === "drafts"
      const url = isDrafts
        ? "/api/tracking/field-report?drafts=true"
        : `/api/tracking/field-report?limit=${PAGE_SIZE}&offset=${offset}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch field reports")
      }

      const data: FieldReportRow[] = await response.json()

      // Filter by mode if "submitted" (non-drafts only)
      let filteredData = data
      if (state.filterMode === "submitted") {
        filteredData = data.filter((r) => !r.is_draft)
      }

      setState((prev) => ({
        ...prev,
        reports: append ? [...prev.reports, ...filteredData] : filteredData,
        isLoading: false,
        hasMore: filteredData.length >= PAGE_SIZE,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load reports",
      }))
    }
  }, [state.filterMode])

  useEffect(() => {
    fetchReports(0, false)
  }, [state.filterMode, fetchReports])

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.isLoading) return
    await fetchReports(state.reports.length, true)
  }, [fetchReports, state.hasMore, state.isLoading, state.reports.length])

  const setFilterMode = useCallback((mode: FilterMode) => {
    setState((prev) => ({
      ...prev,
      filterMode: mode,
      reports: [],
      hasMore: true,
    }))
  }, [])

  const deleteReport = useCallback(async (reportId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tracking/field-report/${reportId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete report")
      }

      // Remove from state immediately
      setState((prev) => ({
        ...prev,
        reports: prev.reports.filter((r) => r.id !== reportId),
      }))

      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete report",
      }))
      return false
    }
  }, [])

  return {
    state,
    refresh: () => fetchReports(0, false),
    loadMore,
    setFilterMode,
    deleteReport,
  }
}
