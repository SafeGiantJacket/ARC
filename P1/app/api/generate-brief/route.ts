import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { policyData, placement, dataMode, connectorInsights } = body

    console.log("[v0] Generate brief called, mode:", dataMode)

    const apiKey = getGroqApiKey()
    const groq = createGroq({ apiKey })

    // Build prompt based on data mode
    let dataSection = ""

    let connectorSection = ""
    if (connectorInsights) {
      const { recentEmails, upcomingEvents, sentiment, nextAction } = connectorInsights

      connectorSection = `
CONNECTED INSIGHTS (Source: Email & Calendar):
- Overall Sentiment: ${sentiment}
- Recommended Next Action: ${nextAction}

Recent Email Communication:
${recentEmails
  .map(
    (e: {
      emailId: string
      subject: string
      summary: string
      sentiment: string
      threadCount: number
      receivedAt: string
      sourceLink: string
    }) =>
      `• [${e.emailId}] ${e.subject} (${e.sentiment}, ${e.threadCount} threads)
   Received: ${e.receivedAt}
   Summary: ${e.summary}
   Link: ${e.sourceLink}`,
  )
  .join("\n")}

Upcoming Calendar Events:
${upcomingEvents
  .map(
    (ev: {
      eventId: string
      title: string
      meetingDate: string
      meetingNotes: string
      participants: string[]
      sourceLink: string
    }) =>
      `• [${ev.eventId}] ${ev.title}
   Date: ${ev.meetingDate}
   Notes: ${ev.meetingNotes}
   Participants: ${ev.participants.join(", ")}
   Link: ${ev.sourceLink}`,
  )
  .join("\n")}`
    }

    if (dataMode === "csv" && placement) {
      // CSV/Insurance placement data
      dataSection = `PLACEMENT DATA (Source: CRM/CSV Import):
- Client: ${placement.client}
- Placement ID: ${placement.placementId}
- Coverage: ${placement.coverage}
- Product Line: ${placement.productLine}
- Carrier: ${placement.carrierGroup}
- Total Premium: $${placement.totalPremium?.toLocaleString() || "0"}
- Limit: $${placement.limit?.toLocaleString() || "0"}
- Commission: ${placement.commissionPercent}% ($${placement.commissionAmount?.toLocaleString() || "0"})
- Effective Date: ${placement.placementEffectiveDate}
- Expiry Date: ${placement.placementExpiryDate}
- Days Until Expiry: ${placement.daysUntilExpiry}
- Status: ${placement.placementStatus}
- Renewing Status: ${placement.placementRenewingStatus}
- Incumbent: ${placement.incumbentIndicator === "Y" ? "Yes (Renewal)" : "No (New Business)"}
- Client Segment: ${placement.placementClientSegmentCode}
- Specialist: ${placement.placementSpecialist}
- Created By: ${placement.placementCreatedBy}

PRIORITY SCORE BREAKDOWN:
${placement.scoreBreakdown?.factors
  ?.map(
    (f: { name: string; score: number; maxScore: number; description: string }) =>
      `- ${f.name}: ${f.score}/${f.maxScore} (${f.description})`,
  )
  .join("\n")}
Total Score: ${placement.scoreBreakdown?.total || 0}/100`
    } else if (policyData) {
      // Blockchain policy data
      dataSection = `POLICY DATA (Source: Blockchain):
- Policy Name: ${policyData.policyName}
- Policy Type: ${policyData.policyType || "Unknown"}
- Coverage Amount: ${policyData.coverageAmount || "0"} ETH
- Premium: ${policyData.premium || "0"} ETH
- Days Until Expiry: ${policyData.daysUntilExpiry || "Unknown"}
- Renewal Count: ${policyData.renewalCount || "0"}
- Status: ${policyData.status || "Unknown"}
- Notes: ${policyData.notes || "None"}`
    } else {
      return Response.json({ success: false, error: "Missing policy or placement data" }, { status: 400 })
    }

    const prompt = `You are a policy management assistant. Generate a comprehensive one-page renewal brief.

${dataSection}${connectorSection}

Generate a JSON response with this exact structure:
{
  "summary": "2-3 sentence executive summary incorporating all data sources",
  "detailedBreakdown": {
    "clientProfile": "Brief description of client, business type, and coverage needs",
    "currentCoverage": "Current coverage limits, premium, carrier, and key terms",
    "riskAnalysis": "Key risks identified from claims history, industry trends, and communication",
    "marketOpportunity": "Carrier competitiveness, rate trends, coverage gaps, cross-sell opportunities",
    "timeline": "Critical dates and actions needed before expiry"
  },
  "keyInsights": [
    {"text": "insight", "source": "source name", "sourceType": "blockchain|csv|email|calendar"}
  ],
  "suggestedActions": [
    {"action": "what to do", "priority": "high|medium|low", "reason": "why", "owner": "who should do it", "dueDate": "when"}
  ],
  "riskFactors": ["risk 1", "risk 2"],
  "nextSteps": ["step 1", "step 2", "step 3"]
}

Rules:
- Summary: Brief overview (2-3 sentences max)
- Detailed Breakdown: Expand on each section with specific data, not generic advice
- Key Insights: 5-7 specific insights from all sources with source attribution
- Suggested Actions: 3-4 prioritized actions with owner and due date
- Risk Factors: 2-3 specific risks identified
- Next Steps: Clear action items ranked by urgency
- Use ONLY the structured data above, no external knowledge
- For each insight, specify source type and include ID (e.g., EM-501 for email)
- Be specific, actionable, and data-driven
- Return ONLY valid JSON`

    console.log("[v0] Calling Groq API for enhanced brief...")

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    })

    console.log("[v0] Groq response received")

    let jsonText = text
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```\n?/g, "")
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ success: false, error: "Failed to parse AI response" }, { status: 500 })
    }

    const briefData = JSON.parse(jsonMatch[0])

    return Response.json({
      success: true,
      brief: {
        ...briefData,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[v0] Error generating brief:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
