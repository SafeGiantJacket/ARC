"use client"

import type React from "react"
import { useState, useMemo } from "react"
import type {
  Policy,
  InsurancePlacement,
  DataMode,
  PriorityWeights,
  RenewalPipelineItem,
  EmailData,
  CalendarEvent,
} from "@/lib/types"
import { formatEther } from "@/lib/web3-utils"
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Settings2,
  Info,
  Gauge,
  FileText,
  Edit3,
  Mail,
  Zap,
} from "lucide-react"
import { RenewalBriefModal } from "./renewal-brief-modal"
import { ScoreOverrideModal } from "./score-override-modal"

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
]

const DEFAULT_WEIGHTS: PriorityWeights = {
  premiumAtRisk: 0.25,
  timeToExpiry: 0.25,
  claimsHistory: 0.15,
  carrierResponsiveness: 0.2,
  churnLikelihood: 0.15,
}

const WEIGHT_LABELS: Record<keyof PriorityWeights, string> = {
  premiumAtRisk: "Premium at Risk",
  timeToExpiry: "Time to Expiry",
  claimsHistory: "Claims History",
  carrierResponsiveness: "Carrier Response",
  churnLikelihood: "Churn Risk",
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
  const [timeWindow, setTimeWindow] = useState(180)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterUrgency, setFilterUrgency] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"priority" | "expiry" | "premium">("priority")
  const [showWeights, setShowWeights] = useState(false)
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_WEIGHTS)
  const [briefModalItem, setBriefModalItem] = useState<RenewalPipelineItem | null>(null)
  const [overrideModalItem, setOverrideModalItem] = useState<RenewalPipelineItem | null>(null)
  const [manualOverrides, setManualOverrides] = useState<Map<string, { score: number; reason: string }>>(new Map())

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
      const now = Math.floor(Date.now() / 1000)
      return policies
        .filter((p) => {
          const expiryTime = Number(p.startTime) + Number(p.duration)
          const daysLeft = Math.ceil((expiryTime - now) / (24 * 60 * 60))
          return daysLeft <= timeWindow && daysLeft > -30
        })
        .map((policy) => {
          const expiryTime = Number(policy.startTime) + Number(policy.duration)
          const daysUntilExpiry = Math.ceil((expiryTime - now) / (24 * 60 * 60))
          const premiumValue = Number(policy.premium) / 1e18

          const override = manualOverrides.get(policy.policyHash)
          const baseScore = override?.score ?? calculatePolicyScore(policy, daysUntilExpiry, weights)
          const urgencyLevel =
            baseScore >= 75 ? "critical" : baseScore >= 50 ? "high" : baseScore >= 25 ? "medium" : "low"

          return {
            policy,
            daysUntilExpiry,
            priorityScore: baseScore,
            urgencyLevel,
            factors: {
              premiumAtRisk: premiumValue,
              timeToExpiry: daysUntilExpiry,
              claimsHistory: 0,
              carrierResponsiveness: 50,
              churnLikelihood: 30,
            },
            source: { type: "blockchain" as const, id: policy.policyHash },
            manualOverride: override,
          } as RenewalPipelineItem
        })
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

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.days}
              onClick={() => setTimeWindow(tw.days)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeWindow === tw.days ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showWeights ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
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
                    value={weights[key]}
                    onChange={(e) => setWeights({ ...weights, [key]: Number.parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{Math.round(weights[key] * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">In Pipeline</span>
          </div>
          <p className="text-2xl font-bold">{filteredPipeline.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Critical</span>
          </div>
          <p className="text-2xl font-bold">{filteredPipeline.filter((i) => i.urgencyLevel === "critical").length}</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Premium at Risk</span>
          </div>
          <p className="text-2xl font-bold">
            {dataMode === "csv"
              ? `$${(filteredPipeline.reduce((sum, i) => sum + (i.placement?.totalPremium || 0), 0) / 1000000).toFixed(1)}M`
              : `${filteredPipeline.reduce((sum, i) => sum + i.factors.premiumAtRisk, 0).toFixed(2)} ETH`}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Avg Days to Expiry</span>
          </div>
          <p className="text-2xl font-bold">
            {filteredPipeline.length > 0
              ? Math.round(filteredPipeline.reduce((sum, i) => sum + i.daysUntilExpiry, 0) / filteredPipeline.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Pipeline List */}
      <div className="space-y-3">
        {filteredPipeline.map((item) => {
          const id = dataMode === "csv" ? item.placement?.placementId : item.policy?.policyHash
          const isExpanded = expandedItem === id
          const itemWithExtras = item as RenewalPipelineItem & {
            relatedEmails?: EmailData[]
            relatedCalendarEvents?: CalendarEvent[]
          }

          return (
            <div key={id} className="rounded-xl bg-card border border-border overflow-hidden">
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
                    <div className="flex items-center gap-2">
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
                      {item.placement?.hasMultipleQuotes && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {item.placement?.carrierVariants?.length || 0} Quotes
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{dataMode === "csv" ? item.placement?.coverage : item.policy?.policyType}</span>
                      <span>•</span>
                      <span className={item.daysUntilExpiry <= 30 ? "text-red-400" : ""}>
                        {item.daysUntilExpiry <= 0 ? "Expired" : `${item.daysUntilExpiry} days`}
                      </span>
                      <span>•</span>
                      <span>
                        {dataMode === "csv"
                          ? `$${item.placement?.totalPremium?.toLocaleString()}`
                          : `${item.factors.premiumAtRisk.toFixed(4)} ETH`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setBriefModalItem(item)
                      }}
                      className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Generate AI Brief"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOverrideModalItem(item)
                      }}
                      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      title="Override Score"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="pt-4 grid md:grid-cols-2 gap-4">
                    {/* Score Breakdown */}
                    <div>
                      <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Score Breakdown
                      </h5>
                      {item.scoreBreakdown ? (
                        <div className="space-y-2">
                          {item.scoreBreakdown.factors.map((factor, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="flex justify-between text-sm">
                                  <span>{factor.name}</span>
                                  <span className="font-medium">
                                    {factor.score}/{factor.maxScore}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-secondary rounded-full mt-1">
                                  <div
                                    className={`h-full rounded-full ${
                                      factor.impact === "positive"
                                        ? "bg-green-400"
                                        : factor.impact === "negative"
                                          ? "bg-red-400"
                                          : "bg-yellow-400"
                                    }`}
                                    style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Premium at Risk</span>
                            <span>
                              {dataMode === "csv"
                                ? `$${item.factors.premiumAtRisk.toLocaleString()}`
                                : `${item.factors.premiumAtRisk.toFixed(4)} ETH`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time to Expiry</span>
                            <span>{item.daysUntilExpiry} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Churn Likelihood</span>
                            <span>{item.factors.churnLikelihood}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Details
                      </h5>
                      <div className="space-y-2 text-sm">
                        {dataMode === "csv" && item.placement && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Placement ID</span>
                              <span className="font-mono">{item.placement.placementId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Carrier</span>
                              <span>{item.placement.carrierGroup}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status</span>
                              <span>{item.placement.placementStatus}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Specialist</span>
                              <span>{item.placement.placementSpecialist}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Incumbent</span>
                              <span>{item.placement.incumbentIndicator === "Y" ? "Yes" : "No"}</span>
                            </div>
                            {item.placement.hasMultipleQuotes && item.placement.carrierVariants && (
                              <div className="mt-4 pt-4 border-t border-border">
                                <p className="text-sm font-semibold mb-3">
                                  Carrier Quotes ({item.placement.carrierVariants.length})
                                </p>
                                <div className="space-y-2">
                                  {item.placement.carrierVariants.map((variant, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-sm bg-secondary/30 rounded p-2"
                                    >
                                      <span className="font-mono text-xs">{variant.carrierGroup}</span>
                                      <div className="flex gap-3 text-muted-foreground">
                                        <span>${variant.totalPremium.toLocaleString()}</span>
                                        <span className="text-green-400">
                                          +${variant.commissionAmount.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {dataMode === "blockchain" && item.policy && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Policy Hash</span>
                              <span className="font-mono text-xs">{item.policy.policyHash?.slice(0, 16)}...</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Customer</span>
                              <span className="font-mono text-xs">{item.policy.customer?.slice(0, 10)}...</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Renewals</span>
                              <span>{Number(item.policy.renewalCount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Coverage</span>
                              <span>{formatEther(item.policy.coverageAmount)} ETH</span>
                            </div>
                          </>
                        )}
                      </div>

                      {dataMode === "csv" &&
                        itemWithExtras.relatedEmails &&
                        itemWithExtras.relatedEmails.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Mail className="h-4 w-4 text-orange-400" />
                              Related Emails ({itemWithExtras.relatedEmails.length})
                            </h5>
                            <div className="space-y-1">
                              {itemWithExtras.relatedEmails.slice(0, 2).map((email) => (
                                <div
                                  key={email.emailId}
                                  className="text-xs p-2 rounded bg-secondary/50 flex items-center gap-2"
                                >
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      email.sentiment === "negative"
                                        ? "bg-red-500/20 text-red-400"
                                        : email.sentiment === "positive"
                                          ? "bg-green-500/20 text-green-400"
                                          : "bg-yellow-500/20 text-yellow-400"
                                    }`}
                                  >
                                    {email.sentiment}
                                  </span>
                                  <span className="truncate flex-1">{email.subject}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {dataMode === "csv" &&
                        itemWithExtras.relatedCalendarEvents &&
                        itemWithExtras.relatedCalendarEvents.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-purple-400" />
                              Upcoming Meetings ({itemWithExtras.relatedCalendarEvents.length})
                            </h5>
                            <div className="space-y-1">
                              {itemWithExtras.relatedCalendarEvents.slice(0, 2).map((event) => (
                                <div key={event.eventId} className="text-xs p-2 rounded bg-secondary/50">
                                  <span className="font-medium">{event.title}</span>
                                  <span className="text-muted-foreground ml-2">{event.meetingDate}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredPipeline.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No renewals found in the selected time window</p>
            <p className="text-sm mt-1">Try expanding the time window or loading data</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {briefModalItem && (
        <RenewalBriefModal item={briefModalItem} dataMode={dataMode} onClose={() => setBriefModalItem(null)} />
      )}

      {overrideModalItem && (
        <ScoreOverrideModal
          item={overrideModalItem}
          dataMode={dataMode}
          currentOverride={manualOverrides.get(
            dataMode === "csv"
              ? overrideModalItem.placement?.placementId || ""
              : overrideModalItem.policy?.policyHash || "",
          )}
          onSave={(score, reason) => {
            const id =
              dataMode === "csv" ? overrideModalItem.placement?.placementId : overrideModalItem.policy?.policyHash
            if (id) handleOverrideSave(id, score, reason)
          }}
          onClose={() => setOverrideModalItem(null)}
        />
      )}
    </div>
  )
}
