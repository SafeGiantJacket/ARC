import type { EmailData, CalendarEvent } from "./types"

/**
 * Mock data for email thread metadata from Outlook/Mail Miner
 * In production, this would be fetched from Microsoft Graph API
 */
export const MOCK_EMAIL_DATA: EmailData[] = [
  {
    emailId: "EM-501",
    subject: "Renewal – Need Updated Proposal",
    clientName: "Alpha Manufacturing Ltd",
    receivedAt: "2025-01-14 9:17 AM",
    policyId: "POL-8841",
    summary: "Client urgently requesting renewal quote; mentions competitor pricing",
    sentiment: "negative",
    threadCount: 7,
    sourceLink: "https://outlook.office.com/mail/message/em501",
  },
  {
    emailId: "EM-502",
    subject: "Claims Report for Underwriter",
    clientName: "Brightline Logistics",
    receivedAt: "2025-01-20 3:02 PM",
    policyId: "POL-6722",
    summary: "Loss-run shared; underwriter asked for clarification",
    sentiment: "neutral",
    threadCount: 11,
    sourceLink: "https://outlook.office.com/mail/message/em502",
  },
  {
    emailId: "EM-503",
    subject: "Renewal Checklist & Required Docs",
    clientName: "Seawind Hotels",
    receivedAt: "2025-01-28 1:44 PM",
    policyId: "POL-5530",
    summary: "Client sent property valuation but cyber questionnaire missing",
    sentiment: "neutral",
    threadCount: 5,
    sourceLink: "https://outlook.office.com/mail/message/em503",
  },
  {
    emailId: "EM-504",
    subject: "Appreciation + Next Cycle",
    clientName: "Orion Tech Services",
    receivedAt: "2025-01-04 6:40 PM",
    policyId: "POL-9005",
    summary: "Client appreciated last renewal speed; open to proposal for cyber policy",
    sentiment: "positive",
    threadCount: 3,
    sourceLink: "https://outlook.office.com/mail/message/em504",
  },
]

/**
 * Mock data for calendar events from Outlook
 * In production, this would be fetched from Microsoft Graph API
 */
export const MOCK_CALENDAR_DATA: CalendarEvent[] = [
  {
    eventId: "EVT-101",
    title: "Renewal Strategy Call",
    clientName: "Alpha Manufacturing Ltd",
    meetingDate: "2025-01-18 11:00 AM",
    policyId: "POL-8841",
    meetingNotes: "Client concerned about rising premiums; review open claims before quoting",
    participants: ["john@broker.com", "amanda@alphamfg.com"],
    sourceLink: "https://outlook.office.com/calendar/event/evt101",
  },
  {
    eventId: "EVT-102",
    title: "Q3 Claims Performance Review",
    clientName: "Brightline Logistics",
    meetingDate: "2025-01-24 4:30 PM",
    policyId: "POL-6722",
    meetingNotes: "Carrier pushing for higher deductible; need loss-run summary",
    participants: ["sarah@broker.com", "claims@brightline.com"],
    sourceLink: "https://outlook.office.com/calendar/event/evt102",
  },
  {
    eventId: "EVT-103",
    title: "Renewal Kickoff + Document Request",
    clientName: "Seawind Hotels",
    meetingDate: "2025-02-02 2:00 PM",
    policyId: "POL-5530",
    meetingNotes: "Send prior renewal file + coverage summary; meeting follow-up required",
    participants: ["daniel@broker.com", "procurement@seawind.com"],
    sourceLink: "https://outlook.office.com/calendar/event/evt103",
  },
  {
    eventId: "EVT-104",
    title: "Post-Renewal Satisfaction Check",
    clientName: "Orion Tech Services",
    meetingDate: "2025-01-11 10:15 AM",
    policyId: "POL-9005",
    meetingNotes: "Positive feedback last cycle; potential cross-sell opportunity",
    participants: ["john@broker.com", "finance@oriontech.com"],
    sourceLink: "https://outlook.office.com/calendar/event/evt104",
  },
]

/**
 * Get email data for a specific policy
 */
export function getEmailsForPolicy(policyId: string): EmailData[] {
  return MOCK_EMAIL_DATA.filter((email) => email.policyId === policyId)
}

/**
 * Get calendar events for a specific policy
 */
export function getCalendarEventsForPolicy(policyId: string): CalendarEvent[] {
  return MOCK_CALENDAR_DATA.filter((event) => event.policyId === policyId)
}

/**
 * Get all emails with specified sentiment
 */
export function getEmailsBySentiment(sentiment: "positive" | "neutral" | "negative"): EmailData[] {
  return MOCK_EMAIL_DATA.filter((email) => email.sentiment === sentiment)
}

/**
 * Get all upcoming calendar events (next 7 days)
 */
export function getUpcomingEvents(): CalendarEvent[] {
  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return MOCK_CALENDAR_DATA.filter((event) => {
    const eventDate = new Date(event.meetingDate)
    return eventDate >= now && eventDate <= sevenDaysLater
  }).sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())
}

/**
 * Search emails by keyword
 */
export function searchEmails(keyword: string): EmailData[] {
  const lowerKeyword = keyword.toLowerCase()
  return MOCK_EMAIL_DATA.filter(
    (email) =>
      email.subject.toLowerCase().includes(lowerKeyword) ||
      email.summary.toLowerCase().includes(lowerKeyword) ||
      email.clientName.toLowerCase().includes(lowerKeyword),
  )
}

/**
 * Combine insights from emails and calendar for a policy
 */
export function getConnectorInsights(policyId: string): {
  recentEmails: EmailData[]
  upcomingEvents: CalendarEvent[]
  sentiment: string
  nextAction: string
} {
  const emails = getEmailsForPolicy(policyId)
  const events = getCalendarEventsForPolicy(policyId)

  const sentiments = emails.map((e) => e.sentiment)
  const positiveCount = sentiments.filter((s) => s === "positive").length
  const negativeCount = sentiments.filter((s) => s === "negative").length

  let sentiment = "neutral"
  if (positiveCount > negativeCount) sentiment = "positive"
  else if (negativeCount > positiveCount) sentiment = "negative"

  let nextAction = "Schedule renewal discussion"
  if (sentiment === "negative") nextAction = "Address client concerns immediately"
  else if (sentiment === "positive") nextAction = "Expedite quote; opportunity for upsell"

  return {
    recentEmails: emails.slice(0, 3),
    upcomingEvents: events.slice(0, 2),
    sentiment,
    nextAction,
  }
}
