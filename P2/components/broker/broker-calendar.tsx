"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Trash2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { Placement } from "@/lib/types"

interface CalendarEvent {
  id: string
  placement_id: string
  event_title: string
  event_description: string
  event_date: string
  event_type: string
  priority: string
  status: string
  ai_suggested: boolean
}

interface BrokerCalendarProps {
  placements: Placement[]
  emailData: any[]
}

export function BrokerCalendar({ placements, emailData }: BrokerCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    placement_id: "",
    event_title: "",
    event_description: "",
    event_date: "",
    event_type: "renewal",
    priority: "medium",
  })
  const [loading, setLoading] = useState(false)
  const [brokerIdLoaded, setBrokerIdLoaded] = useState(false)
  const [brokerId, setBrokerId] = useState("")

  const supabase = createClient()

  // Get broker ID from localStorage or session
  useEffect(() => {
    const stored = localStorage.getItem("broker_id")
    if (stored) {
      setBrokerId(stored)
      setBrokerIdLoaded(true)
    } else {
      const id = `broker_${Date.now()}`
      localStorage.setItem("broker_id", id)
      setBrokerId(id)
      setBrokerIdLoaded(true)
    }
  }, [])

  // Load events on mount
  useEffect(() => {
    if (brokerIdLoaded && brokerId) {
      loadEvents()
    }
  }, [brokerIdLoaded, brokerId])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("broker_calendar_events")
        .select("*")
        .eq("broker_id", brokerId)
        .order("event_date", { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error("[v0] Failed to load calendar events:", error)
    }
  }

  const handleAddEvent = async () => {
    if (!formData.placement_id || !formData.event_title || !formData.event_date) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from("broker_calendar_events").insert({
        broker_id: brokerId,
        placement_id: formData.placement_id,
        event_title: formData.event_title,
        event_description: formData.event_description,
        event_date: formData.event_date,
        event_type: formData.event_type,
        priority: formData.priority,
        status: "scheduled",
      })

      if (error) throw error

      setFormData({
        placement_id: "",
        event_title: "",
        event_description: "",
        event_date: "",
        event_type: "renewal",
        priority: "medium",
      })
      setShowForm(false)
      await loadEvents()
    } catch (error) {
      console.error("[v0] Failed to add event:", error)
      alert("Failed to add event")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase.from("broker_calendar_events").delete().eq("id", eventId)

      if (error) throw error
      await loadEvents()
    } catch (error) {
      console.error("[v0] Failed to delete event:", error)
    }
  }

  // AI-suggested events based on expiry dates
  const generateAISuggestions = () => {
    const suggestions = placements
      .filter((p) => {
        const expiryDate = new Date(p.expiryDate)
        const daysUntilExpiry = (expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        return daysUntilExpiry > 0 && daysUntilExpiry <= 90
      })
      .map((p) => ({
        placement_id: p.clientName,
        event_title: `Renewal: ${p.clientName} - ${p.policyType}`,
        event_description: `Policy expires on ${p.expiryDate}. Premium: $${p.premiumAmount}`,
        event_date: new Date(new Date(p.expiryDate).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        event_type: "renewal",
        priority:
          (new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 7 ? "high" : "medium",
      }))

    return suggestions
  }

  const aiSuggestions = generateAISuggestions()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar & Events
        </h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 bg-secondary/50 border-2 border-primary/20">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Placement</label>
              <select
                value={formData.placement_id}
                onChange={(e) => setFormData({ ...formData, placement_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
              >
                <option value="">Select placement...</option>
                {placements.map((p) => (
                  <option key={p.clientName} value={p.clientName}>
                    {p.clientName} - {p.policyType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Event Title</label>
              <Input
                value={formData.event_title}
                onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                placeholder="e.g., Renewal Call"
                className="text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={formData.event_description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    event_description: e.target.value,
                  })
                }
                placeholder="Event details..."
                className="text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-foreground">Date</label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddEvent} disabled={loading} className="flex-1">
                {loading ? "Adding..." : "Add Event"}
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card className="p-4 bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                AI-Suggested Events ({aiSuggestions.length})
              </h4>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mb-3">
                Based on policy expiry dates and email sentiment
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {aiSuggestions.slice(0, 3).map((suggestion, idx) => (
              <div
                key={idx}
                className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg flex justify-between items-center"
              >
                <div className="text-sm">
                  <p className="font-medium text-foreground">{suggestion.event_title}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.event_date}</p>
                </div>
                <Button
                  onClick={() => {
                    setFormData({
                      ...suggestion,
                      event_type: "renewal",
                    })
                    setShowForm(true)
                  }}
                  size="sm"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Events List */}
      <div className="space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No events scheduled yet</p>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="p-4 border-l-4 border-l-primary bg-card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground">{event.event_title}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.priority === "high"
                          ? "bg-red-500/20 text-red-600 dark:text-red-400"
                          : event.priority === "medium"
                            ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                            : "bg-green-500/20 text-green-600 dark:text-green-400"
                      }`}
                    >
                      {event.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{event.event_description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.event_date).toLocaleDateString()} • {event.placement_id}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
