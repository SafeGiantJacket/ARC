"use client"

import { useState, useMemo } from "react"
import { Calendar, Clock, AlertCircle, TrendingUp, CheckCircle2, Mail, Phone, FileText, Zap } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { InsurancePlacement, EmailData, CalendarEvent } from "@/lib/types"
import { generateAICalendarPlan } from "@/lib/ai-calendar-planner"

interface AISmartSchedulerProps {
  placements: InsurancePlacement[]
  emailData: EmailData[]
  calendarData: CalendarEvent[]
}

export function AISmartScheduler({ placements, emailData, calendarData }: AISmartSchedulerProps) {
  const [selectedPriority, setSelectedPriority] = useState<"all" | "critical" | "high" | "medium" | "low">("all")
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const aiPlan = useMemo(
    () => generateAICalendarPlan(placements, emailData, calendarData),
    [placements, emailData, calendarData],
  )

  const filteredSchedule = useMemo(() => {
    return selectedPriority === "all"
      ? aiPlan.brokerSchedule
      : aiPlan.brokerSchedule.filter((item) => item.priority === selectedPriority)
  }, [aiPlan.brokerSchedule, selectedPriority])

  const groupedByDate = useMemo(() => {
    const grouped: Record<string, typeof aiPlan.brokerSchedule> = {}
    filteredSchedule.forEach((item) => {
      if (!grouped[item.date]) {
        grouped[item.date] = []
      }
      grouped[item.date].push(item)
    })
    return Object.entries(grouped).sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
  }, [filteredSchedule])

  const priorityColors = {
    critical: "border-l-red-500 bg-red-500/5",
    high: "border-l-orange-500 bg-orange-500/5",
    medium: "border-l-yellow-500 bg-yellow-500/5",
    low: "border-l-blue-500 bg-blue-500/5",
  }

  const priorityBadgeColors = {
    critical: "bg-red-500/20 text-red-700 dark:text-red-300",
    high: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
    low: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  }

  const actionTypeIcons = {
    meeting: <Phone className="h-4 w-4" />,
    followup: <Mail className="h-4 w-4" />,
    proposal: <FileText className="h-4 w-4" />,
    documentation: <FileText className="h-4 w-4" />,
    decision: <CheckCircle2 className="h-4 w-4" />,
  }

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateStr === today.toISOString().split("T")[0]) return "Today"
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  if (placements.length === 0 || (emailData.length === 0 && calendarData.length === 0)) {
    return (
      <Card className="p-8 text-center">
        <Zap className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-muted-foreground">Load placements and email/calendar data to generate AI schedule</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-red-500">
          <p className="text-xs text-muted-foreground">Critical Actions</p>
          <p className="text-2xl font-bold text-red-600">
            {aiPlan.brokerSchedule.filter((item) => item.priority === "critical").length}
          </p>
        </Card>
        <Card className="p-3 border-l-4 border-l-orange-500">
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold text-orange-600">
            {
              aiPlan.brokerSchedule.filter((item) => {
                const itemDate = new Date(item.date)
                const today = new Date()
                const weekFromNow = new Date(today)
                weekFromNow.setDate(weekFromNow.getDate() + 7)
                return itemDate >= today && itemDate <= weekFromNow
              }).length
            }
          </p>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <p className="text-xs text-muted-foreground">Risk Areas</p>
          <p className="text-2xl font-bold text-amber-600">{aiPlan.riskAreas.length}</p>
        </Card>
        <Card className="p-3 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground">Action Items</p>
          <p className="text-2xl font-bold text-emerald-600">{aiPlan.recommendedActions.length}</p>
        </Card>
      </div>

      {/* Daily Focus */}
      {aiPlan.dailyFocus.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm mb-2">Today's Focus</h3>
              <ul className="space-y-1">
                {aiPlan.dailyFocus.map((focus, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    • {focus}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Risk Alerts */}
      {aiPlan.riskAreas.length > 0 && (
        <Card className="p-4 bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-700 dark:text-red-400">Risk Areas - Immediate Attention</h3>
          </div>
          <div className="space-y-2">
            {aiPlan.riskAreas.slice(0, 3).map((risk, idx) => (
              <div key={idx} className="p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-red-900 dark:text-red-300">{risk.clientName}</p>
                    <p className="text-xs text-red-800/70 dark:text-red-400/70 mt-1">{risk.message}</p>
                    <p className="text-xs text-red-700/60 dark:text-red-400/60 mt-2 italic">
                      → {risk.recommendedAction}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-xs flex-shrink-0">
                    {risk.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Priority Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "critical", "high", "medium", "low"] as const).map((priority) => (
          <button
            key={priority}
            onClick={() => setSelectedPriority(priority)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPriority === priority
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </button>
        ))}
      </div>

      {/* AI Schedule by Date */}
      <div className="space-y-3">
        {groupedByDate.length > 0 ? (
          groupedByDate.map(([date, items]) => (
            <div key={date}>
              <button
                onClick={() => setExpandedDay(expandedDay === date ? null : date)}
                className="w-full p-3 bg-secondary hover:bg-secondary/80 rounded-lg text-left transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{getDateLabel(date)}</span>
                  <Badge variant="secondary" className="ml-2">
                    {items.length} item{items.length > 1 ? "s" : ""}
                  </Badge>
                </div>
                <span className="text-muted-foreground">{expandedDay === date ? "−" : "+"}</span>
              </button>

              {expandedDay === date && (
                <div className="mt-2 space-y-2 ml-2">
                  {items.map((item, idx) => (
                    <Card key={idx} className={`border-l-4 p-4 ${priorityColors[item.priority]}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1.5">
                              {actionTypeIcons[item.actionType]}
                              <span className="text-sm font-semibold">{item.clientName}</span>
                            </div>
                            <Badge className={`text-xs ${priorityBadgeColors[item.priority]}`}>{item.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{item.actionType.toUpperCase()}</p>
                          <p className="text-sm mb-2">{item.expectedOutcome}</p>

                          {item.prepTasks.length > 0 && (
                            <div className="bg-background/50 rounded p-2 mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Prep Tasks:</p>
                              <ul className="text-xs space-y-0.5">
                                {item.prepTasks.map((task, taskIdx) => (
                                  <li key={taskIdx}>• {task}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{item.estimatedDuration} min</span>
                            </div>
                            {item.time && <span>{item.time}</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <Card className="p-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">No scheduled actions for selected priority level</p>
          </Card>
        )}
      </div>

      {/* Recommended Actions */}
      {aiPlan.recommendedActions.length > 0 && (
        <Card className="p-4 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">AI-Recommended Actions</h3>
          </div>
          <div className="space-y-2">
            {aiPlan.recommendedActions.map((item, idx) => (
              <div key={idx} className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">Target: {item.targetDate}</p>
                    <p className="text-xs text-muted-foreground">Est. time: {item.estimatedTime} min</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${priorityBadgeColors[item.priority]}`}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Priority Matrix */}
      <Card className="p-4 border-l-4 border-l-purple-500">
        <h3 className="font-semibold mb-3 text-sm">Renewal Priority Matrix</h3>
        <div className="space-y-2">
          {aiPlan.priorityMatrix.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.clientName}</p>
                <p className="text-xs text-muted-foreground">{item.reason}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-purple-600">{item.score}</p>
                <Badge className={`text-xs ${priorityBadgeColors[item.priority]}`}>{item.priority}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
