export interface Policy {
  policyHash: string
  policyName: string
  policyType: string
  coverageAmount: bigint
  premium: bigint
  startTime: bigint
  duration: bigint
  renewalCount: bigint
  notes: string
  status: number
  customer: string
}

export interface PolicyEvent {
  type: "created" | "signed" | "renewed" | "expired"
  hash: string
  customer?: string
  renewalCount?: number
  timestamp: number
  transactionHash: string
}

export interface InsurancePlacement {
  client: string
  placementClientLocalId: string
  placementName: string
  coverage: string
  productLine: string
  carrierGroup: string
  placementCreatedDateTime: string
  placementCreatedBy: string
  placementCreatedById: string
  responseReceivedDate: string
  placementSpecialist: string
  placementRenewingStatus: string
  placementStatus: string
  declinationReason: string
  placementId: string
  placementEffectiveDate: string
  placementExpiryDate: string
  incumbentIndicator: string
  participationStatusCode: string
  placementClientSegmentCode: string
  placementRenewingStatusCode: string
  limit: number
  coveragePremiumAmount: number
  triaPremium: number
  totalPremium: number
  commissionPercent: number
  commissionAmount: number
  participationPercentage: number
  carrierGroupLocalId: string
  productionCode: string
  submissionSentDate: string
  programProductLocalCodeText: string
  approachNonAdmittedMarketIndicator: string
  carrierIntegration: string
  // Computed fields for scoring
  daysUntilExpiry?: number
  priorityScore?: number
  scoreBreakdown?: ScoreBreakdown
  carrierVariants?: Array<{
    carrierGroup: string
    totalPremium: number
    commissionAmount: number
    limit: number
  }>
  duplicateCount?: number
  hasMultipleQuotes?: boolean
}

export interface ScoreBreakdown {
  total: number
  factors: {
    name: string
    score: number
    maxScore: number
    description: string
    impact: "positive" | "negative" | "neutral"
  }[]
}

export interface RenewalPipelineItem {
  policy?: Policy // For blockchain mode
  placement?: InsurancePlacement // For CSV mode
  daysUntilExpiry: number
  priorityScore: number
  urgencyLevel: "critical" | "high" | "medium" | "low"
  factors: PriorityFactors
  source?: DataSource
  scoreBreakdown?: ScoreBreakdown
  manualOverride?: {
    score: number
    reason: string
    overriddenBy?: string
    overriddenAt?: Date
  }
}

export interface PriorityFactors {
  premiumAtRisk: number
  timeToExpiry: number
  claimsHistory: number
  carrierResponsiveness: number
  churnLikelihood: number
}

export interface DataSource {
  type: "blockchain" | "crm" | "csv" | "email" | "calendar"
  id: string
  lastSync?: Date
}

export interface CSVRenewalData {
  policyHash: string
  customerName?: string
  customerEmail?: string
  claimsCount?: number
  carrierRating?: number
  churnRisk?: number
  crmId?: string
  calendarEventId?: string
  meetingNotes?: string
  lastContactDate?: string
  carrierStatus?: string
  recentEmails?: string
}

export interface EmailData {
  emailId: string
  subject: string
  clientName: string
  receivedAt: string
  policyId: string
  summary: string
  sentiment: "positive" | "neutral" | "negative"
  threadCount: number
  sourceLink: string
  senderEmail?: string
}

export interface CalendarEvent {
  eventId: string
  title: string
  clientName: string
  meetingDate: string
  policyId: string
  meetingNotes: string
  participants: string[]
  sourceLink: string
}

export interface TimeWindow {
  days: number
  label: string
  color: string
}

export interface PipelineFilters {
  timeWindow: number
  policyType: string
  urgencyLevel: string
  owner: string
  sortBy: "priority" | "expiry" | "premium"
}

export interface PriorityWeights {
  premiumAtRisk: number
  timeToExpiry: number
  claimsHistory: number
  carrierResponsiveness: number
  churnLikelihood: number
}

export interface RenewalBrief {
  policyHash: string
  summary: string
  keyInsights: {
    text: string
    source: string
    sourceType: DataSource["type"]
    link?: string
  }[]
  suggestedActions: {
    action: string
    priority: "high" | "medium" | "low"
    reason: string
  }[]
  riskFactors: string[]
  negotiationStrategy?: {
    goal: string
    tactics: {
      technique: string
      description: string
    }[]
    marketTrends: string[]
    clientFeedback: string[]
  }
  generatedAt: Date
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: "renewal" | "reminder" | "followup" | "custom"
  variables: string[]
}

export interface ScheduledEmail {
  id: string
  templateId: string
  recipientEmail: string
  policyHash: string
  scheduledAt: Date
  status: "pending" | "sent" | "failed"
  attachBrief: boolean
  briefUrl?: string
}

export interface QAMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  sources?: QASource[]
  confidence?: number
  isError?: boolean
}

export interface QASource {
  system: "blockchain" | "crm" | "csv" | "gmail" | "email" | "calendar"
  recordType: string
  recordId: string
  link?: string
  excerpt: string
}

export type DataMode = "blockchain" | "csv"

// Gmail Integration Types
export interface GmailEmail {
  id: string // Gmail message ID
  threadId: string
  subject: string
  from: string
  fromEmail: string
  to: string
  date: string // ISO timestamp
  snippet: string // Short preview
  body: string // Full email body (plain text)
  bodyHtml?: string // HTML version
  labels: string[]
  sentiment?: "positive" | "neutral" | "negative"
  sentimentConfidence?: number
  linkedPolicyHash?: string
  linkedCustomerAddress?: string
  linkConfidence?: number
  isUnread: boolean
  hasAttachments: boolean
  gmailLink: string // Direct link to Gmail
}

export interface GmailAuthStatus {
  isConnected: boolean
  email?: string
  lastSync?: Date
  emailCount?: number
  error?: string
}

export interface EmailSentiment {
  emailId: string
  sentiment: "positive" | "neutral" | "negative"
  confidence: number
  keyTopics: string[]
  urgencyLevel: "high" | "medium" | "low"
  summary: string
}

export interface PolicyEmailLink {
  emailId: string
  policyHash?: string
  customerAddress?: string
  confidence: number
  matchReason: string
}
