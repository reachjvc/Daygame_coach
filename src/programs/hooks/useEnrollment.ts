"use client"

import { useState, useEffect, useCallback } from "react"
import type { EnrollmentDetail, ProgramEnrollment } from "../types"

/** Active enrollments for the current user. */
export function useActiveEnrollments() {
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/programs/enrollments")
      const data = res.ok ? await res.json().catch(() => []) : []
      setEnrollments(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { enrollments, loading, refresh }
}

/** One enrollment + today's prescription + log history. */
export function useEnrollment(id: string | null) {
  const [detail, setDetail] = useState<EnrollmentDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!id) {
      setDetail(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/programs/enrollments/${id}`)
      if (res.ok) setDetail(await res.json().catch(() => null))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { detail, loading, refresh }
}
