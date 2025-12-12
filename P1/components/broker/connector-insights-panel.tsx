"use client"

import type { InsurancePlacement, EmailData, CalendarEvent } from "@/lib/types"
import { generateConnectorInsights } from "@/lib/email-calendar-analysis"
import { BarChart3, Mail, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ConnectorInsightsPanelProps {
  placement: InsurancePlacement
  emailData: EmailData[]
  calendarData: CalendarEvent[]
}

export function ConnectorInsightsPanel({ placement, emailData, calendarData }: ConnectorInsightsPanelProps) {
  const insights = generateConnectorInsights(emailData, calendarData, placement)

  const sentimentColor = {
    very_positive: "bg-green-100 text-green-800",
    positive: "bg-emerald-100 text-emerald-800",
    neutral: "bg-gray-100 text-gray-800",
    negative: "bg-orange-100 text-orange-800",
    very_negative: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 size={20} />
              Email & Calendar Analysis
            </span>
            <Badge className={sentimentColor[insights.overallSentiment]}>
              {insights.overallSentiment.replace("_", " ")}
            </Badge>
          </CardTitle>
          <CardDescription>Integrated insights from communication and calendar data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Combined Score */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Combined Score</p>
                <p className="text-3xl font-bold">{insights.combinedScore}/100</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Communication Gap</p>
                <p className="text-2xl font-semibold">{insights.communicationGap} days</p>
              </div>
            </div>
          </div>

          {/* Email Analysis */}
          {insights.emailAnalysis && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail size={18} className="text-blue-600" />
                <h4 className="font-semibold">Email Analysis</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email Score</span>
                  <span className="font-semibold">{insights.emailAnalysis.emailScore}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Engagement</span>
                  <Badge variant="outline">{insights.emailAnalysis.engagementLevel}</Badge>
                </div>
                {insights.emailAnalysis.keyInsights.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold mb-2">Key Insights</p>
                    <ul className="space-y-1">
                      {insights.emailAnalysis.keyInsights.map((insight, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Analysis */}
          {insights.calendarAnalysis && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={18} className="text-emerald-600" />
                <h4 className="font-semibold">Calendar Analysis</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Calendar Score</span>
                  <span className="font-semibold">{insights.calendarAnalysis.calendarScore}/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Next Meeting</span>
                  <span className="font-semibold">{insights.calendarAnalysis.daysToNextMeeting} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meeting Importance</span>
                  <Badge variant="outline">{insights.calendarAnalysis.meetingImportance}</Badge>
                </div>
                {insights.nextMeetingDate && (
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    Scheduled: {new Date(insights.nextMeetingDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {insights.riskFactors.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-orange-600" />
                <h4 className="font-semibold">Risk Factors</h4>
              </div>
              <ul className="space-y-1">
                {insights.riskFactors.map((factor, i) => (
                  <li key={i} className="text-sm text-orange-800 flex items-center gap-2">
                    <span className="w-1 h-1 bg-orange-600 rounded-full" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions */}
          {insights.recommendedActions.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h4 className="font-semibold">Recommended Actions</h4>
              </div>
              <ul className="space-y-2">
                {insights.recommendedActions.map((action, i) => (
                  <li key={i} className="text-sm text-emerald-800">
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
