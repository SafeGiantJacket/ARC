import type { CalendarEvent } from "./types"

export function parseCalendarCSV(csvText: string): CalendarEvent[] {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ""))
  const events: CalendarEvent[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 3) continue

    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        const idx = headers.findIndex((h) => h.includes(key))
        if (idx >= 0 && values[idx]) return values[idx]
      }
      return ""
    }

    const getArray = (keys: string[]): string[] => {
      const val = getValue(keys)
      if (!val) return []
      return val
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
    }

    const event: CalendarEvent = {
      eventId: getValue(["eventid", "id", "calendarid"]) || `EVT-${i}`,
      title: getValue(["title", "subject", "name", "meeting"]),
      clientName: getValue(["clientname", "client", "organizer", "with"]),
      meetingDate: getValue(["meetingdate", "date", "datetime", "start", "startdate"]),
      policyId: getValue(["policyid", "policy", "placementid"]),
      meetingNotes: getValue(["meetingnotes", "notes", "description", "agenda"]),
      participants: getArray(["participants", "attendees", "emails"]),
      sourceLink: getValue(["sourcelink", "link", "url"]) || `https://calendar.example.com/${i}`,
    }

    if (event.title || event.clientName) {
      events.push(event)
    }
  }

  return events
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

export function generateCalendarSampleCSV(): string {
  return `EventId,Title,ClientName,MeetingDate,PolicyId,MeetingNotes,Participants,SourceLink
EVT-101,Renewal Strategy Call,Alpha Manufacturing Ltd,2025-01-18 11:00 AM,POL-8841,Client concerned about rising premiums; review open claims before quoting,john@broker.com;amanda@alphamfg.com,https://outlook.office.com/calendar/evt101
EVT-102,Q3 Claims Performance Review,Brightline Logistics,2025-01-24 4:30 PM,POL-6722,Carrier pushing for higher deductible; need loss-run summary,sarah@broker.com;claims@brightline.com,https://outlook.office.com/calendar/evt102
EVT-103,Renewal Kickoff + Document Request,Seawind Hotels,2025-02-02 2:00 PM,POL-5530,Send prior renewal file + coverage summary; meeting follow-up required,daniel@broker.com;procurement@seawind.com,https://outlook.office.com/calendar/evt103
EVT-104,Post-Renewal Satisfaction Check,Orion Tech Services,2025-01-11 10:15 AM,POL-9005,Positive feedback last cycle; potential cross-sell opportunity,john@broker.com;finance@oriontech.com,https://outlook.office.com/calendar/evt104`
}
