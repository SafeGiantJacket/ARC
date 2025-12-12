import type { InsurancePlacement, EmailData, CalendarEvent } from "./types"

/**
 * AI-Generated Calendar Plan for optimal broker scheduling
 * Prioritizes based on renewal urgency, client sentiment, and meeting impact
 */
export interface AICalendarPlan {
  brokerSchedule: BrokerCalendarItem[]
  priorityMatrix: PriorityMatrixItem[]
  dailyFocus: string[]
  riskAreas: RiskAreaAlert[]
  recommendedActions: ActionItem[]
  generatedAt: Date
}

export interface BrokerCalendarItem {
  date: string
  time?: string
  clientName: string
  policyId: string
  actionType: "meeting" | "followup" | "proposal" | "documentation" | "decision"
  priority: "critical" | "high" | "medium" | "low"
  estimatedDuration: number // minutes
  prepTasks: string[]
  expectedOutcome: string
  relatedEmail?: string
  relatedCalendarEvent?: string
}

export interface PriorityMatrixItem {
  policyId: string
  clientName: string
  urgency: number // 1-10
  impact: number // 1-10 (revenue/relationship impact)
  priority: "critical" | "high" | "medium" | "low"
  score: number // Urgency * Impact
  reason: string
}

export interface RiskAreaAlert {
  type: "communication_gap" | "negative_sentiment" | "imminent_expiry" | "high_churn_risk"
  severity: "critical" | "high" | "medium"
  policyId: string
  clientName: string
  message: string
  recommendedAction: string
}

export interface ActionItem {
  action: string
  priority: "critical" | "high" | "medium" | "low"
  targetDate: string
  estimatedTime: number
  relatedPolicies: string[]
}

/**
 * Generate AI-optimized calendar plan for broker
 * Analyzes all renewals, emails, and meetings to create smart scheduling
 */
