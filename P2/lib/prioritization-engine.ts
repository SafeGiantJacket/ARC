import type { Policy, RenewalPipelineItem, PriorityFactors, CSVRenewalData, PriorityWeights, InteractionEvent, MarketConditions } from "./types"
import { formatEther } from "./web3-utils"

// Time windows for renewal pipeline
export const TIME_WINDOWS = [
  { days: 180, label: "6 Months", color: "text-blue-400" },
  { days: 90, label: "3 Months", color: "text-yellow-400" },
  { days: 30, label: "30 Days", color: "text-orange-400" },
  { days: 7, label: "7 Days", color: "text-red-400" },
] as const

export const DEFAULT_WEIGHTS: PriorityWeights = {
  premiumAtRisk: 0.25,
  timeToExpiry: 0.20,
  claimsHistory: 0.15,
  carrierResponsiveness: 0.1,
  churnLikelihood: 0.15,
  // New weights
  marketConditions: 0.1,
  interactionHealth: 0.05,
}

export const WEIGHT_LABELS: Record<keyof PriorityWeights, string> = {
  premiumAtRisk: "Premium at Risk",
  timeToExpiry: "Time to Expiry",
  claimsHistory: "Claims History",
  carrierResponsiveness: "Carrier Responsiveness",
  churnLikelihood: "Churn Likelihood",
  marketConditions: "Market Conditions",
  interactionHealth: "Interaction Health",
}

/**
 * Calculate days until policy expiry
 * Fixed to properly handle negative days - they now get set to 0 (expired) not 999
 */
export function calculateDaysUntilExpiry(policy: Policy): number {
  if (policy.status === 0) return 999 // Pending - not started, treat as low priority
  if (policy.status === 2) return 0 // Already expired

  const expiryTime = Number(policy.startTime) + Number(policy.duration)
  const now = Math.floor(Date.now() / 1000)
  const daysRemaining = Math.ceil((expiryTime - now) / (24 * 60 * 60))
  return Math.max(0, daysRemaining)
}

/**
 * Calculate premium at risk score (0-100) using Logarithmic Normalization
 * Handles outliers by using log scale so massive premiums don't squash others
 */
function calculatePremiumScore(policy: Policy, allPolicies: Policy[]): number {
  try {
    const premium = Number(formatEther(policy.premium))
    if (premium <= 0) return 0

    const allPremiums = allPolicies
      .map((p) => Number(formatEther(p.premium)))
      .filter(p => p > 0)

    if (allPremiums.length === 0) return 0

    const maxPremium = Math.max(...allPremiums)
    if (maxPremium <= 0) return 0

    // Log transform
    const logPremium = Math.log10(premium)
    const maxLogPremium = Math.log10(maxPremium)

    if (maxLogPremium === 0) return 100

    const score = (logPremium / maxLogPremium) * 100
    return Math.min(100, Math.max(0, score))
  } catch (e) {
    console.error("Error calculating premium score", e)
    return 0
  }
}

/**
 * Calculate time urgency score (0-100) using Exponential Decay
 * Score increases exponentially as expiry approaches
 * Formula: 100 * e^(-k * days)
 */
function calculateTimeScore(daysUntilExpiry: number): number {
  if (daysUntilExpiry >= 365) return 5 // > 1 year
  if (daysUntilExpiry <= 0) return 100 // Expired

  // Decay constant k ~ 0.012 ensures 90 days = ~35 score
  const k = 0.012
  const score = 100 * Math.exp(-k * daysUntilExpiry)

  return Math.round(Math.min(100, Math.max(5, score)))
}

/**
 * Get urgency level based on days until expiry
 */
function getUrgencyLevel(daysUntilExpiry: number): RenewalPipelineItem["urgencyLevel"] {
  if (daysUntilExpiry >= 999) return "low" // Pending/inactive
  if (daysUntilExpiry <= 0) return "critical" // Expired
  if (daysUntilExpiry <= 7) return "critical"
  if (daysUntilExpiry <= 30) return "high"
  if (daysUntilExpiry <= 90) return "medium"
  return "low"
}

/**
   * Calculate Interaction Health Score (0-100)
   * 100 = Silent/Ghosting (High Risk), 0 = Active/Good
   */
