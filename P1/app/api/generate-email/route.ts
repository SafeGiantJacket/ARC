import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { placement, emailHistory, clientSentiment } = body

    if (!placement) {
      return Response.json({ success: false, error: "Missing placement data" }, { status: 400 })
    }

    const apiKey = getGroqApiKey()
    const groq = createGroq({ apiKey })

    const emailHistoryContext = emailHistory
      ? `Recent Email History:
${emailHistory
  .map((e: { subject: string; sentiment: string; summary: string }) => `• ${e.subject} (${e.sentiment}): ${e.summary}`)
  .join("\n")}`
      : ""

    const prompt = `You are an expert in policy renewals. Generate 3 different personalized renewal outreach emails for this client.

CLIENT CONTEXT:
- Client Name: ${placement.client}
- Product: ${placement.productLine}
- Coverage: ${placement.coverage}
- Current Premium: $${placement.totalPremium?.toLocaleString()}
- Expiry Date: ${placement.placementExpiryDate}
- Days Until Expiry: ${placement.daysUntilExpiry}
- Carrier: ${placement.carrierGroup}
- Renewal Status: ${placement.placementRenewingStatus}
- Client Segment: ${placement.placementClientSegmentCode}

${emailHistoryContext}
Client Sentiment: ${clientSentiment || "neutral"}

Generate 3 DISTINCT email variations in this JSON format:
{
  "emails": [
    {
      "subject": "email subject",
      "tone": "professional|consultative|urgent",
      "body": "email body (2-3 paragraphs, personalized for this client)",
      "rationale": "why this approach works for this client"
    }
  ]
}

Rules:
- Variation 1: Professional/consultative tone (best for long-term clients)
- Variation 2: Urgent tone (emphasize expiry date and action needed)
- Variation 3: Value-focused tone (highlight coverage improvements or cost savings)
- Each should reference specific client context and recent communications
- Include variable placeholders like {{clientName}}, {{broker}}, {{expiryDate}}
- Keep emails concise but compelling (3-4 short paragraphs max)
- Return ONLY valid JSON with no markdown formatting`

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      prompt,
      maxTokens: 2500,
      temperature: 0.8,
    })

    let jsonText = text
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ success: false, error: "Failed to parse AI response" }, { status: 500 })
    }

    const emailData = JSON.parse(jsonMatch[0])

    return Response.json({
      success: true,
      emails: emailData.emails || [],
    })
  } catch (error) {
    console.error("[v0] Error generating personalized emails:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
