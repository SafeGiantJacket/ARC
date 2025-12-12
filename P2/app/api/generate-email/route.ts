import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { placement, policy, emailHistory, clientSentiment } = body

    if (!placement && !policy) {
      return Response.json({ success: false, error: "Missing placement or policy data" }, { status: 400 })
    }

    const apiKey = getGroqApiKey()
    const groq = createGroq({ apiKey })

    // Normalize data for prompt
    const formatEth = (val: string | number) => {
      if (!val) return "0 ETH"
      // If string looks like a large BigInt (wei), format it
      // Basic check: if length > 10, likely wei
      const strVal = val.toString()
      if (strVal.length > 10) {
        try {
          return `${(Number(strVal) / 1e18).toFixed(4)} ETH`
        } catch (e) { return `${strVal} (Wei)` }
      }
      return `${val} ETH`
    }

    const formatDays = (val: string | number) => {
      if (!val) return "Unknown"
      const num = Number(val)
      if (num > 10000) { // Likely seconds
        return `${Math.floor(num / 86400)} days`
      }
      return `${num} days`
    }

    const clientName = placement?.client || policy?.customer || "Valued Client"
    const product = placement?.productLine || policy?.policyType || "Insurance Policy"
    const coverage = placement?.coverage || formatEth(policy?.coverageAmount || 0)
    const premium = placement?.totalPremium?.toLocaleString() || formatEth(policy?.premium || 0)
    const expiryDate = placement?.placementExpiryDate || "Upcoming"
    const daysUntilExpiry = placement?.daysUntilExpiry ? `${placement.daysUntilExpiry} days` : formatDays(policy?.daysUntilExpiry || policy?.duration || 0)
    const carrier = placement?.carrierGroup || "Decentralized Protocol"
    const status = placement?.placementRenewingStatus || "Renwing"
    const segment = placement?.placementClientSegmentCode || "Standard"

    const emailHistoryContext = emailHistory
      ? `Recent Email History:
${emailHistory
        .map((e: { subject: string; sentiment: string; summary: string }) => `• ${e.subject} (${e.sentiment}): ${e.summary}`)
        .join("\n")}`
      : ""

    const prompt = `You are an expert in policy renewals. Generate 3 different personalized renewal outreach emails for this client.

CLIENT CONTEXT:
- Client Name: ${clientName}
- Product: ${product}
- Coverage: ${coverage}
- Current Premium: ${premium}
- Expiry Date: ${expiryDate}
- Days Until Expiry: ${daysUntilExpiry}
- Carrier: ${carrier}
- Renewal Status: ${status}
- Client Segment: ${segment}

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
      temperature: 0.8,
    })

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

    let emailData
    try {
      emailData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error("JSON Parse Error in Email Gen. Raw Text:", text)
      try {
        // Escape potential newlines in string values that might break JSON
        const sanitized = jsonText.replace(/\n/g, "\\n")
        emailData = JSON.parse(sanitized)
      } catch (retryError) {
        throw new Error("Failed to parse AI response as JSON")
      }
    }

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