function calculateInteractionHealth(history?: InteractionEvent[]): number {
  if (!history || history.length === 0) return 50 // Unknown

  // Sort by date descending
  const sorted = [...history].sort((a, b) => b.date.getTime() - a.date.getTime())
  const lastContact = sorted[0]
  const daysSinceContact = Math.floor((Date.now() - lastContact.date.getTime()) / (1000 * 60 * 60 * 24))

  // 1. Silence Risk: If > 14 days, score increases
  let score = 0
  if (daysSinceContact > 30) score += 60
  else if (daysSinceContact > 14) score += 30

  // 2. Sentiment Risk
  const negativeInteractions = history.filter(h => h.sentiment === "negative").length
  score += (negativeInteractions * 10)

  // 3. Ghosting check (Last outbound has no inbound reply)
  if (lastContact.direction === "outbound" && daysSinceContact > 7) {
    score += 20
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Calculate Market Risk Score (0-100)
 */
function calculateMarketRisk(conditions?: MarketConditions): number {
  if (!conditions) return 30 // Default

  let score = 30
  if (conditions.marketType === "hard") score += 40
  if (conditions.sectorTrend === "volatile") score += 20
  if (conditions.sectorTrend === "crisis") score += 40
  if (conditions.carrierAppetite === "low") score += 30

  // Normalize
  return Math.min(100, score)
}

/**
 * Calculate priority factors for a policy
 */
export function calculatePriorityFactors(
  policy: Policy,
  allPolicies: Policy[],
  csvData?: CSVRenewalData,
): PriorityFactors {
  const daysUntilExpiry = calculateDaysUntilExpiry(policy)

  const marketConditionsVal = calculateMarketRisk(undefined) // TODO: Pass real conditions
  const interactionHealthVal = calculateInteractionHealth(undefined) // TODO: Pass real history

  return {
    premiumAtRisk: Math.round(calculatePremiumScore(policy, allPolicies)),
    timeToExpiry: Math.round(calculateTimeScore(daysUntilExpiry)),
    // Use CSV data if available, otherwise use defaults
    claimsHistory: csvData?.claimsCount
      ? Math.min(100, csvData.claimsCount * 20) // Each claim adds 20 points
      : 30,
    carrierResponsiveness: csvData?.carrierRating
      ? Math.round((5 - csvData.carrierRating) * 25) // Inverse: lower rating = higher concern
      : 50,
    churnLikelihood: csvData?.churnRisk ?? 40,
    marketConditions: marketConditionsVal,
    interactionHealth: interactionHealthVal,
  }
}

/**
 * Calculate overall priority score (0-100) with customizable weights
 * Fixed weight normalization to ensure proper calculation
 */
export function calculatePriorityScore(factors: PriorityFactors, weights: PriorityWeights = DEFAULT_WEIGHTS): number {
  // Normalize weights to ensure they sum to 1.0 for proper scoring
  const weightsSum = Object.values(weights).reduce((sum, w) => sum + w, 0)

  // Prevent division by zero
  if (weightsSum === 0) {
    return 0
  }

  const normalizedWeights = {
    premiumAtRisk: weights.premiumAtRisk / weightsSum,
    timeToExpiry: weights.timeToExpiry / weightsSum,
    claimsHistory: weights.claimsHistory / weightsSum,
    carrierResponsiveness: weights.carrierResponsiveness / weightsSum,
    churnLikelihood: weights.churnLikelihood / weightsSum,
    marketConditions: (weights.marketConditions || 0) / weightsSum,
    interactionHealth: (weights.interactionHealth || 0) / weightsSum,
  }

  // Calculate weighted score - each factor is 0-100, normalized weights sum to 1.0
  const score =
    factors.premiumAtRisk * normalizedWeights.premiumAtRisk +
    factors.timeToExpiry * normalizedWeights.timeToExpiry +
    factors.claimsHistory * normalizedWeights.claimsHistory +
    factors.carrierResponsiveness * normalizedWeights.carrierResponsiveness +
    factors.churnLikelihood * normalizedWeights.churnLikelihood +
    (factors.marketConditions || 0) * (normalizedWeights.marketConditions || 0) +
    (factors.interactionHealth || 0) * (normalizedWeights.interactionHealth || 0)

  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Build renewal pipeline from policies
 */
export function buildRenewalPipeline(
  policies: Policy[],
  csvDataMap: Map<string, CSVRenewalData> = new Map(),
  timeWindowDays = 180,
  weights: PriorityWeights = DEFAULT_WEIGHTS,
): RenewalPipelineItem[] {
  const pipeline: RenewalPipelineItem[] = []

  for (const policy of policies) {
    if (policy.status !== 1) continue

    const daysUntilExpiry = calculateDaysUntilExpiry(policy)

    // Filter by time window - include expired (0 days) as they need immediate action
    if (daysUntilExpiry > timeWindowDays && daysUntilExpiry !== 0) continue

    const csvData = csvDataMap.get(policy.policyHash)
    const factors = calculatePriorityFactors(policy, policies, csvData)
    const priorityScore = calculatePriorityScore(factors, weights)

    pipeline.push({
      policy,
      daysUntilExpiry,
      priorityScore,
      urgencyLevel: getUrgencyLevel(daysUntilExpiry),
      factors,
      narrativeExplanation: generateRiskExplanation(factors, policy),
      source: csvData
        ? {
          type: "csv",
          id: csvData.crmId || policy.policyHash,
          lastSync: new Date(),
        }
        : {
          type: "blockchain",
          id: policy.policyHash,
        },
    })
  }

  // Sort by priority score (highest first)
  return pipeline.sort((a, b) => b.priorityScore - a.priorityScore)
}

/**
 * Parse CSV data for renewal enrichment
 * Expected columns: policyHash, customerName, email, claims, carrierRating, churnRisk, crmId, calendarEventId, meetingNotes, lastContactDate, carrierStatus
 */
export function parseCSVData(csvContent: string): Map<string, CSVRenewalData> {
  const map = new Map<string, CSVRenewalData>()
  const lines = csvContent.trim().split("\n")

  if (lines.length < 2) return map

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    const record: CSVRenewalData = { policyHash: "" }

    headers.forEach((header, idx) => {
      const value = values[idx]
      if (!value) return

      switch (header) {
        case "policyhash":
        case "policy_hash":
        case "hash":
          record.policyHash = value
          break
        case "customername":
        case "customer_name":
        case "name":
          record.customerName = value
          break
        case "email":
        case "customeremail":
          record.customerEmail = value
          break
        case "claims":
        case "claimscount":
        case "claims_count":
          record.claimsCount = Number.parseInt(value) || 0
          break
        case "carrierrating":
        case "carrier_rating":
        case "rating":
          record.carrierRating = Number.parseFloat(value) || 3
          break
        case "churnrisk":
        case "churn_risk":
        case "churn":
          record.churnRisk = Number.parseInt(value) || 40
          break
        case "crmid":
        case "crm_id":
          record.crmId = value
          break
        case "calendareventid":
        case "calendar_id":
        case "eventid":
          record.calendarEventId = value
          break
        case "meetingnotes":
        case "meeting_notes":
          record.meetingNotes = value
          break
        case "lastcontactdate":
        case "last_contact_date":
          record.lastContactDate = value
          break
        case "carrierstatus":
        case "carrier_status":
          record.carrierStatus = value
          break
        case "recentemails":
        case "recent_emails":
          record.recentEmails = value
          break
      }
    })

    if (record.policyHash) {
      map.set(record.policyHash, record)
    }
  }

  return map
}

/**
 * Get score breakdown explanation
 */
export function getScoreExplanation(factors: PriorityFactors): string[] {
  const explanations: string[] = []

  if (factors.premiumAtRisk >= 70) {
    explanations.push("High premium at risk")
  }
  if (factors.timeToExpiry >= 80) {
    explanations.push("Expiring soon")
  }
  if (factors.claimsHistory >= 60) {
    explanations.push("History of claims")
  }
  if (factors.carrierResponsiveness >= 60) {
    explanations.push("Carrier responsiveness concerns")
  }
  if (factors.churnLikelihood >= 60) {
    explanations.push("High churn risk")
  }

  return explanations.length > 0 ? explanations : ["Standard renewal"]
}

/**
 * Generate Natural Language Risk Explanation
 */
export function generateRiskExplanation(factors: PriorityFactors, policy: Policy): string {
  const reasons: string[] = []

  // 1. Premium
  if (factors.premiumAtRisk > 80) reasons.push("Top 5 Client by Premium")
  else if (factors.premiumAtRisk > 60) reasons.push("High Value Account")

  // 2. Interaction (The "Ghosting" check)
  if ((factors.interactionHealth || 0) > 70) reasons.push("Client has been silent for >14 days")

  // 3. Claims
  if (factors.claimsHistory > 50) reasons.push("Multiple recent claims flagged")

  // 4. Time
  if (factors.timeToExpiry > 90) reasons.push("Expired or expiring within 48h")

  // 5. Market
  if ((factors.marketConditions || 0) > 60) reasons.push("Hard Market conditions for this sector")

  if (reasons.length === 0) return "Routine renewal with no major risk flags."

  return `Priority elevated due to: ${reasons.join(", ")}.`
}

export function generateCSVTemplate(): string {
  return `policyHash,customerName,email,claims,carrierRating,churnRisk,crmId,calendarEventId,meetingNotes,lastContactDate,carrierStatus
0x123...,John Doe,john@example.com,2,4,30,CRM-001,EVT-101,Client concerned about rising premiums,2025-01-15,Responsive
0x456...,Jane Smith,jane@example.com,0,5,10,CRM-002,EVT-102,Positive feedback on renewal speed,2025-01-10,Very Responsive`
}
