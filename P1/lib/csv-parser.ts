import type { InsurancePlacement, ScoreBreakdown } from "./types"

// Parse insurance CSV data into structured format
export function parseInsuranceCSV(csvText: string): InsurancePlacement[] {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim())
  const placements: InsurancePlacement[] = []

  // Fault-Tolerant Parsing
  for (let i = 1; i < lines.length; i++) {
    try {
      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)
      // Allow partial records if critical fields exist, or skip if too broken
      if (values.length < Math.floor(headers.length * 0.5)) {
        console.warn(`Skipping malformed CSV line ${i}: too few columns`)
        continue
      }

      const placement = mapToPlacement(headers, values)

      // Basic validation
      if (!placement.placementId && !placement.placementName) continue

      placement.daysUntilExpiry = calculateDaysUntilExpiry(placement.placementExpiryDate)
      placement.scoreBreakdown = calculateScoreBreakdown(placement)
      placement.priorityScore = placement.scoreBreakdown.total

      placements.push(placement)
    } catch (err) {
      console.error(`Error parsing CSV line ${i}:`, err)
      // Continue to next line - do not crash
    }
  }

  return deduplicatePlacements(placements)
}

function deduplicatePlacements(placements: InsurancePlacement[]): InsurancePlacement[] {
  const placementMap = new Map<string, InsurancePlacement[]>()

  // Group placements by primary key (Placement ID)
  for (const placement of placements) {
    const key = placement.placementId
    if (!placementMap.has(key)) {
      placementMap.set(key, [])
    }
    placementMap.get(key)!.push(placement)
  }

  const deduplicated: InsurancePlacement[] = []

  // Process each group of duplicate placements
  for (const [_placementId, group] of placementMap) {
    if (group.length === 1) {
      deduplicated.push(group[0])
      continue
    }

    // Multiple records for same placement - merge intelligently
    const merged = mergeGroupedPlacements(group)
    deduplicated.push(merged)
  }

  return deduplicated
}

function mergeGroupedPlacements(group: InsurancePlacement[]): InsurancePlacement {
  // Sort by: status priority, then by date (most recent first)
  const sorted = [...group].sort((a, b) => {
    const statusPriority: Record<string, number> = {
      Quote: 3,
      Submitted: 2,
      "No Response": 1,
      Declined: 0,
    }
    const aPriority = statusPriority[a.placementStatus] ?? 0
    const bPriority = statusPriority[b.placementStatus] ?? 0

    if (aPriority !== bPriority) {
      return bPriority - aPriority
    }

    // If same status, use highest premium amount (indicates most recent quote)
    return b.totalPremium - a.totalPremium
  })

  const primary = sorted[0]

  // Collect all unique carrier groups for this placement
  const carrierVariants = group
    .map((p) => ({
      carrierGroup: p.carrierGroup,
      totalPremium: p.totalPremium,
      commissionAmount: p.commissionAmount,
      limit: p.limit,
    }))
    .filter(
      (item, index, arr) =>
        arr.findIndex((x) => x.carrierGroup === item.carrierGroup && x.totalPremium === item.totalPremium) === index,
    )

  // Store variants for analytics
  primary.carrierVariants = carrierVariants
  primary.duplicateCount = group.length
  primary.hasMultipleQuotes = carrierVariants.length > 1

  // Recalculate score with duplicate awareness
  primary.scoreBreakdown = calculateScoreBreakdown(primary)
  primary.priorityScore = primary.scoreBreakdown.total

  return primary
}

// Handle CSV line parsing with quoted values
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

function mapToPlacement(headers: string[], values: string[]): InsurancePlacement {
  const getValue = (key: string): string => {
    const index = headers.findIndex(
      (h) => h.toLowerCase().replace(/[\s_]/g, "") === key.toLowerCase().replace(/[\s_]/g, ""),
    )
    return index >= 0 ? values[index] || "" : ""
  }

  return {
    client: getValue("Client"),
    placementClientLocalId: getValue("PlacementClientLocalID"),
    placementName: getValue("PlacementName"),
    coverage: getValue("Coverage"),
    productLine: getValue("ProductLine"),
    carrierGroup: getValue("CarrierGroup"),
    placementCreatedDateTime: getValue("PlacementCreatedDate/Time"),
    placementCreatedBy: getValue("PlacementCreatedBy"),
    placementCreatedById: getValue("PlacementCreatedBy(ID)"),
    responseReceivedDate: getValue("ResponseReceivedDate"),
    placementSpecialist: getValue("PlacementSpecialist"),
    placementRenewingStatus: getValue("PlacementRenewingStatus"),
    placementStatus: getValue("PlacementStatus"),
    declinationReason: getValue("DeclinationReason"),
    placementId: getValue("PlacementId"),
    placementEffectiveDate: getValue("PlacementEffectiveDate"),
    placementExpiryDate: getValue("PlacementExpiryDate"),
    incumbentIndicator: getValue("IncumbentIndicator"),
    participationStatusCode: getValue("ParticipationStatusCode"),
    placementClientSegmentCode: getValue("PlacementClientSegmentCode"),
    placementRenewingStatusCode: getValue("PlacementRenewingStatusCode"),
    limit: Number.parseFloat(getValue("Limit")) || 0,
    coveragePremiumAmount: Number.parseFloat(getValue("CoveragePremiumAmount")) || 0,
    triaPremium: Number.parseFloat(getValue("TriaPremium")) || 0,
    totalPremium: Number.parseFloat(getValue("TotalPremium")) || 0,
    commissionPercent: Number.parseFloat(getValue("Comission%")) || 0,
    commissionAmount: Number.parseFloat(getValue("ComissionAmount")) || 0,
    participationPercentage: Number.parseFloat(getValue("ParticipationPercentage")) || 100,
    carrierGroupLocalId: getValue("CarrierGroupLocalID"),
    productionCode: getValue("ProductionCode"),
    submissionSentDate: getValue("SubmissionSentDate"),
    programProductLocalCodeText: getValue("ProgramProductLocalCodeText"),
    approachNonAdmittedMarketIndicator: getValue("ApproachNonAdmittedMarketIndicator"),
    carrierIntegration: getValue("CarrierIntegration"),
  }
}

