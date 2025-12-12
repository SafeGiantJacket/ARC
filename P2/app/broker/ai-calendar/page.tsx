"use client"

import { useState } from "react"
import { AICalendarPlanner } from "@/components/broker/ai-calendar-planner"
import type { InsurancePlacement, EmailData, CalendarEvent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw } from "lucide-react"

export default function AICalendarPage() {
  const [placements, setPlacements] = useState<InsurancePlacement[]>([])
  const [emailData, setEmailData] = useState<EmailData[]>([])
  const [calendarData, setCalendarData] = useState<CalendarEvent[]>([])

  // In a real app, these would come from the broker dashboard or API
  const handleExportSchedule = () => {
    const dataStr = JSON.stringify({ placements, emailData, calendarData }, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ai-calendar-plan-${new Date().toISOString().split("T")[0]}.json`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Calendar Planner</h1>
          <p className="text-muted-foreground mt-2">Intelligent scheduling and prioritization for broker renewals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportSchedule}>
            <Download size={16} className="mr-2" />
            Export Plan
          </Button>
        </div>
      </div>

      {placements.length > 0 && emailData.length > 0 ? (
        <AICalendarPlanner placements={placements} emailData={emailData} calendarData={calendarData} />
      ) : (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Load insurance, email, and calendar data from the broker dashboard first
          </p>
          <p className="text-sm text-muted-foreground">
            The AI calendar planner will automatically generate an optimized schedule
          </p>
        </div>
      )}
    </div>
  )
}
