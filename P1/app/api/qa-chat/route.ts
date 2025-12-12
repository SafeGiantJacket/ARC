import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { question, context, dataMode } = body

    if (!question) {
      return Response.json(
        { success: false, error: "Missing question", answer: "Please provide a question.", sources: [], confidence: 0 },
        { status: 400 },
      )
    }

    const apiKey = getGroqApiKey()
    const groq = createGroq({ apiKey })

    const { policies = [], placements = [], events = [], emailData = [], calendarData = [] } = context || {}

    let dataContext = ""

    if (dataMode === "csv" && placements.length > 0) {
      // CSV mode - use insurance placements
      dataContext = `INSURANCE PLACEMENTS (Source: CSV/CRM):
${placements
  .slice(0, 30)
  .map(
    (p: {
      client: string
      placementId: string
      coverage: string
      totalPremium: number
      placementExpiryDate: string
      daysUntilExpiry: number
      placementStatus: string
      carrierGroup: string
      placementSpecialist: string
      incumbentIndicator: string
      priorityScore: number
    }) =>
      `- Client: ${p.client}
   Placement: ${p.placementId}
   Coverage: ${p.coverage}
   Premium: $${p.totalPremium?.toLocaleString()}
   Expiry: ${p.placementExpiryDate} (${p.daysUntilExpiry} days)
   Status: ${p.placementStatus}
   Carrier: ${p.carrierGroup}
   Specialist: ${p.placementSpecialist}
   Renewal: ${p.incumbentIndicator === "Y" ? "Yes" : "No"}
   Priority Score: ${p.priorityScore}/100`,
  )
  .join("\n\n")}`
    } else if (policies.length > 0) {
      // Blockchain mode
      dataContext = `BLOCKCHAIN POLICIES:
${policies
  .slice(0, 20)
  .map(
    (p: {
      policyName: string
      policyHash: string
      policyType: string
      coverageAmount: string
      premium: string
      status: number
      customer: string
      renewalCount: number
    }) =>
      `- Policy: ${p.policyName} (${p.policyHash?.slice(0, 10)}...)
   Type: ${p.policyType}
   Coverage: ${p.coverageAmount} ETH
   Premium: ${p.premium} ETH
   Status: ${p.status === 0 ? "Pending" : p.status === 1 ? "Active" : "Expired"}
   Customer: ${p.customer}
   Renewals: ${p.renewalCount}`,
  )
  .join("\n\n")}`
    }

    if (events.length > 0) {
      dataContext += `\n\nRECENT BLOCKCHAIN EVENTS:
${events
  .slice(0, 10)
  .map(
    (e: { type: string; hash: string; timestamp: number }) =>
      `- ${e.type?.toUpperCase()}: ${e.hash?.slice(0, 10)}... at ${new Date((e.timestamp || 0) * 1000).toLocaleDateString()}`,
  )
  .join("\n")}`
    }

    const emailsToUse = emailData.length > 0 ? emailData : []
    const emailContext =
      emailsToUse.length > 0
        ? `EMAIL COMMUNICATION (Source: Email CSV Upload):
${emailsToUse
  .slice(0, 15)
  .map(
    (e: {
      emailId: string
      subject: string
      clientName: string
      receivedAt: string
      policyId: string
      summary: string
      sentiment: string
      threadCount: number
      sourceLink: string
    }) =>
      `- [${e.emailId}] "${e.subject}"
   From: ${e.clientName}
   Received: ${e.receivedAt}
   Policy: ${e.policyId}
   Sentiment: ${e.sentiment}
   Summary: ${e.summary}
   Threads: ${e.threadCount}
   Link: ${e.sourceLink}`,
  )
  .join("\n\n")}`
        : "EMAIL COMMUNICATION: No email data uploaded. Upload an email CSV to include email context."

    const calendarsToUse = calendarData.length > 0 ? calendarData : []
    const calendarContext =
      calendarsToUse.length > 0
        ? `CALENDAR EVENTS (Source: Calendar CSV Upload):
${calendarsToUse
  .slice(0, 15)
  .map(
    (ev: {
      eventId: string
      title: string
      clientName: string
      meetingDate: string
      policyId: string
      meetingNotes: string
      participants: string[]
      sourceLink: string
    }) =>
      `- [${ev.eventId}] "${ev.title}"
   With: ${ev.clientName}
   Date: ${ev.meetingDate}
   Policy: ${ev.policyId}
   Notes: ${ev.meetingNotes}
   Participants: ${ev.participants?.join(", ") || "N/A"}
   Link: ${ev.sourceLink}`,
  )
  .join("\n\n")}`
        : "CALENDAR EVENTS: No calendar data uploaded. Upload a calendar CSV to include meeting context."

    const fullContext = [dataContext, emailContext, calendarContext].filter((c) => c).join("\n\n")

    const systemPrompt = `You are a policy management copilot. Answer questions using ONLY the connected data below.
You have access to multiple systems: CRM/CSV data, Blockchain policies, Email communication, and Calendar meetings.

CONNECTED SYSTEMS DATA:
${fullContext || "No data loaded. Please load CSV data or connect to blockchain."}

RESPONSE FORMAT (JSON):
{
  "answer": "Your detailed answer based on the connected data",
  "sources": [
    {"system": "csv|blockchain|email|calendar", "recordType": "placement|policy|email|meeting", "recordId": "ID", "excerpt": "relevant data", "link": "source link"}
  ],
  "confidence": 0.0-1.0
}

Rules:
- Only use data provided above - no external knowledge
- For each fact, cite its source with proper system type and record ID
- Multiple sources strengthen confidence
- Email and calendar data provides context for CRM/blockchain records
- If you cannot answer with available data, say so with low confidence
- Return ONLY valid JSON with no markdown formatting`

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: systemPrompt,
      prompt: question,
      maxTokens: 2000,
      temperature: 0.5,
    })

    // Parse JSON
    let jsonText = text
    if (jsonText.includes("```")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ success: true, answer: text, sources: [], confidence: 0.5 })
    }

    const response = JSON.parse(jsonMatch[0])

    return Response.json({
      success: true,
      answer: response.answer || text,
      sources: response.sources || [],
      confidence: response.confidence || 0.5,
    })
  } catch (error) {
    console.error("[v0] Q&A error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        answer: "Sorry, an error occurred. Please try again.",
        sources: [],
        confidence: 0,
      },
      { status: 500 },
    )
  }
}
