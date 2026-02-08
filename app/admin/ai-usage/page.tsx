"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type UserSpending = {
  user_id: string
  total_cost_cents: number
  total_calls: number
}

type AIUsageLog = {
  id: string
  user_id: string
  feature: string
  scenario_id: string | null
  operation: string
  model: string
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number | null
  cache_read_tokens: number | null
  total_cost_cents: number
  response_time_ms: number | null
  error: string | null
  created_at: string
  // Prompt/response content for detail view
  system_prompt: string | null
  user_prompt: string | null
  ai_response: string | null
}

type FeatureStats = {
  feature: string
  total_calls: number
  total_cost_cents: number
  total_input_tokens: number
  total_output_tokens: number
}

type ScenarioStats = {
  scenario_id: string
  total_calls: number
  total_cost_cents: number
}

export default function AdminAIUsagePage() {
  const [adminKey, setAdminKey] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [allUsersData, setAllUsersData] = useState<{
    total_users: number
    total_spending_cents: number
    total_spending_dollars: number
    users: UserSpending[]
  } | null>(null)
  const [logs, setLogs] = useState<AIUsageLog[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [featureStats, setFeatureStats] = useState<FeatureStats[]>([])
  const [scenarioStats, setScenarioStats] = useState<ScenarioStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterFeature, setFilterFeature] = useState<string>("")
  const [filterDays, setFilterDays] = useState<number>(30)
  const [filterUserId, setFilterUserId] = useState<string>("")
  const [offset, setOffset] = useState(0)
  const limit = 50

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AIUsageLog | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("admin_key")
    if (stored) {
      setAdminKey(stored)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = () => {
    if (adminKey.trim()) {
      localStorage.setItem("admin_key", adminKey)
      setIsAuthenticated(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_key")
    setIsAuthenticated(false)
    setAdminKey("")
    setAllUsersData(null)
    setLogs([])
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all users spending
      const usersResponse = await fetch("/api/admin/api-ai-usage", {
        headers: { "X-Admin-Key": adminKey },
      })

      if (!usersResponse.ok) {
        if (usersResponse.status === 401) {
          setError("Invalid admin key")
          handleLogout()
          return
        }
        throw new Error("Failed to fetch users data")
      }

      const usersData = await usersResponse.json()
      setAllUsersData(usersData)

      // Fetch logs with filters
      const logsParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        days: filterDays.toString(),
      })
      if (filterFeature) logsParams.set("feature", filterFeature)
      if (filterUserId) logsParams.set("user_id", filterUserId)

      const logsResponse = await fetch(`/api/admin/check-ai-logs?${logsParams}`, {
        headers: { "X-Admin-Key": adminKey },
      })

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData.logs || [])
        setTotalLogs(logsData.total || 0)
      }

      // Fetch stats
      const statsResponse = await fetch("/api/admin/api-ai-stats", {
        headers: { "X-Admin-Key": adminKey },
      })

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setFeatureStats(statsData.by_feature || [])
        setScenarioStats(statsData.by_scenario || [])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, filterFeature, filterDays, filterUserId, offset])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          <input
            type="password"
            placeholder="Enter admin key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">AI Usage Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {allUsersData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm mb-1">Total Users</div>
              <div className="text-3xl font-bold">{allUsersData.total_users}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm mb-1">Total Spending</div>
              <div className="text-3xl font-bold">
                ${allUsersData.total_spending_dollars.toFixed(4)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm mb-1">Total API Calls</div>
              <div className="text-3xl font-bold">{totalLogs}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-gray-500 text-sm mb-1">Avg Cost/Call</div>
              <div className="text-3xl font-bold">
                {totalLogs > 0
                  ? `$${(allUsersData.total_spending_cents / totalLogs / 100).toFixed(4)}`
                  : "$0"}
              </div>
            </div>
          </div>
        )}

        {/* Stats by Feature */}
        {featureStats.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Cost by Feature</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output Tokens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {featureStats.map((stat) => (
                    <tr key={stat.feature} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {stat.feature}
                        </span>
                      </td>
                      <td className="px-6 py-4">{stat.total_calls.toLocaleString()}</td>
                      <td className="px-6 py-4">{stat.total_input_tokens.toLocaleString()}</td>
                      <td className="px-6 py-4">{stat.total_output_tokens.toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium">
                        ${(stat.total_cost_cents / 100).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats by Scenario */}
        {scenarioStats.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Cost by Scenario</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scenarioStats.map((stat) => (
                    <tr key={stat.scenario_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {stat.scenario_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">{stat.total_calls.toLocaleString()}</td>
                      <td className="px-6 py-4 font-medium">
                        ${(stat.total_cost_cents / 100).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Table */}
        {allUsersData && allUsersData.users.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Users Spending</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allUsersData.users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {user.user_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">{user.total_calls}</td>
                      <td className="px-6 py-4 font-medium">
                        ${(user.total_cost_cents / 100).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-4 p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div>
              <label className="text-sm text-gray-500 mr-2">User:</label>
              <select
                value={filterUserId}
                onChange={(e) => { setFilterUserId(e.target.value); setOffset(0) }}
                className="border rounded px-2 py-1"
              >
                <option value="">All Users</option>
                {allUsersData?.users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user_id.substring(0, 8)}... ({user.total_calls} calls)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mr-2">Feature:</label>
              <select
                value={filterFeature}
                onChange={(e) => { setFilterFeature(e.target.value); setOffset(0) }}
                className="border rounded px-2 py-1"
              >
                <option value="">All</option>
                <option value="keep-it-going">keep-it-going</option>
                <option value="qa">qa</option>
                <option value="articles">articles</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mr-2">Days:</label>
              <select
                value={filterDays}
                onChange={(e) => { setFilterDays(parseInt(e.target.value)); setOffset(0) }}
                className="border rounded px-2 py-1"
              >
                <option value="1">Last 24h</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {logs.length} of {totalLogs} logs
            </div>
          </div>
        </div>

        {/* Detailed Logs */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">API Call Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cache Create</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cache Read</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-600">
                        {log.user_id.substring(0, 8)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {log.feature}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{log.operation}</td>
                      <td className="px-3 py-3 text-gray-600">{log.scenario_id || "-"}</td>
                      <td className="px-3 py-3 text-gray-900 font-mono">
                        {log.input_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-gray-900 font-mono">
                        {log.output_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-gray-500 font-mono">
                        {log.cache_creation_tokens?.toLocaleString() || "-"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 font-mono">
                        {log.cache_read_tokens?.toLocaleString() || "-"}
                      </td>
                      <td className="px-3 py-3 text-gray-900 font-medium">
                        ${(Number(log.total_cost_cents) / 100).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalLogs > limit && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {Math.floor(offset / limit) + 1} of {Math.ceil(totalLogs / limit)}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= totalLogs}
                  className="px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {allUsersData && allUsersData.users.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-lg mb-2">No API usage yet</div>
            <div className="text-gray-500 text-sm">
              Use the keep-it-going scenario to generate some usage data
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>API Call Details</DialogTitle>
              <DialogDescription>
                {selectedLog?.feature} / {selectedLog?.operation} -{" "}
                {selectedLog && new Date(selectedLog.created_at).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            {selectedLog && (
              <div className="space-y-6">
                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">User ID</div>
                    <div className="font-mono text-xs break-all">{selectedLog.user_id}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Model</div>
                    <div className="text-xs">{selectedLog.model}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Input Tokens</div>
                    <div className="font-mono">{selectedLog.input_tokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Output Tokens</div>
                    <div className="font-mono">{selectedLog.output_tokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Cost</div>
                    <div className="font-medium">
                      ${(Number(selectedLog.total_cost_cents) / 100).toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Response Time</div>
                    <div>{selectedLog.response_time_ms ? `${selectedLog.response_time_ms}ms` : "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Scenario</div>
                    <div>{selectedLog.scenario_id || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Cache (Create/Read)</div>
                    <div className="font-mono">
                      {selectedLog.cache_creation_tokens || 0} / {selectedLog.cache_read_tokens || 0}
                    </div>
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">System Prompt</h4>
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedLog.system_prompt || "(not captured)"}
                  </pre>
                </div>

                {/* User Prompt */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">User Prompt</h4>
                  <pre className="bg-blue-50 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedLog.user_prompt || "(not captured)"}
                  </pre>
                </div>

                {/* AI Response */}
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">AI Response</h4>
                  <pre className="bg-green-50 p-4 rounded-md text-sm overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedLog.ai_response || "(not captured)"}
                  </pre>
                </div>

                {/* Error (if any) */}
                {selectedLog.error && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Error</h4>
                    <pre className="bg-red-50 p-4 rounded-md text-sm text-red-800">
                      {selectedLog.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
