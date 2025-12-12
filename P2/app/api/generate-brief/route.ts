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
            (e: any) =>
              `• [${e.emailId}] ${e.subject} (${e.sentiment}, ${e.threadCount} threads)
   Received: ${e.receivedAt}
   Summary: ${e.summary}
   Link: ${e.sourceLink}`,
          )
          .join("\n")}

Upcoming Calendar Events:
${upcomingEvents
          .map(
            (ev: any) =>
              `• [${ev.eventId}] ${ev.title}
   Date: ${ev.meetingDate}
   Notes: ${ev.meetingNotes}
   Participants: ${ev.participants.join(", ")}
   Link: ${ev.sourceLink}`,
          )
          .join("\n")}`
    }

    if (dataMode === "csv" && placement) {
      dataSection = `PLACEMENT DATA (Source: CRM/CSV Import):
- Client: ${placement.client}
- Placement ID: ${placement.placementId}
- Coverage: ${placement.coverage}
- Product Line: ${placement.productLine}
- Total Premium: $${placement.totalPremium?.toLocaleString() || "0"}
- Status: ${placement.placementStatus}
- Expiry Date: ${placement.placementExpiryDate}
- Days Until Expiry: ${placement.daysUntilExpiry}
`
    } else if (policyData) {
      // Blockchain policy data
      const rawDays = policyData.daysUntilExpiry;
      const displayDays = (typeof rawDays === 'number' && rawDays > 1000)
        ? Math.floor(rawDays / 86400)
        : rawDays;

      dataSection = `POLICY DATA (Source: Blockchain):
- Policy Name: ${policyData.policyName}
- Policy Type: ${policyData.policyType || "Unknown"}
- Coverage Amount: ${policyData.coverageAmount || "0"} ETH
- Premium: ${policyData.premium || "0"} ETH
- Days Until Expiry: ${displayDays || "Unknown"}
- Renewal Count: ${policyData.renewalCount || "0"}`
    } else {
      return Response.json({ success: false, error: "Missing policy or placement data" }, { status: 400 })
    }

    const systemPrompt = `You are an expert insurance broker assistant. Generate a professional "One-Page Renewal Brief" for this policy.
Your goal is to provide a concise, high-impact summary that prepares the broker for a renewal discussion in under 60 seconds.
Rules:
1. **Summary**: Must be a single, coherent paragraph. No bullet points. Mention the client name, policy type, major risks or opportunities, and overall sentiment.
2. **Key Insights**: distinct points (point-wise information). Include at least one insight from Policy Data, one from Email/Communication (if available), and one regarding Carrier/Status.
3. **Tone**: Professional, strategic, and action-oriented.
4. **Data Usage**: Explicitly reference data points (e.g., 'Client expressed concern about pricing in email dated...').
5. **No Hallucinations**: Use only the provided data.
6. **Format**: Return ONLY valid, minified JSON. Do not include markdown formatting or explanations.`

    const prompt = `
${dataSection}${connectorSection}

Generate a JSON response with this exact structure:
{
  "summary": "2-3 sentence executive summary paragraph incorporating all data sources",
  "detailedBreakdown": {
    "clientProfile": "Brief description of client, business type, and coverage needs",
    "currentCoverage": "Current coverage limits, premium, carrier, and key terms",
    "riskAnalysis": "Key risks identified from claims history, industry trends, and communication",
    "marketOpportunity": "Carrier competitiveness, rate trends, coverage gaps, cross-sell opportunities",
    "timeline": "Critical dates and actions needed before expiry"
  },
  "keyInsights": [
    {"text": "Specific insight sourced from data", "source": "e.g. Email from Client / Policy Data", "sourceType": "blockchain|csv|email|calendar|crm"}
  ],
  "suggestedActions": [
    {"action": "Specific step to take", "priority": "high|medium|low", "reason": "Justification", "owner": "Broker", "dueDate": "Date"}
  ],
  "riskFactors": ["Risk 1", "Risk 2"],
  "negotiationStrategy": {
    "goal": "Target renewal outcome (e.g. Rate Flat, +5% Premium)",
    "tactics": [
      {"technique": "Tactic Name", "description": "How to apply it specifically for this client"}
    ],
    "marketTrends": ["Relevant market trend 1", "Relevant market trend 2"],
    "clientFeedback": ["Inferred client sentiment 1", "Inferred client sentiment 2"]
  }
}
`

    console.log("[v0] Calling Groq API (generateText) for enhanced brief...")

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.5, // Lower temperature for more consistent JSON
    })

    console.log("[v0] Groq response received")

    // Robust JSON cleaning
    let jsonText = text.trim()

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '')

    // Find the first '{' and last '}' to strip any preamble/postscript
    const firstOpenBrace = jsonText.indexOf('{')
    const lastCloseBrace = jsonText.lastIndexOf('}')

    if (firstOpenBrace !== -1 && lastCloseBrace !== -1) {
      jsonText = jsonText.substring(firstOpenBrace, lastCloseBrace + 1)
    }

    let briefData
    try {
      briefData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error("JSON Parse Error. Raw Text:", text)
      // Fallback: Try to clean common JSON errors (newline in strings) if simple parse fails
      // This is a basic attempt to salvage
      try {
        // Escape potential newlines in string values that might break JSON
        const sanitized = jsonText.replace(/\n/g, "\\n")
        briefData = JSON.parse(sanitized)
      } catch (retryError) {
        throw new Error("Failed to parse AI response as JSON")
      }
    }

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
