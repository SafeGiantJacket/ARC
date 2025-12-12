"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar, Plus, Trash2, Zap } from "lucide-react"
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
}

export function BrokerCalendarWithScheduler({ placements = [], emailData = [] }: BrokerCalendarWithSchedulerProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showAIScheduler, setShowAIScheduler] = useState(true)
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month")
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    type: "meeting" as const,
    priority: "medium" as const,
  })

  // Load events from session storage
  useEffect(() => {
    const saved = sessionStorage.getItem("calendarEvents")
    if (saved) {
      setEvents(JSON.parse(saved))
    }
  }, [])

  const generateAISchedule = () => {
    const suggestions: CalendarEvent[] = []
    const today = new Date()

    // Generate smart schedule based on demo data
    const criticalDates = [
      {
        days: 1,
        type: "meeting" as const,
        priority: "critical" as const,
        title: "Critical Renewal Call - Premium at Risk",
      },
      { days: 3, type: "follow-up" as const, priority: "high" as const, title: "Follow-up: Awaiting Quote Decision" },
      { days: 7, type: "email" as const, priority: "high" as const, title: "Send Renewal Reminder Email" },
      { days: 14, type: "documentation" as const, priority: "medium" as const, title: "Prepare Policy Documentation" },
    ]

    criticalDates.forEach((item, idx) => {
      const date = new Date(today)
      date.setDate(date.getDate() + item.days)

      suggestions.push({
        id: `ai_${idx}`,
        title: item.title,
        description: "AI-generated based on pipeline analysis and email sentiment",
        date: date.toISOString().split("T")[0],
        type: item.type,
        priority: item.priority,
        aiSuggested: true,
      })
    })

    return suggestions
  }

  const aiSuggestions = generateAISchedule()

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.date) return

    const newEvent: CalendarEvent = {
      id: `event_${Date.now()}`,
      ...formData,
      aiSuggested: false,
    }

    const updated = [...events, newEvent]
    setEvents(updated)
    sessionStorage.setItem("calendarEvents", JSON.stringify(updated))

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
    sessionStorage.setItem("calendarEvents", JSON.stringify(updated))
  }

  const handleAcceptAISuggestion = (suggestion: CalendarEvent) => {
    const newEvent: CalendarEvent = {
      ...suggestion,
      id: `event_${Date.now()}`,
      aiSuggested: false,
    }

    const updated = [...events, newEvent]
    setEvents(updated)
    sessionStorage.setItem("calendarEvents", JSON.stringify(updated))
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

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-600 dark:text-red-400"
      case "high":
        return "bg-orange-500/20 text-orange-600 dark:text-orange-400"
      case "medium":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
      default:
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400"
    }
  }

  const eventsByDate = events.reduce(
    (acc, event) => {
      if (!acc[event.date]) acc[event.date] = []
      acc[event.date].push(event)
      return acc
    },
    {} as Record<string, CalendarEvent[]>,
  )

  return (
    <div className="space-y-6">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Calendar & Smart Scheduler</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </div>

      {/* AI Scheduler Section */}
      {showAIScheduler && aiSuggestions.length > 0 && (
        <Card className="p-4 bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-blue-600 dark:text-blue-400">
                AI Smart Schedule ({aiSuggestions.length} suggested)
              </h4>
            </div>
            <button
              onClick={() => setShowAIScheduler(false)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mb-3">
            AI analyzed your pipeline and generated an optimal schedule
          </p>
          <div className="space-y-2">
            {aiSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-3 rounded-lg border flex justify-between items-start gap-3 ${getPriorityColor(
                  suggestion.priority,
                )}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{suggestion.title}</p>
                  <p className="text-xs mt-1 opacity-80">{suggestion.date}</p>
                </div>
                <Button
                  onClick={() => handleAcceptAISuggestion(suggestion)}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Event Form */}
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

      {/* Events List by Date */}
      <div className="space-y-4">
        {Object.entries(eventsByDate)
          .sort()
          .map(([date, dateEvents]) => (
            <div key={date}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </h4>
              <div className="space-y-2">
                {dateEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={`p-3 border-l-4 ${getPriorityColor(event.priority)} bg-card border-r border-b border-t`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm truncate">{event.title}</h5>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${getPriorityBadgeColor(event.priority)}`}
                          >
                            {event.priority}
                          </span>
                          {event.aiSuggested && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              AI
                            </span>
                          )}
                        </div>
                        {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

        {events.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events scheduled. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
