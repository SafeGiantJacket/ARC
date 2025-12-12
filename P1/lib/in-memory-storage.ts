// Stores calendar events and notes temporarily in memory and sessionStorage

export interface CalendarEventData {
  id: string
  placement_id: string
  event_title: string
  event_description: string
  event_date: string
  event_type: "renewal" | "meeting" | "call" | "followup" | "other"
  priority: "low" | "medium" | "high"
  status: "scheduled" | "completed" | "cancelled"
  created_at: string
  broker_id?: string
}

export interface BrokerNoteData {
  id: string
  placement_id: string
  note_title: string
  note_content: string
  note_category: "general" | "important" | "followup" | "issue"
  tags: string[]
  created_at: string
  broker_id?: string
}

class InMemoryStorage {
  private calendarEvents: CalendarEventData[] = []
  private brokerNotes: BrokerNoteData[] = []
  private storageKey = "broker_data_storage_v1"

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return
    try {
      const stored = sessionStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        this.calendarEvents = data.events || []
        this.brokerNotes = data.notes || []
      }
    } catch (error) {
      console.error("[v0] Failed to load from storage:", error)
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify({
          events: this.calendarEvents,
          notes: this.brokerNotes,
        }),
      )
    } catch (error) {
      console.error("[v0] Failed to save to storage:", error)
    }
  }

  // Calendar Events Methods
  addCalendarEvent(event: Omit<CalendarEventData, "id" | "created_at">): CalendarEventData {
    const newEvent: CalendarEventData = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    }
    this.calendarEvents.push(newEvent)
    this.saveToStorage()
    return newEvent
  }

  getCalendarEvents(brokerId?: string): CalendarEventData[] {
    if (brokerId) {
      return this.calendarEvents.filter((e) => e.broker_id === brokerId)
    }
    return this.calendarEvents
  }

  getCalendarEventsByDate(date: string, brokerId?: string): CalendarEventData[] {
    return this.getCalendarEvents(brokerId).filter((e) => e.event_date === date)
  }

  getCalendarEventsByMonth(year: number, month: number, brokerId?: string): CalendarEventData[] {
    const monthStr = String(month + 1).padStart(2, "0")
    const yearStr = String(year)
    return this.getCalendarEvents(brokerId).filter((e) => e.event_date.startsWith(`${yearStr}-${monthStr}`))
  }

  deleteCalendarEvent(eventId: string): boolean {
    const index = this.calendarEvents.findIndex((e) => e.id === eventId)
    if (index > -1) {
      this.calendarEvents.splice(index, 1)
      this.saveToStorage()
      return true
    }
    return false
  }

  updateCalendarEvent(eventId: string, updates: Partial<CalendarEventData>): boolean {
    const event = this.calendarEvents.find((e) => e.id === eventId)
    if (event) {
      Object.assign(event, updates)
      this.saveToStorage()
      return true
    }
    return false
  }

  // Notes Methods
  addNote(note: Omit<BrokerNoteData, "id" | "created_at">): BrokerNoteData {
    const newNote: BrokerNoteData = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    }
    this.brokerNotes.push(newNote)
    this.saveToStorage()
    return newNote
  }

  getNotes(brokerId?: string): BrokerNoteData[] {
    if (brokerId) {
      return this.brokerNotes.filter((n) => n.broker_id === brokerId)
    }
    return this.brokerNotes
  }

  deleteNote(noteId: string): boolean {
    const index = this.brokerNotes.findIndex((n) => n.id === noteId)
    if (index > -1) {
      this.brokerNotes.splice(index, 1)
      this.saveToStorage()
      return true
    }
    return false
  }

  updateNote(noteId: string, updates: Partial<BrokerNoteData>): boolean {
    const note = this.brokerNotes.find((n) => n.id === noteId)
    if (note) {
      Object.assign(note, updates)
      this.saveToStorage()
      return true
    }
    return false
  }

  // Clear all data
  clearAllData() {
    this.calendarEvents = []
    this.brokerNotes = []
    this.saveToStorage()
  }
}

// Export singleton instance
export const storage = new InMemoryStorage()
