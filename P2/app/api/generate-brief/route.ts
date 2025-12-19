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
4. **Scripting**: Provide actual conversational scripts for opening, handling objections, and closing.
5. **Data Usage**: Explicitly reference data points.
6. **No Hallucinations**: Use only the provided data.
7. **White Label**: Strictly do NOT mention 'Groq', 'Llama', 'AI', or the model name in the output.
8. **JSON ONLY**: Your output must be PURE VALID JSON.
   - DO NOT use markdown code blocks (no \`\`\`json).
   - DO NOT include comments (// or /*).
   - DO NOT include trailing commas.
   - Escape all double quotes within strings (e.g. \\").
   - Ensure all keys are double-quoted.`

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
    "clientFeedback": ["Inferred client sentiment 1", "Inferred client sentiment 2"],
    "scripting": {
      "opening": "One sentence strong opening statement for the renewal call",
      "objectionHandlers": [
         {"objection": "Likely objection 1", "response": "Suggested response script"},
         {"objection": "Likely objection 2", "response": "Suggested response script"}
      ], // Ensure each handler object is properly closed with }
      "closing": "One sentence closing statement to secure the renewal"
    },
    "counterArguments": ["Argument 1", "Argument 2"],
    "winWinScenarios": ["Scenario 1", "Scenario 2"]
  }
}
`

    console.log("[v0] Calling AI API (generateText) for enhanced brief...")

    const { text } = await generateText({
      model: groq(GROQ_MODEL),
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.2, // Lower temperature to improve structural consistency
    })

    console.log("[v0] AI response received")

    // Robust JSON extraction
    let cleanText = text.trim();

    // 1. Remove wrapping code blocks if present
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

    // 2. Find the outermost JSON object
    const startIndex = cleanText.indexOf('{');
    const endIndex = cleanText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      console.error("Failed to find JSON object in response:", text);
      throw new Error("AI did not return a valid JSON object");
    }

    const jsonString = cleanText.substring(startIndex, endIndex + 1);

    let briefData;
    try {
      briefData = JSON.parse(jsonString);
    } catch (e) {
      console.error("Direct JSON parse failed. Attempting repair...", e);
      console.log("Broken JSON string:", jsonString);

      // 3. Simple repair attempts for common LLM errors
      try {
        // Fix 1: Handle escaped newlines
        let repairedJson = jsonString.replace(/\n/g, "\\n");
        // Fix 2: Remove trailing commas
        repairedJson = repairedJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

        // Fix 3: Handle missing closing brace in objectionHandlers specifically (observed error)
        // Looks for "response": "..." ] and converts to "response": "..." } ]
        // Uses regex that respects escaped quotes
        repairedJson = repairedJson.replace(
          /("response"\s*:\s*"(?:[^"\\]|\\.)*")\s*]/g,
          '$1}]'
        );

        briefData = JSON.parse(repairedJson);
      } catch (e2) {
        throw new Error("Failed to parse AI response as JSON");
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