function calculateDaysUntilExpiry(expiryDateStr: string): number {
  if (!expiryDateStr || expiryDateStr === "-") return 999

  // Parse DD/MM/YY format
  const parts = expiryDateStr.split("/")
  if (parts.length === 3) {
    const day = Number.parseInt(parts[0])
    const month = Number.parseInt(parts[1]) - 1
    let year = Number.parseInt(parts[2])
    if (year < 100) year += 2000

    const expiryDate = new Date(year, month, day)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return 999
}

export function calculateScoreBreakdown(placement: InsurancePlacement): ScoreBreakdown {
  const factors: ScoreBreakdown["factors"] = []

  // Premium at Risk (max 25 points)
  const premiumScore = Math.min(25, (placement.totalPremium / 100000) * 25)
  factors.push({
    name: "Premium at Risk",
    score: Math.round(premiumScore),
    maxScore: 25,
    description: `$${placement.totalPremium.toLocaleString()} total premium`,
    impact: premiumScore > 15 ? "positive" : "neutral",
  })

  // Time to Expiry (max 25 points - closer = higher score)
  const daysUntil = placement.daysUntilExpiry || 999
  let timeScore = 0
  if (daysUntil <= 30) timeScore = 25
  else if (daysUntil <= 60) timeScore = 20
  else if (daysUntil <= 90) timeScore = 15
  else if (daysUntil <= 180) timeScore = 10
  else timeScore = 5

  factors.push({
    name: "Time to Expiry",
    score: timeScore,
    maxScore: 25,
    description: `${daysUntil} days until expiry`,
    impact: daysUntil <= 30 ? "negative" : daysUntil <= 90 ? "neutral" : "positive",
  })

  // Incumbent Status (max 15 points)
  const incumbentScore = placement.incumbentIndicator === "Y" ? 15 : 5
  factors.push({
    name: "Incumbent Status",
    score: incumbentScore,
    maxScore: 15,
    description: placement.incumbentIndicator === "Y" ? "Renewal - existing relationship" : "New business",
    impact: placement.incumbentIndicator === "Y" ? "positive" : "neutral",
  })

  // Carrier Response (max 15 points)
  let carrierScore = 10
  if (placement.placementStatus === "Quote") carrierScore = 15
  else if (placement.placementStatus === "Submitted") carrierScore = 10
  else if (placement.placementStatus === "Declined") carrierScore = 0

  factors.push({
    name: "Carrier Responsiveness",
    score: carrierScore,
    maxScore: 15,
    description: `Status: ${placement.placementStatus}`,
    impact: carrierScore >= 15 ? "positive" : carrierScore === 0 ? "negative" : "neutral",
  })

  // Client Segment (max 10 points)
  let segmentScore = 5
  if (placement.placementClientSegmentCode?.includes("RISK_MGMT")) segmentScore = 10
  else if (placement.placementClientSegmentCode?.includes("MIDDLE_MKT")) segmentScore = 7

  factors.push({
    name: "Client Segment",
    score: segmentScore,
    maxScore: 10,
    description: formatSegmentCode(placement.placementClientSegmentCode),
    impact: segmentScore >= 8 ? "positive" : "neutral",
  })

  // Commission potential (max 10 points)
  const commissionScore = Math.min(10, (placement.commissionPercent / 20) * 10)
  factors.push({
    name: "Commission Potential",
    score: Math.round(commissionScore),
    maxScore: 10,
    description: `${placement.commissionPercent}% commission rate`,
    impact: commissionScore >= 7 ? "positive" : "neutral",
  })

  const total = factors.reduce((sum, f) => sum + f.score, 0)

  return { total, factors }
}

function formatSegmentCode(code: string): string {
  if (!code) return "Unknown"
  return code
    .replace("CLIENT_SEGMENT_", "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// Generate sample CSV template
export function generateSampleCSV(): string {
  return `Client,Placement Client Local ID,Placement Name,Coverage,Product Line,Carrier Group,Placement Created Date/Time,Placement Created By,Placement Created By (ID),Response Received Date,Placement Specialist,Placement Renewing Status,Placement Status,Declination Reason,Placement Id,Placement Effective Date,Placement Expiry Date,Incumbent Indicator,Participation Status Code,Placement Client Segment Code,Placement Renewing Status Code,Limit,Coverage Premium Amount,Tria Premium,Total Premium,Comission %,Comission Amount,Participation Percentage,Carrier Group Local ID,Production Code,Submission Sent Date,Program Product Local Code Text,Approach Non Admitted Market Indicator,Carrier Integration
Global Technologies,SCR-0b810b6f4c20,SCR-8d9f15ee3a3c,General Liability,Energy and Power,Eastern Risk Management,2025-04-24T06:37:09.314837765,Kimberly Jackson,SCR-c54656cdfecb,29/07/25,Mary Jackson,In progress,Quote,-,SCR-76fd0b40a1cb,30/09/25,30/09/26,N,QUOTATION_STATUS_QUOTED,CLIENT_SEGMENT_RISK_MGMT,RENEWAL_STATUS_IN_PROGRESS,3558700,65304.28,1881.62,67311.79,8,5760.41,100,0498,PRODUCTION_TYPE_NEW,-,SCR-262eac00ad8f,N,Not Applicable`
}
