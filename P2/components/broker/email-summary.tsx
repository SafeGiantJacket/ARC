"use client"

import { useMemo, useState } from "react"
import { Mail, TrendingUp, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { InsurancePlacement, EmailData } from "@/lib/types"

interface EmailSummaryProps {
  placements: InsurancePlacement[]
  emailData: EmailData[]
}

export function EmailSummary({ placements, emailData }: EmailSummaryProps) {
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null)

  const analysis = useMemo(() => {
    if (emailData.length === 0) {
      return {
        totalEmails: 0,
        sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
        avgEngagement: 0,
        riskPlacements: [] as Array<{ name: string; sentiment: string; score: number }>,
        positiveOpportunities: [] as Array<{ name: string; score: number }>,
        recentEmails: [] as EmailData[],
      }
    }

    const sentimentBreakdown = {
      positive: emailData.filter((e) => e.sentiment === "positive").length,
      neutral: emailData.filter((e) => e.sentiment === "neutral").length,
      negative: emailData.filter((e) => e.sentiment === "negative").length,
    }

    const avgThreads = emailData.reduce((sum, e) => sum + (e.threadCount || 0), 0) / emailData.length

    const placementEmails = placements
      .map((p) => {
        const emails = emailData.filter(
          (e) =>
            e.senderEmail?.toLowerCase().includes(p.clientName?.toLowerCase() || "") ||
            e.clientName?.toLowerCase().includes(p.client?.toLowerCase() || ""),
        )
        const negCount = emails.filter((e) => e.sentiment === "negative").length
        const score = emails.length > 0 ? 100 - (negCount / emails.length) * 100 : 50

        return {
          name: p.clientName || p.client,
          sentiment:
            negCount > emails.length * 0.3 ? "negative" : emails.length > 0 && negCount === 0 ? "positive" : "neutral",
          score: Math.round(score),
          emailCount: emails.length,
        }
      })
      .sort((a, b) => a.score - b.score)

    const recentEmails = [...emailData]
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, 5)

    return {
      totalEmails: emailData.length,
      sentimentBreakdown,
      avgEngagement: Math.round(avgThreads),
      riskPlacements: placementEmails.filter((p) => p.sentiment === "negative").slice(0, 3),
      positiveOpportunities: placementEmails.filter((p) => p.sentiment === "positive").slice(0, 3),
      recentEmails,
    }
  }, [emailData, placements])

  const sentimentPercentage = {
    positive: Math.round((analysis.sentimentBreakdown.positive / (analysis.totalEmails || 1)) * 100) || 0,
    neutral: Math.round((analysis.sentimentBreakdown.neutral / (analysis.totalEmails || 1)) * 100) || 0,
    negative: Math.round((analysis.sentimentBreakdown.negative / (analysis.totalEmails || 1)) * 100) || 0,
  }

  const sentimentBadgeColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 text-green-700 dark:text-green-300"
      case "negative":
        return "bg-red-500/20 text-red-700 dark:text-red-300"
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Emails</p>
              <p className="text-3xl font-bold">{analysis.totalEmails}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-500/30" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Engagement</p>
              <p className="text-3xl font-bold">{analysis.avgEngagement}</p>
              <p className="text-xs text-muted-foreground">threads per email</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500/30" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Sentiment Distribution</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs">Positive</span>
                <span className="text-sm font-medium text-green-600">{sentimentPercentage.positive}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${sentimentPercentage.positive}%` }} />
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-xs">Neutral</span>
                <span className="text-sm font-medium text-gray-600">{sentimentPercentage.neutral}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gray-400" style={{ width: `${sentimentPercentage.neutral}%` }} />
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-xs">Negative</span>
                <span className="text-sm font-medium text-red-600">{sentimentPercentage.negative}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${sentimentPercentage.negative}%` }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Email Threads */}
      {analysis.recentEmails.length > 0 && (
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Recent Email Threads</h3>
            <Badge variant="secondary">{analysis.recentEmails.length}</Badge>
          </div>
          <div className="space-y-2">
            {analysis.recentEmails.map((email) => (
              <button
                key={email.emailId}
                onClick={() => setExpandedThreadId(expandedThreadId === email.emailId ? null : email.emailId)}
                className="w-full p-3 bg-secondary/50 hover:bg-secondary rounded-lg text-left transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{email.subject}</p>
                      <Badge className={`text-xs flex-shrink-0 ${sentimentBadgeColor(email.sentiment)}`}>
                        {email.sentiment}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{email.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(email.receivedAt).toLocaleDateString()} • {email.threadCount} message
                      {email.threadCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {expandedThreadId === email.emailId && (
                  <div className="mt-3 p-3 bg-background rounded border border-border">
                    <p className="text-sm mb-2">{email.summary}</p>
                    <a
                      href={email.sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      View in email client →
                    </a>
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Risk Placements */}
      {analysis.riskPlacements.length > 0 && (
        <Card className="p-4 bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-700 dark:text-red-400">At-Risk Placements</h3>
          </div>
          <div className="space-y-2">
            {analysis.riskPlacements.map((placement, idx) => (
              <div key={idx} className="p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-300">{placement.name}</p>
                    <p className="text-xs text-red-800/70 dark:text-red-400/70">Negative communication trend</p>
                  </div>
                  <Badge variant="destructive">Score: {placement.score}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Positive Opportunities */}
      {analysis.positiveOpportunities.length > 0 && (
        <Card className="p-4 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Positive Opportunities</h3>
          </div>
          <div className="space-y-2">
            {analysis.positiveOpportunities.map((placement, idx) => (
              <div key={idx} className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-emerald-900 dark:text-emerald-300">{placement.name}</p>
                    <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70">Strong client satisfaction</p>
                  </div>
                  <Badge className="bg-emerald-600">Score: {placement.score}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysis.totalEmails === 0 && (
        <Card className="p-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground">No email data available. Upload email CSV to see analysis.</p>
        </Card>
      )}
    </div>
  )
}
