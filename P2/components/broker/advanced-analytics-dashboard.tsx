"use client"

import type { Policy, InsurancePlacement, DataMode } from "@/lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { TrendingUp, AlertCircle, Clock } from "lucide-react"

interface AdvancedAnalyticsDashboardProps {
  data: Policy[] | InsurancePlacement[]
  dataMode: DataMode
  totalData: Policy[] | InsurancePlacement[]
}

export function AdvancedAnalyticsDashboard({ data, dataMode, totalData }: AdvancedAnalyticsDashboardProps) {
  const isCSVMode = dataMode === "csv"
  const placements = (data as InsurancePlacement[]) || []
  const policies = (data as Policy[]) || []

  // Calculate metrics
  const getMetrics = () => {
    if (isCSVMode && placements.length > 0) {
      const totalPremium = placements.reduce((sum, p) => sum + (p.totalPremium || 0), 0)
      const avgPremium = totalPremium / placements.length
      const expiringIn30 = placements.filter((p) => (p.daysUntilExpiry || 999) <= 30).length
      const criticalCount = placements.filter((p) => (p.priorityScore || 0) >= 80).length

      return {
        totalPremium,
        avgPremium,
        expiringIn30,
        criticalCount,
      }
    }

    return {
      totalPremium: 0,
      avgPremium: 0,
      expiringIn30: 0,
      criticalCount: 0,
    }
  }

  const metrics = getMetrics()

  // Status distribution chart data
  const getStatusDistribution = () => {
    if (!isCSVMode || placements.length === 0) return []

    const statusMap = new Map<string, number>()
    placements.forEach((p) => {
      const status = p.placementStatus || "Unknown"
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })

    return Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }))
  }

  // Expiry timeline chart data
  const getExpiryTimeline = () => {
    if (!isCSVMode || placements.length === 0) return []

    const ranges = [
      { label: "0-7 days", min: 0, max: 7 },
      { label: "8-30 days", min: 8, max: 30 },
      { label: "31-60 days", min: 31, max: 60 },
      { label: "61-90 days", min: 61, max: 90 },
      { label: "90+ days", min: 91, max: 999 },
    ]

    return ranges.map((range) => ({
      name: range.label,
      count: placements.filter((p) => (p.daysUntilExpiry || 999) >= range.min && (p.daysUntilExpiry || 999) <= range.max).length,
    }))
  }

  // Premium distribution by carrier
  const getPremiumByCarrier = () => {
    if (!isCSVMode || placements.length === 0) return []

    const carrierMap = new Map<string, number>()
    placements.forEach((p) => {
      const carrier = p.carrierGroup || "Unknown"
      carrierMap.set(carrier, (carrierMap.get(carrier) || 0) + (p.totalPremium || 0))
    })

    return Array.from(carrierMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  const statusData = getStatusDistribution()
  const expiryData = getExpiryTimeline()
  const carrierData = getPremiumByCarrier()

  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"]

  return (
    <div className="grid gap-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Premium at Risk</CardTitle>
            <span className="text-xl font-bold text-primary">Ξ</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ξ{(metrics.totalPremium / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">In active policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Premium per Policy</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ξ{(metrics.avgPremium / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">Across all policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring in 30 Days</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.expiringIn30}</div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.criticalCount}</div>
            <p className="text-xs text-muted-foreground">High priority renewals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Placement Status Distribution</CardTitle>
              <CardDescription>Breakdown of placement statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label dataKey="value">
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Expiry Timeline */}
        {expiryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Renewal Timeline</CardTitle>
              <CardDescription>Policies by days until expiry</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expiryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Premium by Carrier */}
        {carrierData.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Premium Distribution by Carrier</CardTitle>
              <CardDescription>Top carriers by total premium</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={carrierData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
