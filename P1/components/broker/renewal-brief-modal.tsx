"use client"

import { useState } from "react"
import type { RenewalPipelineItem, RenewalBrief, DataMode } from "@/lib/types"
import { formatEther } from "@/lib/web3-utils"
import { getConnectorInsights } from "@/lib/connector-data"
import {
  X,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Database,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Mail,
  Calendar,
} from "lucide-react"

interface RenewalBriefModalProps {
  item: RenewalPipelineItem
  dataMode: DataMode
  onClose: () => void
}

export function RenewalBriefModal({ item, dataMode, onClose }: RenewalBriefModalProps) {
  const [brief, setBrief] = useState<RenewalBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const getName = () => item.placement?.client || item.policy?.policyName || "Unknown"
  const getType = () => item.placement?.productLine || item.policy?.policyType || "General"
  const getPremium = () => {
    if (item.placement) return `$${item.placement.totalPremium?.toLocaleString()}`
    if (item.policy) return `${formatEther(item.policy.premium)} ETH`
    return "N/A"
  }

  const generateBrief = async () => {
    setLoading(true)
    setError(null)

    try {
      const requestBody: Record<string, unknown> = { dataMode }

      const policyId = item.placement?.placementId || item.policy?.policyHash || ""
      const connectorInsights = getConnectorInsights(policyId)

      if (dataMode === "csv" && item.placement) {
        requestBody.placement = item.placement
        requestBody.connectorInsights = connectorInsights
      } else if (item.policy) {
        requestBody.policyData = {
          policyName: item.policy.policyName,
          policyType: item.policy.policyType,
          coverageAmount: formatEther(item.policy.coverageAmount),
          premium: formatEther(item.policy.premium),
          daysUntilExpiry: item.daysUntilExpiry,
          renewalCount: item.policy.renewalCount.toString(),
          status: item.policy.status,
          notes: item.policy.notes,
        }
        requestBody.connectorInsights = connectorInsights
      }

      const response = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate brief")
      }

      setBrief({
        policyHash: policyId,
        ...data.brief,
        generatedAt: new Date(data.brief.generatedAt),
      })
    } catch (err) {
      console.error("[v0] Brief generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate brief")
    } finally {
      setLoading(false)
    }
  }

  const copyBrief = () => {
    if (!brief) return

    const text = `
RENEWAL BRIEF: ${getName()}
Generated: ${brief.generatedAt.toLocaleString()}

SUMMARY:
${brief.summary}

KEY INSIGHTS:
${brief.keyInsights.map((i) => `• ${i.text} (Source: ${i.source})`).join("\n")}

SUGGESTED ACTIONS:
${brief.suggestedActions.map((a) => `• [${a.priority.toUpperCase()}] ${a.action} - ${a.reason}`).join("\n")}

RISK FACTORS:
${brief.riskFactors.map((r) => `• ${r}`).join("\n")}
    `.trim()

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "blockchain":
        return <Database className="h-3 w-3" />
      case "email":
        return <Mail className="h-3 w-3" />
      case "calendar":
        return <Calendar className="h-3 w-3" />
      case "csv":
      case "crm":
        return <FileSpreadsheet className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/20"
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
      default:
        return "text-blue-400 bg-blue-500/10 border-blue-500/20"
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">One-Page Renewal Brief</h2>
              <p className="text-sm text-muted-foreground">{getName()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">
                {dataMode === "csv" ? "Product Line" : "Policy Type"}
              </p>
              <p className="font-medium">{getType()}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Premium</p>
              <p className="font-medium">{getPremium()}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Days to Expiry</p>
              <p className="font-medium">{item.daysUntilExpiry} days</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground mb-1">Priority Score</p>
              <p className="font-medium">{item.priorityScore}/100</p>
            </div>
          </div>

          {/* Additional Info for CSV */}
          {dataMode === "csv" && item.placement && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Carrier</p>
                <p className="font-medium">{item.placement.carrierGroup}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Specialist</p>
                <p className="font-medium">{item.placement.placementSpecialist}</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="font-medium">{item.placement.placementStatus}</p>
              </div>
            </div>
          )}

          {/* Data Sources */}
          <div className="p-4 rounded-xl bg-card border border-border/60">
            <p className="text-sm font-semibold mb-3 text-foreground">Data Sources for This Brief</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/pipeline?dataMode=${dataMode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm font-medium hover:shadow-md transition-shadow cursor-pointer dark:text-blue-300 dark:hover:bg-blue-500/20 text-blue-700"
              >
                {dataMode === "csv" ? (
                  <>
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV/CRM Data
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Blockchain Data
                  </>
                )}
              </a>
              <a
                href="/pipeline?source=email"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm font-medium hover:shadow-md transition-shadow cursor-pointer dark:text-amber-300 dark:hover:bg-amber-500/20 text-amber-700"
              >
                <Mail className="h-4 w-4" />
                Email Insights
              </a>
              <a
                href="/pipeline?source=calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-sm font-medium hover:shadow-md transition-shadow cursor-pointer dark:text-violet-300 dark:hover:bg-violet-500/20 text-violet-700"
              >
                <Calendar className="h-4 w-4" />
                Calendar Data
              </a>
            </div>
          </div>

          {/* Generate Button or Brief Content */}
          {!brief && !loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate AI-Powered Brief</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create a comprehensive one-page summary with key insights, suggested actions, and risk factors based on
                {dataMode === "csv" ? " CRM/CSV placement data" : " blockchain policy data"}.
              </p>
              <button
                onClick={generateBrief}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="h-5 w-5" />
                Generate Renewal Brief
              </button>
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                  <button
                    onClick={generateBrief}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">Analyzing data and generating brief with Groq AI...</p>
              <p className="text-xs text-muted-foreground mt-2">This may take a few seconds...</p>
            </div>
          )}

          {brief && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold text-foreground">Executive Summary</h3>
                </div>
                <p className="text-foreground/90 leading-relaxed text-sm">{brief.summary}</p>
              </div>

              {/* Key Insights */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Key Insights
                </h3>
                <div className="space-y-2">
                  {brief.keyInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                      <div className="mt-0.5">{getSourceIcon(insight.sourceType)}</div>
                      <div className="flex-1">
                        <p className="text-foreground">{insight.text}</p>
                        <p className="text-xs mt-1 flex items-center gap-1 dark:text-muted-foreground text-gray-700">
                          Source: {insight.source}
                          {insight.link && (
                            <a
                              href={insight.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Actions */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Suggested Next Actions
                </h3>
                <div className="space-y-2">
                  {brief.suggestedActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(action.priority)}`}
                      >
                        {action.priority.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{action.action}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{action.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Risk Factors
                </h3>
                <div className="flex flex-wrap gap-2">
                  {brief.riskFactors.map((risk, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-sm border border-yellow-500/20"
                    >
                      {risk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">Generated: {brief.generatedAt.toLocaleString()}</p>
                <button
                  onClick={copyBrief}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Brief"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
