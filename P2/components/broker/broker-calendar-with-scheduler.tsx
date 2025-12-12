"use client"

import type React from "react"
import { useState } from "react"
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
  type: "meeting" | "email" | "follow-up" | "renewal" | "documentation"
  priority: "low" | "medium" | "high" | "critical"
  aiSuggested: boolean
}

interface BrokerCalendarWithSchedulerProps {
  placements?: any[]
  emailData?: any[]
  externalEvents?: any[]
}

export function BrokerCalendarWithScheduler({ placements = [], emailData = [], externalEvents = [] }: BrokerCalendarWithSchedulerProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    type: "meeting" as const,
    priority: "medium" as const,
  })

  const handleAutoGenerateSchedule = async () => {
    setIsGeneratingSchedule(true)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const today = new Date()
    const generatedEvents: CalendarEvent[] = []

    if (placements.length > 0) {
      const sortedPlacements = [...placements].sort((a, b) => (a.daysUntilExpiry || 999) - (b.daysUntilExpiry || 999))

      sortedPlacements.slice(0, 10).forEach((placement, idx) => {
        const daysUntilExpiry = placement.daysUntilExpiry || 90
        const clientName = placement.client || placement.clientName || `Client ${idx + 1}`

        if (daysUntilExpiry <= 7) {
          const meetingDate = new Date(today)
          meetingDate.setDate(meetingDate.getDate() + 1 + idx)
          generatedEvents.push({
            id: `auto_${Date.now()}_${idx}_meeting`,
            title: `URGENT: Renewal Meeting - ${clientName}`,
            description: `Policy expires in ${daysUntilExpiry} days. Immediate action required.`,
            date: meetingDate.toISOString().split("T")[0],
            type: "meeting",
            priority: "critical",
            aiSuggested: true,
          })
        } else if (daysUntilExpiry <= 30) {
          const followUpDate = new Date(today)
          followUpDate.setDate(followUpDate.getDate() + 2 + idx)
          generatedEvents.push({
            id: `auto_${Date.now()}_${idx}_followup`,
            title: `Follow-up: ${clientName} Renewal`,
            description: `Policy expires in ${daysUntilExpiry} days. Send quote and discuss terms.`,
            date: followUpDate.toISOString().split("T")[0],
            type: "follow-up",
            priority: "high",
            aiSuggested: true,
          })
        } else if (daysUntilExpiry <= 60) {
          const emailDate = new Date(today)
          emailDate.setDate(emailDate.getDate() + 7 + idx)
          generatedEvents.push({
            id: `auto_${Date.now()}_${idx}_email`,
            title: `Send Renewal Notice - ${clientName}`,
            description: `Policy expires in ${daysUntilExpiry} days. Initiate renewal conversation.`,
            date: emailDate.toISOString().split("T")[0],
            type: "email",
            priority: "medium",
            aiSuggested: true,
          })
        }
      })
    }

    const weekFromNow = new Date(today)
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    generatedEvents.push({
      id: `auto_${Date.now()}_weekly`,
      title: "Weekly Pipeline Review",
      description: "Review all renewals, update statuses, and prioritize upcoming actions.",
      date: weekFromNow.toISOString().split("T")[0],
      type: "documentation",
      priority: "medium",
      aiSuggested: true,
    })

    const existingDates = new Set(events.map((e) => e.date))
    const newEvents = generatedEvents.filter((e) => !existingDates.has(e.date))

    const updatedEvents = [...events, ...newEvents]
    setEvents(updatedEvents)
    setIsGeneratingSchedule(false)

    // Sync generated events to Google Calendar
    // We do this in the background to not block UI
    newEvents.forEach(async (event) => {
      try {
        // Default 1 hour duration for auto-events
        const startTime = new Date(event.date).toISOString()
        const endTime = new Date(new Date(event.date).getTime() + 60 * 60 * 1000).toISOString()

        await fetch("/api/calendar/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            description: event.description,
            startTime,
            endTime
          })
        })
      } catch (error) {
        console.error("Failed to sync auto-event:", event.title)
      }
    })
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.date) return

    // Prepare event data for Google Calendar
    // Assuming default 1 hour duration for manual events if not specified
    const startTime = new Date(formData.date).toISOString()
    const endDate = new Date(new Date(formData.date).getTime() + 60 * 60 * 1000).toISOString()

    try {
      const response = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime,
          endTime: endDate
        })
      })

      if (!response.ok) {
        console.error("Failed to sync to Google Calendar")
        // Could add toast notification here
      }
    } catch (error) {
      console.error("Error creating event:", error)
    }

    const newEvent: CalendarEvent = {
      id: `event_${Date.now()}`,
      ...formData,
      aiSuggested: false,
    }

    const updated = [...events, newEvent]
    setEvents(updated)

    setFormData({
      title: "",
      description: "",
      date: "",
      type: "meeting",
      priority: "medium",
    })
    setShowForm(false)
  }

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id)
    setEvents(updated)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
      case "high":
        return "bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400"
      case "medium":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
      default:
        return "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400"
    }
  }

  // Merge internal events with external synced events
  const allEvents = [...events, ...externalEvents.map(e => ({
    id: e.eventId || e.id,
    title: e.title,
    description: e.description,
    date: e.startTime ? e.startTime.split('T')[0] : e.date,
    type: 'meeting',
    priority: 'high', // Default priority for synced events
    aiSuggested: false,
    isExternal: true
  })) as CalendarEvent[]] // Type assertion to satisfy compilation

  const eventsByDate = allEvents.reduce(
    (acc, event) => {
      // Ensure date exists and is valid string
      if (!event.date) return acc

      const dateKey = event.date.split('T')[0]
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(event)
      return acc
    },
    {} as Record<string, any[]>,
  )

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Calendar & Scheduler</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleAutoGenerateSchedule}
            disabled={isGeneratingSchedule}
            variant="outline"
            size="sm"
            className="gap-2 border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
          >
            {isGeneratingSchedule ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Auto Generate Schedule
              </>
            )}
          </Button>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold min-w-40 text-center">
            {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1 ml-4">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4 bg-secondary/50 border-2 border-primary/20">
          <h4 className="font-medium mb-3">Create Calendar Event</h4>
          <form onSubmit={handleAddEvent} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Event title"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm"
                >
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="renewal">Renewal</option>
                  <option value="documentation">Documentation</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event details..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Add Event
              </Button>
              <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Improved Calendar Grid */}
      <Card className="bg-card border border-border overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-3 border-r last:border-r-0 border-border">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(100px,_1fr)] bg-background">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="border-r border-b border-border bg-secondary/5 last:border-r-0 p-1" />
          ))}

          {days.map((day) => {
            const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
              .toISOString()
              .split("T")[0]
            const dayEvents = eventsByDate[dateStr] || []
            const isToday = new Date().toISOString().split("T")[0] === dateStr
            const isSelected = selectedDate === dateStr

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`
                    relative p-1 border-r border-b border-border transition-colors cursor-pointer group hover:bg-secondary/50
                    ${isToday ? "bg-primary/5" : ""}
                    ${isSelected ? "ring-2 ring-primary ring-inset z-10" : ""}
                  `}
              >
                <div className={`
                    absolute top-1 left-1 w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
                    ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground group-hover:bg-secondary"}
                  `}>
                  {day}
                </div>

                <div className="mt-7 space-y-1">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium border
                          ${event.isExternal
                          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30"
                          : event.priority === 'critical' ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
                            : "bg-secondary text-foreground border-border"
                        }
                        `}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {selectedDate && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">
            Events for{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </h4>
          {eventsByDate[selectedDate] && eventsByDate[selectedDate].length > 0 ? (
            <div className="space-y-2">
              {eventsByDate[selectedDate].map((event) => (
                <Card
                  key={event.id}
                  className={`p-4 border-l-4 ${getPriorityColor(event.priority)} bg-card border-r border-b border-t`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-sm">{event.title}</h5>
                      </div>
                      {event.description && <p className="text-sm text-muted-foreground mb-2">{event.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(event.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(event.priority)}`}
                        >
                          {event.priority}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No events scheduled for this day.</p>
          )}
        </div>
      )}
    </div>
  )
}
