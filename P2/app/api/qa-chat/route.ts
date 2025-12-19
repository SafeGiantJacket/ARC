import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, context, dataMode } = body

    if (!question || typeof question !== "string") {
      return Response.json(
        { success: false, error: "Missing question", answer: "Please provide a question.", sources: [], confidence: 0 },
        { status: 400 },
      )
    }

    const apiKey = getGroqApiKey()
    if (!apiKey) {
      return Response.json(
        {
          success: false,
          error: "API key not configured",
          answer: "Server configuration error.",
          sources: [],
          confidence: 0,
        },
        { status: 500 },
      )
    }

    const groq = createGroq({ apiKey })

    const { policies = [], placements = [], events = [], emailData = [], calendarData = [], gmailEmails = [] } = context || {}

    let dataContext = ""

    if (dataMode === "csv" && Array.isArray(placements) && placements.length > 0) {
      // CSV mode - use insurance placements with safe property access
      dataContext = `INSURANCE PLACEMENTS (Source: CSV/CRM):
${placements
          .slice(0, 30)
          .map(
            (p: any) =>
              `- Client: ${String(p?.client || "Unknown")}
   Placement: ${String(p?.placementId || "N/A")}
   Coverage: ${String(p?.coverage || "N/A")}
   Premium: $${(p?.totalPremium || 0).toLocaleString()}
   Expiry: ${String(p?.placementExpiryDate || "Unknown")} (${p?.daysUntilExpiry || 0} days)
   Status: ${String(p?.placementStatus || "Unknown")}
   Carrier: ${String(p?.carrierGroup || "Unknown")}
   Specialist: ${String(p?.placementSpecialist || "Unknown")}
   Renewal: ${p?.incumbentIndicator === "Y" ? "Yes" : "No"}
   Priority Score: ${p?.priorityScore || 0}/100`,
          )
          .join("\n\n")}`
    } else if (Array.isArray(policies) && policies.length > 0) {
      // Blockchain mode - safely handle BigInt conversion
      dataContext = `BLOCKCHAIN POLICIES:
${policies
          .slice(0, 20)
          .map((p: any) => {
            const coverage = String(p?.coverageAmount || "0")
            const premium = String(p?.premium || "0")

            return `- Policy: ${String(p?.policyName || "Unknown")} (${String(p?.policyHash || "").slice(0, 10)}...)
   Type: ${String(p?.policyType || "Unknown")}
   Coverage: ${coverage} ETH
   Premium: ${premium} ETH
   Duration: ${String(p?.duration || "Unknown")}
   Effective Date: ${String(p?.effectiveDate || "N/A")}
   Expiry Date: ${String(p?.expiryDate || "N/A")}
   Days Until Expiry: ${p?.daysUntilExpiry ?? "Unknown"}
   Status: ${Number(p?.status || 0) === 0 ? "Pending" : Number(p?.status) === 1 ? "Active" : "Expired"}
   Customer: ${String(p?.customer || "Unknown")}
   Renewals: ${Number(p?.renewalCount || 0)}`
          })
          .join("\n\n")}`
    }

    if (Array.isArray(events) && events.length > 0) {
      dataContext += `\n\nRECENT BLOCKCHAIN EVENTS:
${events
          .slice(0, 10)
          .map(
            (e: any) =>
              `- ${String(e?.type || "UNKNOWN").toUpperCase()}: ${String(e?.hash || "").slice(0, 10)}... at ${new Date(((e?.timestamp || 0) as number) * 1000).toLocaleDateString()}`,
          )
          .join("\n")}`
    }

    // Add Gmail emails to context (NEW!)
    const gmailEmailsToUse = Array.isArray(gmailEmails) ? gmailEmails : []
    const gmailContext =
      gmailEmailsToUse.length > 0
        ? `GMAIL EMAILS (Source: Live Gmail Integration with AI Sentiment Analysis):
${gmailEmailsToUse
          .slice(0, 20)
          .map(
            (e: any) =>
              `- [${String(e?.id || "N/A")}] "${String(e?.subject || "No subject")}"
   From: ${String(e?.from || "Unknown")} (${String(e?.fromEmail || "")})
   Date: ${String(e?.date || "Unknown")}
   Sentiment: ${String(e?.sentiment || "neutral")} (Confidence: ${Math.round((e?.sentimentConfidence || 0) * 100)}%)
   ${e?.linkedPolicyHash ? `Linked Policy: ${String(e.linkedPolicyHash).slice(0, 10)}...` : "No policy link"}
   Preview: ${String(e?.snippet || "No preview")}
   Gmail Link: ${String(e?.gmailLink || "N/A")}`,
          )
          .join("\n\n")}`
        : "GMAIL EMAILS: No Gmail connected or no emails synced."

    const emailsToUse = Array.isArray(emailData) ? emailData : []
    const emailContext =
      emailsToUse.length > 0
        ? `EMAIL COMMUNICATION (Source: Email CSV Upload):
${emailsToUse
          .slice(0, 15)
          .map(
            (e: any) =>
              `- [${String(e?.emailId || "N/A")}] "${String(e?.subject || "No subject")}"
   From: ${String(e?.clientName || "Unknown")}
   Received: ${String(e?.receivedAt || "Unknown")}
   Policy: ${String(e?.policyId || "N/A")}
   Sentiment: ${String(e?.sentiment || "neutral")}
   Summary: ${String(e?.summary || "No summary")}
   Threads: ${Number(e?.threadCount || 0)}
   Link: ${String(e?.sourceLink || "N/A")}`,
          )
          .join("\n\n")}`
        : ""

    const calendarsToUse = Array.isArray(calendarData) ? calendarData : []
    const calendarContext =
      calendarsToUse.length > 0
        ? `CALENDAR EVENTS (Source: Calendar CSV Upload):
${calendarsToUse
          .slice(0, 15)
          .map(
            (ev: any) =>
              `- [${String(ev?.eventId || "N/A")}] "${String(ev?.title || "Untitled")}"
   With: ${String(ev?.clientName || "Unknown")}
   Date: ${String(ev?.meetingDate || "Unknown")}
   Policy: ${String(ev?.policyId || "N/A")}
   Notes: ${String(ev?.meetingNotes || "None")}
   Participants: ${Array.isArray(ev?.participants) ? ev.participants.join(", ") : "N/A"}
   Link: ${String(ev?.sourceLink || "N/A")}`,
          )
          .join("\n\n")}`
        : "CALENDAR EVENTS: No calendar data uploaded."

    const fullContext = [dataContext, gmailContext, emailContext, calendarContext].filter((c) => c).join("\n\n")

    const systemPrompt = `You are a policy management copilot. Answer questions using ONLY the connected data below.
You have access to multiple systems: CRM/CSV data, Blockchain policies, Gmail emails (with AI sentiment analysis), Email CSV uploads, and Calendar meetings.

CONNECTED SYSTEMS DATA:
${fullContext || "No data loaded. Please load CSV data or connect to blockchain."}

RESPONSE FORMAT (JSON):
{
  "answer": "Your detailed answer based on the connected data",
  "sources": [
    {"system": "csv|blockchain|gmail|email|calendar", "recordType": "placement|policy|email|meeting", "recordId": "ID", "excerpt": "relevant data", "link": "source link"}
  ],
  "confidence": 0.0-1.0
}

Rules:
- Only use data provided above - no external knowledge
- For each fact, cite its source with proper system type and record ID
- Gmail emails have AI-analyzed sentiment - use this for insights
- Multiple sources strengthen confidence
- Email and calendar data provides context for CRM/blockchain records
- If you cannot answer with available data, say so with low confidence
- Return ONLY valid JSON with no markdown formatting`

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: systemPrompt,
      prompt: question,
      maxRetries: 2,
      temperature: 0.5,
    })

    if (!text) {
      return Response.json({
        success: false,
        error: "Empty response from AI",
        answer: "No response generated. Please try again.",
        sources: [],
        confidence: 0,
      })
    }

    let jsonText = String(text).trim()
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    }

    try {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        // Fallback: text is not JSON, return as plain answer
        return Response.json({
          success: true,
          answer: text,
          sources: [],
          confidence: 0.5,
        })
      }

      const response = JSON.parse(jsonMatch[0])

      return Response.json({
        success: true,
        answer: String(response?.answer || text),
        sources: Array.isArray(response?.sources) ? response.sources : [],
        confidence: typeof response?.confidence === "number" ? response.confidence : 0.5,
      })
    } catch (parseError) {
      console.error("[v0] JSON parse error:", parseError)
      // Graceful fallback: return raw text if JSON parsing fails
      return Response.json({
        success: true,
        answer: text,
        sources: [],
        confidence: 0.3,
      })
    }
  } catch (error) {
    console.error("[v0] Q&A error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      {
        success: false,
        error: errorMessage,
        answer: "Sorry, an error occurred. Please try again.",
        sources: [],
        confidence: 0,
      },
      { status: 500 },
    )
  }
}
