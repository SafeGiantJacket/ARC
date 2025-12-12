"use client"

import { useState } from "react"
import type { InsurancePlacement, EmailData, CalendarEvent } from "@/lib/types"
import { generateAICalendarPlan } from "@/lib/ai-calendar-planner"
import { Calendar, AlertTriangle, CheckCircle2, AlertCircle, Zap, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AICalendarPlannerProps {
  placements: InsurancePlacement[]
  emailData: EmailData[]
  calendarData: CalendarEvent[]
}

export function AICalendarPlanner({ placements, emailData, calendarData }: AICalendarPlannerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const plan = generateAICalendarPlan(placements, emailData, calendarData)

  const criticalCount = plan.priorityMatrix.filter((p) => p.priority === "critical").length
  const highCount = plan.priorityMatrix.filter((p) => p.priority === "high").length
  const criticalRisks = plan.riskAreas.filter((r) => r.severity === "critical").length

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Critical Renewals</p>
                <p className="text-2xl font-bold">{criticalCount}</p>
              </div>
              <AlertTriangle className="text-red-500 opacity-60" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Risk Areas</p>
                <p className="text-2xl font-bold">{criticalRisks}</p>
              </div>
              <AlertCircle className="text-orange-500 opacity-60" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Actions</p>
                <p className="text-2xl font-bold">{plan.brokerSchedule.length}</p>
              </div>
              <Calendar className="text-blue-500 opacity-60" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Daily Focus Items</p>
                <p className="text-2xl font-bold">{plan.dailyFocus.length}</p>
              </div>
              <Zap className="text-emerald-500 opacity-60" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="priority">Priority Matrix</TabsTrigger>
          <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
          <TabsTrigger value="focus">Daily Focus</TabsTrigger>
        </TabsList>

        {/* Broker Schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Optimized Broker Schedule</CardTitle>
              <CardDescription>Intelligent scheduling based on urgency, impact, and sentiment analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.brokerSchedule.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No scheduled actions required</p>
                ) : (
                  plan.brokerSchedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition"
                      onClick={() => setExpanded(expanded === idx.toString() ? null : idx.toString())}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.priority === "critical"
                                  ? "bg-red-100 text-red-800"
                                  : item.priority === "high"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {item.priority.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">{item.date}</span>
                          </div>
                          <h4 className="font-semibold">{item.clientName}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{item.expectedOutcome}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.actionType}</p>
                          <p className="text-xs text-muted-foreground">{item.estimatedDuration} min</p>
                        </div>
                      </div>

                      {expanded === idx.toString() && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <FileText size={16} />
                              Prep Tasks
                            </p>
                            <ul className="text-sm space-y-1">
                              {item.prepTasks.map((task, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-green-600 opacity-60" />
                                  {task}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Priority Matrix */}
        <TabsContent value="priority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Priority Matrix</CardTitle>
              <CardDescription>Renewals ranked by urgency and impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plan.priorityMatrix.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.priority === "critical"
                              ? "bg-red-500"
                              : item.priority === "high"
                                ? "bg-orange-500"
                                : item.priority === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-blue-500"
                          }`}
                        />
                        <span className="font-semibold">{item.clientName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.score}</p>
                      <p className="text-xs text-muted-foreground">Urgency: {item.urgency}/10</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Alerts */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Alerts</CardTitle>
              <CardDescription>Issues requiring immediate broker attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.riskAreas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No critical risks detected</p>
                ) : (
                  plan.riskAreas.map((risk, idx) => (
                    <div
                      key={idx}
                      className={`border-l-4 p-4 rounded ${
                        risk.severity === "critical"
                          ? "border-l-red-500 bg-red-50"
                          : risk.severity === "high"
                            ? "border-l-orange-500 bg-orange-50"
                            : "border-l-yellow-500 bg-yellow-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">{risk.clientName}</p>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            risk.severity === "critical"
                              ? "bg-red-200 text-red-800"
                              : risk.severity === "high"
                                ? "bg-orange-200 text-orange-800"
                                : "bg-yellow-200 text-yellow-800"
                          }`}
                        >
                          {risk.severity}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{risk.message}</p>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Zap size={14} />
                        {risk.recommendedAction}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Focus */}
        <TabsContent value="focus" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Focus</CardTitle>
              <CardDescription>Priority items for today's broker schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.dailyFocus.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No focus items for today</p>
                ) : (
                  plan.dailyFocus.map((focus, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200"
                    >
                      <Zap className="text-emerald-600 mt-0.5 flex-shrink-0" size={18} />
                      <p className="text-sm font-medium">{focus}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      {plan.recommendedActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={20} />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {plan.recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                  <CheckCircle2 className="text-muted-foreground mt-0.5 flex-shrink-0" size={18} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{action.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">Target: {action.targetDate}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{action.estimatedTime} min</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