export function generateAICalendarPlan(
  placements: InsurancePlacement[],
  emailData: EmailData[],
  calendarEvents: CalendarEvent[],
): AICalendarPlan {
  const brokerSchedule: BrokerCalendarItem[] = []
  const priorityMatrix: PriorityMatrixItem[] = []
  const riskAreas: RiskAreaAlert[] = []
  const actionItems: ActionItem[] = []
  const dailyFocus: string[] = []

  // Process each placement
  for (const placement of placements) {
    const relatedEmails = emailData.filter((e) => e.policyId === placement.placementId)
    const relatedEvents = calendarEvents.filter((e) => e.policyId === placement.placementId)

    // Calculate urgency (0-10)
    const daysToExpiry = placement.daysUntilExpiry || 999
    let urgency = 1
    if (daysToExpiry <= 7) urgency = 10
    else if (daysToExpiry <= 14) urgency = 8
    else if (daysToExpiry <= 30) urgency = 6
    else if (daysToExpiry <= 60) urgency = 4
    else urgency = 2

    // Calculate impact (0-10)
    const impact = Math.min(10, Math.round((placement.totalPremium || 0) / 50000))

    const priority: PriorityMatrixItem["priority"] =
      urgency * impact >= 50 ? "critical" : urgency * impact >= 30 ? "high" : urgency * impact >= 15 ? "medium" : "low"

    priorityMatrix.push({
      policyId: placement.placementId,
      clientName: placement.client,
      urgency,
      impact,
      priority,
      score: urgency * impact,
      reason: `Expires in ${daysToExpiry} days, $${placement.totalPremium?.toLocaleString() || "0"} premium`,
    })

    // Schedule meetings based on priority and sentiment
    const hasNegativeEmail = relatedEmails.some((e) => e.sentiment === "negative")
    const hasMeeting = relatedEvents.length > 0
    const lastEmail = relatedEmails.length > 0 ? new Date(relatedEmails[relatedEmails.length - 1].receivedAt) : null
    const daysSinceEmail = lastEmail ? Math.ceil((Date.now() - lastEmail.getTime()) / (1000 * 60 * 60 * 24)) : 999

    // Add scheduled item
    if (priority === "critical" || (priority === "high" && !hasMeeting)) {
      const scheduledDate = calculateOptimalMeetingDate(daysToExpiry)

      brokerSchedule.push({
        date: scheduledDate,
        clientName: placement.client,
        policyId: placement.placementId,
        actionType: hasNegativeEmail ? "followup" : "meeting",
        priority,
        estimatedDuration: hasNegativeEmail ? 45 : 30,
        prepTasks: [
          "Review policy details",
          ...((placement.placementStatus === "Submitted" || placement.placementStatus === "Quote") && [
            "Prepare quote comparison",
          ]),
          ...(hasNegativeEmail && ["Address client concerns"]),
          ...(placement.placementStatus === "Declined" && ["Review declination reason"]),
        ],
        expectedOutcome: hasNegativeEmail
          ? "Resolve concerns and commit to renewal"
          : daysToExpiry <= 30
            ? "Submit proposal"
            : "Discuss renewal timeline",
        relatedEmail: relatedEmails[0]?.emailId,
        relatedCalendarEvent: relatedEvents[0]?.eventId,
      })
    }

    // Risk alerts
    if (hasNegativeEmail) {
      riskAreas.push({
        type: "negative_sentiment",
        severity: "high",
        policyId: placement.placementId,
        clientName: placement.client,
        message: "Negative client communication detected",
        recommendedAction: "Schedule urgent call to address concerns",
      })
    }

    if (daysSinceEmail > 30 && daysToExpiry <= 90) {
      riskAreas.push({
        type: "communication_gap",
        severity: daysToExpiry <= 30 ? "critical" : "high",
        policyId: placement.placementId,
        clientName: placement.client,
        message: `No contact for ${daysSinceEmail} days, expires in ${daysToExpiry} days`,
        recommendedAction: "Immediate outreach required",
      })
    }

    if (daysToExpiry <= 7) {
      riskAreas.push({
        type: "imminent_expiry",
        severity: "critical",
        policyId: placement.placementId,
        clientName: placement.client,
        message: `Policy expires in ${daysToExpiry} days`,
        recommendedAction: "Final push on renewal process",
      })
    }
  }

  // Sort schedule by priority and date
  brokerSchedule.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Generate action items from top priorities
  priorityMatrix
    .filter((item) => item.priority === "critical" || item.priority === "high")
    .slice(0, 5)
    .forEach((item) => {
      actionItems.push({
        action: `Review and prepare renewal for ${item.clientName}`,
        priority: item.priority,
        targetDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        estimatedTime: 60,
        relatedPolicies: [item.policyId],
      })
    })

  // Generate daily focus points
  const today = new Date().toISOString().split("T")[0]
  const weekPolicies = brokerSchedule.filter((item) => item.date === today)
  if (weekPolicies.length > 0) {
    dailyFocus.push(
      `Focus on ${weekPolicies.length} critical renewal(s) today`,
      ...weekPolicies.slice(0, 3).map((p) => `Contact ${p.clientName}`),
    )
  }

  return {
    brokerSchedule,
    priorityMatrix: priorityMatrix.sort((a, b) => b.score - a.score),
    dailyFocus: dailyFocus.slice(0, 5),
    riskAreas,
    recommendedActions: actionItems,
    generatedAt: new Date(),
  }
}

/**
 * Calculate optimal meeting date based on expiry urgency
 */
function calculateOptimalMeetingDate(daysToExpiry: number): string {
  const date = new Date()

  if (daysToExpiry <= 7) {
    date.setDate(date.getDate() + 1) // Tomorrow for critical
  } else if (daysToExpiry <= 14) {
    date.setDate(date.getDate() + 2) // 2 days out
  } else if (daysToExpiry <= 30) {
    date.setDate(date.getDate() + 5) // Within week
  } else {
    date.setDate(date.getDate() + 7) // Plan for next week
  }

  return date.toISOString().split("T")[0]
}

/**
 * Get AI-suggested next action for a placement
 */
export function getAINextAction(
  placement: InsurancePlacement,
  relatedEmails: EmailData[],
  relatedEvents: CalendarEvent[],
): string {
  const daysToExpiry = placement.daysUntilExpiry || 999
  const hasNegativeEmail = relatedEmails.some((e) => e.sentiment === "negative")
  const hasMeeting = relatedEvents.length > 0

  if (daysToExpiry <= 7) return "Take final action immediately"
  if (daysToExpiry <= 14 && !hasMeeting) return "Schedule urgent meeting"
  if (hasNegativeEmail) return "Address client concerns"
  if (daysToExpiry <= 30 && placement.placementStatus === "Quote") return "Follow up on quote"
  if (!hasMeeting && daysToExpiry <= 60) return "Schedule renewal discussion"
  return "Monitor and prepare documentation"
}
