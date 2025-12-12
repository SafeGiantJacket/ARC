/**
 * Gmail Sentiment Analyzer
 * Uses Groq AI to analyze email sentiment and extract insights
 */

import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "./groq-config"
import type { GmailEmail, EmailSentiment } from "./types"
import { GMAIL_CONFIG } from "./gmail-config"

/**
 * Analyze sentiment of a single email
 */
export async function analyzeEmailSentiment(email: GmailEmail): Promise<EmailSentiment> {
    const apiKey = getGroqApiKey()
    if (!apiKey) {
        throw new Error("Groq API key not configured")
    }

    const groq = createGroq({ apiKey })

    const prompt = `Analyze the sentiment and content of this email:

FROM: ${email.from}
SUBJECT: ${email.subject}
DATE: ${email.date}

BODY:
${email.body}

Respond with ONLY valid JSON in this exact format:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "keyTopics": ["topic1", "topic2", ...],
  "urgencyLevel": "high" | "medium" | "low",
  "summary": "Brief 1-2 sentence summary of the email"
}

Rules:
- positive: Appreciative, satisfied, happy, cooperative
- negative: Frustrated, angry, disappointed, threatening to leave
- neutral: Informational, routine, no strong emotion
- urgencyLevel: high = immediate action needed, medium = follow up soon, low = informational
- keyTopics: Extract 2-5 main topics (e.g., "renewal", "pricing", "claims", "complaint")
- summary: Concise summary focusing on the main point`

    try {
        const { text } = await generateText({
            model: groq(GROQ_MODEL),
            prompt,
            temperature: 0.3, // Lower temperature for more consistent classification
        })

        // Parse JSON response
        let jsonText = text.trim()
        if (jsonText.includes("```")) {
            jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error("No JSON found in response")
        }

        const result = JSON.parse(jsonMatch[0])

        return {
            emailId: email.id,
            sentiment: result.sentiment || "neutral",
            confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
            keyTopics: Array.isArray(result.keyTopics) ? result.keyTopics : [],
            urgencyLevel: result.urgencyLevel || "medium",
            summary: result.summary || email.snippet,
        }
    } catch (error) {
        console.error("[Sentiment] Analysis failed:", error)
        // Return neutral sentiment as fallback
        return {
            emailId: email.id,
            sentiment: "neutral",
            confidence: 0.3,
            keyTopics: [],
            urgencyLevel: "medium",
            summary: email.snippet,
        }
    }
}

/**
 * Analyze sentiment for multiple emails in batches
 */
export async function analyzeBatchEmailSentiment(emails: GmailEmail[]): Promise<EmailSentiment[]> {
    const results: EmailSentiment[] = []
    const batchSize = GMAIL_CONFIG.sentimentBatchSize

    for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize)

        // Process batch in parallel
        const batchResults = await Promise.all(batch.map((email) => analyzeEmailSentiment(email)))

        results.push(...batchResults)

        // Small delay between batches to avoid rate limits
        if (i + batchSize < emails.length) {
            await sleep(1000)
        }
    }

    return results
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
