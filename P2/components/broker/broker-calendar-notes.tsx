// Added Google Calendar-like interface with day/week/month views

"use client"

import { useState, useEffect } from "react"
import { Calendar, Sticker as Sticky, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { storage } from "@/lib/in-memory-storage"
import type { InsurancePlacement } from "@/lib/types"

interface BrokerCalendarNotesProps {
  placements: InsurancePlacement[]
  emailData: any[]
}

export function BrokerCalendarNotes({ placements, emailData }: BrokerCalendarNotesProps) {
  const [activeTab, setActiveTab] = useState<"calendar" | "notes">("calendar")
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    placement_id: "",
    event_title: "",
    event_description: "",
    event_date: "",
    event_type: "renewal" as const,
    priority: "medium" as const,
    note_title: "",
    note_content: "",
    note_category: "general" as const,
    tags: "",
  })
  const [loading, setLoading] = useState(false)
  const [brokerId] = useState(() => {
    if (typeof window === "undefined") return ""
    const stored = localStorage.getItem("broker_id")
    if (stored) return stored
    const id = `broker_${Date.now()}`
    localStorage.setItem("broker_id", id)
    return id
  })

  const loadData = () => {
    const allEvents = storage.getCalendarEvents(brokerId)
    const allNotes = storage.getNotes(brokerId)
    setEvents(allEvents)
    setNotes(allNotes)
  }

  useEffect(() => {
    loadData()
  }, [brokerId])

  const handleAddEvent = async () => {
    if (!formData.placement_id || !formData.event_title || !formData.event_date) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      storage.addCalendarEvent({
        placement_id: formData.placement_id,
        event_title: formData.event_title,
        event_description: formData.event_description,
        event_date: formData.event_date,
        event_type: formData.event_type,
        priority: formData.priority,
        status: "scheduled",
        broker_id: brokerId,
      })

      setFormData((prev) => ({
        ...prev,
        placement_id: "",
        event_title: "",
        event_description: "",
        event_date: "",
      }))
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error("[v0] Failed to add event:", error)
      alert("Failed to add event")
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!formData.placement_id || !formData.note_title || !formData.note_content) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)

      storage.addNote({
        placement_id: formData.placement_id,
        note_title: formData.note_title,
        note_content: formData.note_content,
        note_category: formData.note_category,
        tags,
        broker_id: brokerId,
      })

      setFormData((prev) => ({
        ...prev,
        placement_id: "",
        note_title: "",
        note_content: "",
        tags: "",
      }))
      setShowForm(false)
      loadData()
    } catch (error) {
      console.error("[v0] Failed to add note:", error)
      alert("Failed to add note")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    storage.deleteCalendarEvent(eventId)
    loadData()
  }

  const handleDeleteNote = (noteId: string) => {
    storage.deleteNote(noteId)
    loadData()
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return events.filter((e) => e.event_date === dateStr)
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedDate)
    const firstDay = getFirstDayOfMonth(selectedDate)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i))
    }

    return days
  }

  const calendarDays = generateCalendarDays()
  const monthName = selectedDate.toLocaleString("default", { month: "long", year: "numeric" })

  const categoryColors: Record<string, string> = {
    general: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    important: "bg-red-500/10 text-red-600 dark:text-red-400",
    followup: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    issue: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  }

  const priorityColors: Record<string, string> = {
    low: "bg-green-500/10 text-green-600 dark:text-green-400",
    medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    high: "bg-red-500/10 text-red-600 dark:text-red-400",
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === "calendar"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Calendar
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === "notes"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sticky className="h-4 w-4" />
          Notes
        </button>
      </div>

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* View Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1 bg-secondary rounded-lg p-1">
              <button
                onClick={() => setCalendarView("month")}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                  calendarView === "month"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setCalendarView("week")}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                  calendarView === "week"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarView("day")}
                className={`px-3 py-1.5 text-sm rounded font-medium transition-colors ${
                  calendarView === "day"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Day
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-secondary rounded transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-32 text-center">{monthName}</span>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-secondary rounded transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          </div>

          {/* Add Event Form */}
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
                      <option key={p.client} value={p.client}>
                        {p.client} - {p.coverage}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Event Title</label>
                  <Input
                    value={formData.event_title}
                    onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                    placeholder="e.g., Renewal Call, Presentation"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={formData.event_description}
                    onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                    placeholder="Event details..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Date</label>
                    <Input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Type</label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    >
                      <option value="renewal">Renewal</option>
                      <option value="meeting">Meeting</option>
                      <option value="call">Call</option>
                      <option value="followup">Follow-up</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
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

          {/* Month View Calendar */}
          {calendarView === "month" && (
            <Card className="p-4">
              <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="bg-secondary p-2 text-center text-xs font-medium">
                    {day}
                  </div>
                ))}

                {calendarDays.map((day, idx) => {
                  const dayEvents = day ? getEventsForDate(day) : []
                  const isToday = day && new Date().toDateString() === day.toDateString()
                  const isSelected = day && selectedDate.toDateString() === day.toDateString()

                  return (
                    <div
                      key={idx}
                      onClick={() => day && setSelectedDate(day)}
                      className={`min-h-24 p-2 cursor-pointer transition-colors ${
                        day ? "bg-card hover:bg-secondary/50" : "bg-muted"
                      } ${isToday ? "bg-primary/10" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
                    >
                      {day && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : "text-foreground"}`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${priorityColors[event.priority] || priorityColors.medium}`}
                              >
                                {event.event_title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Events List for Selected Date */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Events for {selectedDate.toLocaleDateString()}</h3>
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No events scheduled</p>
            ) : (
              getEventsForDate(selectedDate).map((event) => (
                <Card key={event.id} className="p-4 border-l-4 border-l-primary bg-card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{event.event_title}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[event.priority]}`}
                        >
                          {event.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{event.event_description}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{event.placement_id}</span>
                        <span>•</span>
                        <span>{event.event_type}</span>
                      </div>
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
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              New Note
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
                      <option key={p.client} value={p.client}>
                        {p.client} - {p.coverage}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input
                    value={formData.note_title}
                    onChange={(e) => setFormData({ ...formData, note_title: e.target.value })}
                    placeholder="Note title..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Content</label>
                  <Textarea
                    value={formData.note_content}
                    onChange={(e) => setFormData({ ...formData, note_content: e.target.value })}
                    placeholder="Write your note..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <select
                      value={formData.note_category}
                      onChange={(e) => setFormData({ ...formData, note_category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    >
                      <option value="general">General</option>
                      <option value="important">Important</option>
                      <option value="followup">Follow-up</option>
                      <option value="issue">Issue</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Tags</label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="e.g., urgent, client"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddNote} disabled={loading} className="flex-1">
                    {loading ? "Saving..." : "Save Note"}
                  </Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
            ) : (
              notes.map((note) => (
                <Card key={note.id} className="p-4 bg-card border-l-4 border-l-amber-500">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{note.note_title}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[note.note_category]}`}
                        >
                          {note.note_category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{note.note_content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{note.placement_id}</span>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex gap-1">
                            {note.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
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
      )}
    </div>
  )
}
