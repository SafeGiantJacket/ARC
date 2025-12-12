import type { EmailData, CalendarEvent, InsurancePlacement } from "./types"

/**
 * Email Analysis - Similar to CRM data scoring
 * Analyzes sentiment, thread count, responsiveness indicators
 */
export interface EmailAnalysis {
  emailScore: number // 0-100
  sentiment: "positive" | "neutral" | "negative"
  engagementLevel: "high" | "medium" | "low"
  urgencyBoost: number // Points to add to renewal priority
  keyInsights: string[]
}

/**
 * Calendar Event Analysis
 * Analyzes meeting proximity, participant count, meeting type
 */
export interface CalendarAnalysis {
  calendarScore: number // 0-100
  daysToNextMeeting: number
  meetingImportance: "critical" | "high" | "medium" | "low"
  attendanceIndicator: number // 0-100: higher = more important attendees
  urgencyBoost: number // Points to add to renewal priority
  keyInsights: string[]
}

/**
 * Combined Email & Calendar Insights for a placement
 */
export interface ConnectorInsights {
  combinedScore: number // 0-100
  emailAnalysis: EmailAnalysis | null
  calendarAnalysis: CalendarAnalysis | null
  overallSentiment: "very_positive" | "positive" | "neutral" | "negative" | "very_negative"
  riskFactors: string[]
  recommendedActions: string[]
  nextMeetingDate?: string
  communicationGap: number // Days since last contact
}

/**
 * Analyze email data for a placement
 */
export function analyzeEmailData(emails: EmailData[], placement: InsurancePlacement): EmailAnalysis {
  if (emails.length === 0) {
    return {
      emailScore: 0,
      sentiment: "neutral",
      engagementLevel: "low",
      urgencyBoost: 0,
      keyInsights: ["No email history found"],
    }
  }

  const sentimentCounts = {
    positive: emails.filter((e) => e.sentiment === "positive").length,
    neutral: emails.filter((e) => e.sentiment === "neutral").length,
    negative: emails.filter((e) => e.sentiment === "negative").length,
  }

  let sentiment: "positive" | "neutral" | "negative" = "neutral"
  const totalSentiment = sentimentCounts.positive - sentimentCounts.negative
  const threshold = Math.max(1, emails.length * 0.2) // Lower threshold for more accurate detection

  if (totalSentiment > threshold) {
    sentiment = "positive"
  } else if (totalSentiment < -threshold) {
    sentiment = "negative"
  }

  const avgThreads = emails.reduce((sum, e) => sum + e.threadCount, 0) / emails.length
  const engagementLevel: EmailAnalysis["engagementLevel"] =
    avgThreads >= 5 ? "high" : avgThreads >= 2 ? "medium" : "low"

  const baseScore = 50
  const sentimentBoost = (totalSentiment / emails.length) * 30

  const engagementBoost = engagementLevel === "high" ? 15 : engagementLevel === "medium" ? 5 : 0

  let urgencyBoost = 0
  if (sentiment === "negative") {
    urgencyBoost = 30 // Higher urgency for negative
  } else if (sentiment === "positive") {
    urgencyBoost = 0 // Neutral urgency for positive - not a boost
  }

  const keyInsights: string[] = []
  if (sentimentCounts.negative > 0) {
    keyInsights.push(`${sentimentCounts.negative} negative email(s) - requires immediate attention`)
  }
  if (sentimentCounts.positive > 0) {
    keyInsights.push(`${sentimentCounts.positive} positive email(s) - good engagement`)
  }
  if (sentimentCounts.neutral > 0) {
    keyInsights.push(`${sentimentCounts.neutral} neutral email(s)`)
  }
  if (sentimentCounts.negative > sentimentCounts.positive && sentimentCounts.negative > 0) {
    keyInsights.push("⚠️ Negative sentiment dominates - client concerns present")
  }
  if (sentimentCounts.positive > sentimentCounts.negative && sentimentCounts.positive > 0) {
    keyInsights.push("✓ Positive sentiment trend - favorable for renewal")
  }
  if (sentimentCounts.negative > 0 && sentimentCounts.positive > 0) {
    keyInsights.push("Mixed sentiment - varied client responses requiring investigation")
  }
  if (engagementLevel === "high") {
    keyInsights.push("High engagement - frequent communication")
  }

  return {
    emailScore: Math.min(100, Math.max(0, baseScore + sentimentBoost + engagementBoost)),
    sentiment,
    engagementLevel,
    urgencyBoost,
    keyInsights,
  }
}

/**
 * Analyze calendar data for a placement
 */
