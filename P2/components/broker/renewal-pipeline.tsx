"use client"

import { useState, useMemo } from "react"
import type React from "react"
import type {
  Policy,
  InsurancePlacement,
  DataMode,
  PriorityWeights,
  RenewalPipelineItem,
  EmailData,
  CalendarEvent,
} from "@/lib/types"
import {
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings2,
  Info,
  Gauge,
  FileText,
  Edit3,
  Mail,
  Eye,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { RenewalBriefModal } from "./renewal-brief-modal"
import { ScoreOverrideModal } from "./score-override-modal"

const BLOCKCHAIN_CONTRACT_URL = "https://sepolia.etherscan.io/address/0x2e6d92cfc80616637dc67a61dcf11e3859ad852f"

interface RenewalPipelineProps {
  policies: Policy[]
  placements: InsurancePlacement[]
  dataMode: DataMode
  emailData?: EmailData[]
  calendarData?: CalendarEvent[]
  onRefresh?: () => void
  onCSVDataLoad?: (data: unknown[]) => void
  onCSVUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const TIME_WINDOWS = [
  { days: 180, label: "180 Days" },
  { days: 90, label: "90 Days" },
  { days: 30, label: "30 Days" },
  { days: 7, label: "7 Days" },
  { days: 9999, label: "All" },
]

const DEFAULT_WEIGHTS: PriorityWeights = {
  premiumAtRisk: 0.3,
  timeToExpiry: 0.35,
  claimsHistory: 0.1,
  carrierResponsiveness: 0.15,
  churnLikelihood: 0.1,
  marketConditions: 0,
  interactionHealth: 0,
}

const WEIGHT_LABELS: Record<keyof PriorityWeights, string> = {
  premiumAtRisk: "Premium at Risk",
  timeToExpiry: "Time to Expiry",
  claimsHistory: "Claims History",
  carrierResponsiveness: "Carrier Response",
  churnLikelihood: "Churn Risk",
  marketConditions: "Market Conditions",
  interactionHealth: "Interaction Health",
}

export function RenewalPipeline({
  policies,
  placements,
  dataMode,
  emailData = [],
  calendarData = [],
  onRefresh,
  onCSVUpload,
}: RenewalPipelineProps) {
  const [timeWindow, setTimeWindow] = useState(9999)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterUrgency, setFilterUrgency] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"priority" | "expiry" | "premium">("priority")
  const [showWeights, setShowWeights] = useState(false)
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_WEIGHTS)
  const [briefModalItem, setBriefModalItem] = useState<RenewalPipelineItem | null>(null)
  const [overrideModalItem, setOverrideModalItem] = useState<RenewalPipelineItem | null>(null)
  const [manualOverrides, setManualOverrides] = useState<Map<string, { score: number; reason: string }>>(new Map())
  const [showAllPolicies, setShowAllPolicies] = useState(false)

  const getRelatedEmails = (placementId: string): EmailData[] => {
    return emailData.filter(
      (e) => e.policyId === placementId || e.clientName?.toLowerCase().includes(placementId.toLowerCase()),
    )
  }

  const getRelatedCalendarEvents = (placementId: string): CalendarEvent[] => {
    return calendarData.filter(
      (e) => e.policyId === placementId || e.clientName?.toLowerCase().includes(placementId.toLowerCase()),
    )
  }

  // Build pipeline based on data mode
  const pipeline = useMemo(() => {
    if (dataMode === "csv") {
      // CSV Mode - use placements
      return placements
        .filter((p) => (p.daysUntilExpiry || 999) <= timeWindow)
        .map((placement) => {
          const id = placement.placementId
          const override = manualOverrides.get(id)
          const relatedEmails = getRelatedEmails(placement.placementId)
          const negativeEmails = relatedEmails.filter((e) => e.sentiment === "negative").length
          const sentimentAdjustment = negativeEmails > 0 ? Math.min(negativeEmails * 5, 15) : 0

          const baseScore = placement.scoreBreakdown?.total || placement.priorityScore || 50
          const finalScore = override?.score ?? Math.min(100, baseScore + sentimentAdjustment)
          const urgencyLevel =
            finalScore >= 75 ? "critical" : finalScore >= 50 ? "high" : finalScore >= 25 ? "medium" : "low"

          return {
            placement,
            daysUntilExpiry: placement.daysUntilExpiry || 999,
            priorityScore: finalScore,
            urgencyLevel,
            factors: {
              premiumAtRisk: placement.totalPremium || 0,
              timeToExpiry: placement.daysUntilExpiry || 999,
              claimsHistory: 0,
              carrierResponsiveness: placement.placementStatus === "Quote" ? 80 : 50,
              churnLikelihood: placement.incumbentIndicator === "Y" ? 20 : 60,
            },
            source: { type: "csv" as const, id: placement.placementId },
            scoreBreakdown: placement.scoreBreakdown,
            manualOverride: override,
            relatedEmails,
            relatedCalendarEvents: getRelatedCalendarEvents(placement.placementId),
          } as RenewalPipelineItem & { relatedEmails: EmailData[]; relatedCalendarEvents: CalendarEvent[] }
        })
    } else {
      // Blockchain Mode - use policies
      const nowSeconds = Math.floor(Date.now() / 1000)

      return policies
        .filter((p) => {
          // Duration from contract is in SECONDS - divide by 86400 to get days
          const rawDuration = Number(p.duration)
          const durationDays = Math.ceil(rawDuration / 86400)
          const startTimeSeconds = Number(p.startTime)

          let daysLeft: number
          if (startTimeSeconds === 0) {
            // Policy not yet activated - use duration as days remaining
            daysLeft = durationDays
          } else {
            // Policy is active - calculate from expiry
            const expirySeconds = startTimeSeconds + rawDuration
            daysLeft = Math.ceil((expirySeconds - nowSeconds) / 86400)
          }

          if (timeWindow === 9999) return Number(p.status) === 1
          return daysLeft <= timeWindow && daysLeft > -30 && Number(p.status) === 1
        })
        .map((policy) => {
          // Duration from contract is in SECONDS - divide by 86400 to get days
          const rawDuration = Number(policy.duration)
          const durationDays = Math.ceil(rawDuration / 86400)
          const startTimeSeconds = Number(policy.startTime)

          // Calculate days until expiry
          let daysUntilExpiry: number
          if (startTimeSeconds === 0) {
            // Policy not yet activated - use duration as days remaining
            daysUntilExpiry = durationDays
          } else {
            // Policy is active - calculate from expiry
            const expirySeconds = startTimeSeconds + rawDuration
            daysUntilExpiry = Math.ceil((expirySeconds - nowSeconds) / 86400)
          }

          const premiumValue = Number(policy.premium) / 1e18
          const coverageValue = Number(policy.coverageAmount) / 1e18

          // Calculate priority score based on multiple factors
          const premiumScore = Math.min(100, (premiumValue / 5) * 100)
          const timeScore = daysUntilExpiry <= 0 ? 100 : Math.max(0, 100 - daysUntilExpiry * 1.5)
          const renewalScore = Number(policy.renewalCount) > 0 ? 30 : 70

          const baseScore = Math.round(
            (premiumScore * weights.premiumAtRisk +
              timeScore * weights.timeToExpiry +
              renewalScore * weights.churnLikelihood) /
            (weights.premiumAtRisk + weights.timeToExpiry + weights.churnLikelihood),
          )

          const override = manualOverrides.get(policy.policyHash)
          const finalScore = override?.score ?? baseScore
          const urgencyLevel =
            finalScore >= 75 ? "critical" : finalScore >= 50 ? "high" : finalScore >= 25 ? "medium" : "low"

          return {
            policy,
            daysUntilExpiry,
            priorityScore: finalScore,
            urgencyLevel,
            factors: {
              premiumAtRisk: premiumValue,
              timeToExpiry: daysUntilExpiry, // This is now in DAYS, not seconds
              claimsHistory: 0,
              carrierResponsiveness: 50,
              churnLikelihood: 30,
            },
            source: { type: "blockchain" as const, id: policy.policyHash },
            manualOverride: override,
            coverage: coverageValue,
          } as RenewalPipelineItem
        })
        .sort((a, b) => b.priorityScore - a.priorityScore)
    }
  }, [dataMode, placements, policies, timeWindow, weights, manualOverrides, emailData, calendarData])

  // Sort and filter pipeline
  const filteredPipeline = useMemo(() => {
    let result = [...pipeline]

    if (filterType !== "all") {
      result = result.filter((item) => {
        if (dataMode === "csv") {
          return item.placement?.coverage === filterType
        }
        return item.policy?.policyType === filterType
      })
    }

    if (filterUrgency !== "all") {
      result = result.filter((item) => item.urgencyLevel === filterUrgency)
    }

    result.sort((a, b) => {
      if (sortBy === "priority") return b.priorityScore - a.priorityScore
      if (sortBy === "expiry") return a.daysUntilExpiry - b.daysUntilExpiry
      if (sortBy === "premium") {
        const aPremium = dataMode === "csv" ? a.placement?.totalPremium || 0 : a.factors.premiumAtRisk
        const bPremium = dataMode === "csv" ? b.placement?.totalPremium || 0 : b.factors.premiumAtRisk
        return bPremium - aPremium
      }
      return 0
    })

    return result
  }, [pipeline, filterType, filterUrgency, sortBy, dataMode])

  const uniqueTypes =
    dataMode === "csv"
      ? [...new Set(placements.map((p) => p.coverage).filter(Boolean))]
      : [...new Set(policies.map((p) => p.policyType).filter(Boolean))]

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-green-500/10 text-green-400 border-green-500/30"
    }
  }

  const handleOverrideSave = (id: string, score: number, reason: string) => {
    setManualOverrides((prev) => new Map(prev).set(id, { score, reason }))
    setOverrideModalItem(null)
  }

  function calculatePolicyScore(policy: Policy, daysUntilExpiry: number, w: PriorityWeights): number {
    const premiumValue = Number(policy.premium) / 1e18

    const premiumScore = Math.min(100, (premiumValue / 10) * 100)
    const timeScore = daysUntilExpiry <= 0 ? 100 : Math.max(0, 100 - daysUntilExpiry * 1.5)
    const renewalScore = Number(policy.renewalCount) > 0 ? 30 : 70

    const totalWeight = w.premiumAtRisk + w.timeToExpiry + w.churnLikelihood
    if (totalWeight === 0) return 50

    return Math.round(
      (premiumScore * w.premiumAtRisk + timeScore * w.timeToExpiry + renewalScore * w.churnLikelihood) / totalWeight,
    )
  }

  const stats = useMemo(() => {
    return {
      total: pipeline.length,
      critical: pipeline.filter((i) => i.urgencyLevel === "critical").length,
      totalPremium: pipeline.reduce((sum, i) => sum + i.factors.premiumAtRisk, 0),
      avgDaysToExpiry:
        pipeline.length > 0
          ? Math.round(pipeline.reduce((sum, i) => sum + i.daysUntilExpiry / 86400, 0) / pipeline.length)
          : 0,
    }
  }, [pipeline])


  if (policies.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl bg-card border border-border">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No policies found. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.days}
              onClick={() => setTimeWindow(tw.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${timeWindow === tw.days ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                }`}
            >
              {tw.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Added View on Etherscan link */}
        <a
          href={BLOCKCHAIN_CONTRACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
        >
          <Eye className="h-4 w-4" />
          View on Etherscan
          <ExternalLink className="h-3 w-3" />
        </a>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-secondary border-0 text-sm"
        >
          <option value="all">All Types</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-secondary border-0 text-sm"
        >
          <option value="all">All Urgency</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "priority" | "expiry" | "premium")}
          className="px-3 py-1.5 rounded-lg bg-secondary border-0 text-sm"
        >
          <option value="priority">Sort by Priority</option>
          <option value="expiry">Sort by Expiry</option>
          <option value="premium">Sort by Premium</option>
        </select>

        <button
          onClick={() => setShowWeights(!showWeights)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${showWeights ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <Settings2 className="h-4 w-4" />
          Weights
        </button>
      </div>

      {/* Weight Controls */}
      {showWeights && (
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Priority Weight Configuration</h3>
            <button
              onClick={() => setWeights(DEFAULT_WEIGHTS)}
              className="ml-auto text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80"
            >
              Reset to Default
            </button>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {(Object.keys(weights) as Array<keyof PriorityWeights>).map((key) => (
              <div key={key}>
                <label className="block text-sm text-muted-foreground mb-1">{WEIGHT_LABELS[key]}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[key] || 0}
                    onChange={(e) => setWeights({ ...weights, [key]: Number.parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{Math.round((weights[key] || 0) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4 text-center">
        <div className="p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Total Policies</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10">
          <p className="text-xs text-red-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Total Premium</p>
          <p className="text-2xl font-bold">{stats.totalPremium.toFixed(2)} ETH</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50">
          <p className="text-xs text-muted-foreground mb-1">Avg Days to Expiry</p>
          <p className="text-2xl font-bold">
            {stats.avgDaysToExpiry > 86400 ? Math.ceil(stats.avgDaysToExpiry / 86400) : stats.avgDaysToExpiry}
          </p>
        </div>
      </div>

      {/* Pipeline List */}
      <div className="space-y-3">
        {pipeline.length === 0 ? (
          <div className="text-center py-8 rounded-lg bg-card border border-border">
            <p className="text-muted-foreground">No policies expiring within the selected timeframe</p>
          </div>
        ) : (
          pipeline.map((item) => {
            const id = dataMode === "csv" ? item.placement?.placementId : item.policy?.policyHash
            const isExpanded = expandedItem === id
            const itemWithExtras = item as RenewalPipelineItem & {
              relatedEmails?: EmailData[]
              relatedCalendarEvents?: CalendarEvent[]
            }

            return (
              <div key={id} className="rounded-lg bg-card border border-border overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedItem(isExpanded ? null : id || null)}
                >
                  <div className="flex items-center gap-4">
                    {/* Priority Score */}
                    <div className="relative h-12 w-12 shrink-0">
                      <svg className="h-12 w-12 -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="currentColor"
                          className="text-secondary"
                          strokeWidth="4"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="currentColor"
                          className={
                            item.priorityScore >= 75
                              ? "text-red-400"
                              : item.priorityScore >= 50
                                ? "text-orange-400"
                                : item.priorityScore >= 25
                                  ? "text-yellow-400"
                                  : "text-green-400"
                          }
                          strokeWidth="4"
                          strokeDasharray={`${item.priorityScore * 1.256} 126`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                        {item.priorityScore}
                      </span>
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold truncate">
                          {dataMode === "csv" ? item.placement?.client : item.policy?.policyName}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getUrgencyColor(item.urgencyLevel)}`}
                        >
                          {item.urgencyLevel}
                        </span>
                        {item.manualOverride && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            Override
                          </span>
                        )}
                        {itemWithExtras.relatedEmails &&
                          itemWithExtras.relatedEmails.some((e) => e.sentiment === "negative") && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Attention
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {item.daysUntilExpiry <= 0
                            ? "Expired"
                            : `${Math.ceil(item.daysUntilExpiry > 86400 ? item.daysUntilExpiry / 86400 : item.daysUntilExpiry)} days`}
                        </span>
                        <span className="flex items-center gap-1">
                          {item.factors.premiumAtRisk.toFixed(4)} ETH
                        </span>
                        {dataMode === "csv" && item.placement?.coverage && <span>{item.placement.coverage}</span>}
                        {dataMode === "blockchain" && item.policy?.policyType && <span>{item.policy.policyType}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setBriefModalItem(item)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors"
                        title="Open Negotiation Coach"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-medium">Negotiation Coach</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOverrideModalItem(item)
                        }}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Override Score"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Factor Breakdown */}
                      <div>
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Info className="h-4 w-4" />
                          Priority Factors
                        </h5>
                        <div className="space-y-2">
                          {Object.entries(item.factors).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                              <span className="font-medium">
                                {key === "timeToExpiry" && typeof value === "number" && value > 86400
                                  ? Math.ceil(value / 86400).toFixed(2)
                                  : typeof value === "number"
                                    ? value.toFixed(2)
                                    : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Policy/Placement Details */}
                      <div>
                        <h5 className="text-sm font-medium mb-2">Details</h5>
                        <div className="space-y-2 text-sm">
                          {dataMode === "blockchain" && item.policy && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Policy Hash</span>
                                <span className="font-mono text-xs">{item.policy.policyHash.slice(0, 16)}...</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Customer</span>
                                <span className="font-mono text-xs">{item.policy.customer.slice(0, 10)}...</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Renewal Count</span>
                                <span>{Number(item.policy.renewalCount)}</span>
                              </div>
                            </>
                          )}
                          {dataMode === "csv" && item.placement && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Placement ID</span>
                                <span>{item.placement.placementId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span>{item.placement.placementStatus}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Carrier</span>
                                <span>{item.placement.carrierGroup}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.manualOverride && (
                      <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <div className="flex items-center gap-2 text-purple-400 text-sm">
                          <Edit3 className="h-4 w-4" />
                          <span className="font-medium">Manual Override Applied</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Score: {item.manualOverride.score} - {item.manualOverride.reason}
                        </p>
                      </div>
                    )}

                    {/* Additional Details */}
                    <div className="grid grid-cols-4 gap-2 text-xs mt-4">
                      <div>
                        <p className="text-muted-foreground">Premium at Risk</p>
                        <p className="font-semibold text-lg">{item.factors.premiumAtRisk.toFixed(2)} ETH</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Days to Expiry</p>
                        <p className="font-semibold text-lg">
                          {typeof item.factors.timeToExpiry === "number" && item.factors.timeToExpiry > 86400
                            ? Math.ceil(item.factors.timeToExpiry / 86400)
                            : item.factors.timeToExpiry}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Renewal Count</p>
                        <p className="font-semibold text-lg">{item.policy?.renewalCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-semibold text-lg capitalize">
                          {item.policy?.status === 1 ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      {briefModalItem && (
        <RenewalBriefModal
          item={briefModalItem}
          dataMode={dataMode}
          emailData={emailData}
          calendarData={calendarData}
          onClose={() => setBriefModalItem(null)}
        />
      )}

      {overrideModalItem && (
        <ScoreOverrideModal
          item={overrideModalItem}

          onSave={(score, reason) => {
            if (overrideModalItem) {
              const id = dataMode === "csv" ? overrideModalItem.placement?.placementId : overrideModalItem.policy?.policyHash
              if (id) handleOverrideSave(id, score, reason)
            }
          }}
          onClose={() => setOverrideModalItem(null)}
        />
      )}
    </div>
  )
}
