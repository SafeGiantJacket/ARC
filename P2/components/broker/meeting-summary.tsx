"use client"

import { useMemo } from "react"
import { Calendar, AlertTriangle, Clock, BarChart3 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { InsurancePlacement, CalendarEvent } from "@/lib/types"

interface MeetingSummaryProps {
  placements: InsurancePlacement[]
  calendarData: CalendarEvent[]
}

export function MeetingSummary({ placements, calendarData }: MeetingSummaryProps) {
  const analysis = useMemo(() => {
    if (calendarData.length === 0) {
      return {
        totalMeetings: 0,
        urgentMeetings: 0,
        averageDaysToNextMeeting: 0,
        upcomingMeetings: [] as Array<{ date: string; placement: string; importance: string }>,
        delayedPlacements: [] as Array<{ name: string; daysSinceLastMeeting: number }>,
      }
    }

    const now = new Date()
    const meetingsByDate = calendarData.map((m) => {
      const meetingDate = new Date(m.meetingDate)
      const daysFromNow = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 3600 * 24))
      return {
        ...m,
        daysFromNow,
        importance: daysFromNow <= 7 ? "critical" : daysFromNow <= 14 ? "high" : "medium",
      }
    })

    const upcomingMeetings = meetingsByDate
      .filter((m) => m.daysFromNow >= 0)
      .sort((a, b) => a.daysFromNow - b.daysFromNow)
      .slice(0, 5)

    const urgentMeetingsCount = meetingsByDate.filter((m) => m.daysFromNow <= 7 && m.daysFromNow >= 0).length

    const averageDaysToNext =
      meetingsByDate.length > 0
        ? Math.round(
            meetingsByDate.filter((m) => m.daysFromNow >= 0).reduce((sum, m) => sum + m.daysFromNow, 0) /
              meetingsByDate.length,
          )
        : 0

    // Find placements with no recent meetings
    const placementsWithMeetings = new Set(calendarData.map((m) => m.participants?.join(",")))
    const delayedPlacements = placements
      .filter((p) => !placementsWithMeetings.has(p.clientName))
      .map((p) => ({
        name: p.clientName,
        daysSinceLastMeeting: Math.ceil((now.getTime() - new Date(p.expiryDate).getTime()) / (1000 * 3600 * 24)),
      }))
      .slice(0, 3)

    return {
      totalMeetings: calendarData.length,
      urgentMeetings: urgentMeetingsCount,
      averageDaysToNextMeeting: averageDaysToNext,
      upcomingMeetings: upcomingMeetings.map((m) => ({
        date: new Date(m.meetingDate).toLocaleDateString(),
        placement: m.participants?.[0] || "Unknown",
        importance: m.importance,
      })),
      delayedPlacements,
    }
  }, [calendarData, placements])

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Meetings</p>
              <p className="text-3xl font-bold">{analysis.totalMeetings}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500/30" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Urgent (7 days)</p>
              <p className="text-3xl font-bold">{analysis.urgentMeetings}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500/30" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Days to Next</p>
              <p className="text-3xl font-bold">{analysis.averageDaysToNextMeeting}</p>
              <p className="text-xs text-muted-foreground">meeting</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500/30" />
          </div>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      {analysis.upcomingMeetings.length > 0 && (
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Meetings
          </h3>
          <div className="space-y-2">
            {analysis.upcomingMeetings.map((meeting, idx) => (
              <div key={idx} className="p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">{meeting.placement}</p>
                    <p className="text-xs text-muted-foreground">{meeting.date}</p>
                  </div>
                  <Badge
                    variant={
                      meeting.importance === "critical"
                        ? "destructive"
                        : meeting.importance === "high"
                          ? "default"
                          : "outline"
                    }
                  >
                    {meeting.importance}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Delayed Placements */}
      {analysis.delayedPlacements.length > 0 && (
        <Card className="p-4 bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-700 dark:text-orange-400">No Recent Meetings</h3>
          </div>
          <div className="space-y-2">
            {analysis.delayedPlacements.map((placement, idx) => (
              <div key={idx} className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/10">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-orange-900 dark:text-orange-300">{placement.name}</p>
                    <p className="text-xs text-orange-800/70 dark:text-orange-400/70">No meeting scheduled</p>
                  </div>
                  <Badge variant="outline">Action needed</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysis.totalMeetings === 0 && (
        <Card className="p-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-muted-foreground">No calendar data available. Upload calendar CSV to see analysis.</p>
        </Card>
      )}
    </div>
  )
}