export function analyzeCalendarData(events: CalendarEvent[], placement: InsurancePlacement): CalendarAnalysis {
  if (events.length === 0) {
    return {
      calendarScore: 0,
      daysToNextMeeting: 999,
      meetingImportance: "low",
      attendanceIndicator: 0,
      urgencyBoost: 0,
      keyInsights: ["No scheduled meetings"],
    }
  }

  // Sort by date to find next meeting
  const sorted = [...events].sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())
  const nextMeeting = sorted[0]
  const now = new Date()
  const meetingDate = new Date(nextMeeting.meetingDate)
  const daysToNextMeeting = Math.ceil((meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Meeting importance based on proximity and participant count
  let meetingImportance: CalendarAnalysis["meetingImportance"] = "low"
  if (daysToNextMeeting <= 7) meetingImportance = "critical"
  else if (daysToNextMeeting <= 14) meetingImportance = "high"
  else if (daysToNextMeeting <= 30) meetingImportance = "medium"

  // Attendance indicator: more participants = more important
  const avgParticipants = events.reduce((sum, e) => sum + (e.participants?.length || 0), 0) / events.length
  const attendanceIndicator = Math.min(100, avgParticipants * 20) // Each participant adds ~20 points

  // Base calendar score
  const baseScore = 50 + (daysToNextMeeting <= 7 ? 30 : daysToNextMeeting <= 30 ? 15 : 0)

  // Urgency boost: meeting within 7 days = high urgency
  const urgencyBoost = daysToNextMeeting <= 7 ? 15 : daysToNextMeeting <= 14 ? 10 : 0

  // Key insights
  const keyInsights: string[] = []
  if (daysToNextMeeting <= 7) {
    keyInsights.push(`Urgent meeting scheduled in ${daysToNextMeeting} day(s)`)
  }
  if (events.length > 3) {
    keyInsights.push("Frequent client interaction pattern")
  }
  if (nextMeeting.meetingNotes?.toLowerCase().includes("renewal")) {
    keyInsights.push("Renewal discussion scheduled")
  }

  return {
    calendarScore: Math.min(100, Math.max(0, baseScore + urgencyBoost)),
    daysToNextMeeting: Math.max(0, daysToNextMeeting),
    meetingImportance,
    attendanceIndicator: Math.round(attendanceIndicator),
    urgencyBoost,
    keyInsights,
  }
}

/**
 * Combine email and calendar analysis for comprehensive placement insights
 */
export function generateConnectorInsights(
  emails: EmailData[],
  events: CalendarEvent[],
  placement: InsurancePlacement,
): ConnectorInsights {
  const emailAnalysis = emails.length > 0 ? analyzeEmailData(emails, placement) : null
  const calendarAnalysis = events.length > 0 ? analyzeCalendarData(events, placement) : null

  // Combined score: average of both, weighted toward calendar if meeting is imminent
  let combinedScore = 0
  if (emailAnalysis && calendarAnalysis) {
    const weight = calendarAnalysis.daysToNextMeeting <= 7 ? 0.6 : 0.5
    combinedScore = emailAnalysis.emailScore * (1 - weight) + calendarAnalysis.calendarScore * weight
  } else if (emailAnalysis) {
    combinedScore = emailAnalysis.emailScore
  } else if (calendarAnalysis) {
    combinedScore = calendarAnalysis.calendarScore
  }

  let overallSentiment: ConnectorInsights["overallSentiment"] = "neutral"
  if (emailAnalysis) {
    if (emailAnalysis.sentiment === "positive") {
      const posEmails = emails.filter((e) => e.sentiment === "positive").length
      const negEmails = emails.filter((e) => e.sentiment === "negative").length
      overallSentiment = posEmails > negEmails * 1.5 ? "very_positive" : "positive"
    } else if (emailAnalysis.sentiment === "negative") {
      const negEmails = emails.filter((e) => e.sentiment === "negative").length
      const posEmails = emails.filter((e) => e.sentiment === "positive").length
      overallSentiment = negEmails > posEmails * 1.5 ? "very_negative" : "negative"
    }
  }

  // Risk factors - properly surfacing negative findings
  const riskFactors: string[] = []
  if (emailAnalysis?.sentiment === "negative") {
    riskFactors.push("⚠️ Negative communication trend")
  }
  if (calendarAnalysis?.daysToNextMeeting === 999) {
    riskFactors.push("No scheduled communication")
  }
  if ((emails.length || 0) === 0 && (events.length || 0) === 0) {
    riskFactors.push("No recent email or calendar data")
  }
  const negativeEmailCount = emails.filter((e) => e.sentiment === "negative").length
  if (negativeEmailCount > 2) {
    riskFactors.push(`Multiple negative emails (${negativeEmailCount}) - escalation risk`)
  }

  // Communication gap: days since last email
  let communicationGap = 999
  if (emails.length > 0) {
    const lastEmail = new Date(emails[emails.length - 1].receivedAt)
    communicationGap = Math.ceil((Date.now() - lastEmail.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Recommended actions
  const recommendedActions: string[] = []
  if (overallSentiment === "negative" || overallSentiment === "very_negative") {
    recommendedActions.push("⚠️ Schedule urgent clarification call to address concerns")
  }
  if (calendarAnalysis?.daysToNextMeeting && calendarAnalysis.daysToNextMeeting <= 7) {
    recommendedActions.push("Prepare renewal proposal before meeting")
  }
  if (communicationGap > 30) {
    recommendedActions.push("Initiate contact - significant gap in communication")
  }
  if (
    overallSentiment === "positive" &&
    calendarAnalysis?.daysToNextMeeting &&
    calendarAnalysis.daysToNextMeeting <= 14
  ) {
    recommendedActions.push("Opportunity for upsell or expanded coverage")
  }
  if (negativeEmailCount > 0 && negativeEmailCount <= 2) {
    recommendedActions.push("Follow up on specific client concerns from recent emails")
  }

  return {
    combinedScore: Math.round(combinedScore),
    emailAnalysis,
    calendarAnalysis,
    overallSentiment,
    riskFactors,
    recommendedActions,
    nextMeetingDate: events.length > 0 ? events[0].meetingDate : undefined,
    communicationGap,
  }
}
