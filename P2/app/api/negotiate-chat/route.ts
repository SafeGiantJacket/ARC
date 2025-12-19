import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
    try {
        const { messages, context } = await request.json()

        // Validate inputs
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return Response.json({ error: "Messages array is required" }, { status: 400 })
        }

        const apiKey = getGroqApiKey()
        const groq = createGroq({ apiKey })

        // Construct system prompt with policy context
        const policyContext = context ? `
    CONTEXT:
    Policy/Client: ${context.policyName || "Unknown"}
    Current Premium: ${context.premium || "Unknown"}
    Renewal Brief Summary: ${context.summary || "N/A"}
    Key Risks: ${context.risks?.join(", ") || "None"}
    ` : ""

        const systemPrompt = `You are an expert Insurance Negotiation Coach. 
    Your goal is to help a broker negotiate a renewal with a client.
    ${policyContext}
    
    Rules:
    - Be concise, tactical, and direct. Keep responses short (max 3 sentences) unless asked for a detailed script.
    - Provide specific scripts or phrases they can say.
    - Analyze the user's questions to offer strategic advice on objections, pricing, or coverage.
    - Do not be generic. Use the provided context to tailor your advice.
    `

        console.log("[Negotiation Chat] Generating response...")

        // Sanitize messages to ensure valid roles for AI SDK
        const validRoles = ["system", "user", "assistant", "tool"]
        const sanitizedMessages = messages.map((m: any) => {
            let role = m.role
            // Map custom application roles to valid LLM roles
            if (!validRoles.includes(role)) {
                if (role === "carrier" || role === "coach") {
                    role = "user" // Treat external inputs/prompts as user context
                } else {
                    role = "user" // Default fallback
                }
            }
            return {
                role: role as "system" | "user" | "assistant" | "tool",
                content: m.content
            }
        })

        const { text } = await generateText({
            model: groq(GROQ_MODEL),
            system: systemPrompt,
            messages: sanitizedMessages, // Pass sanitized history
            temperature: 0.7,
        })

        return Response.json({
            role: "assistant",
            content: text
        })

    } catch (error) {
        console.error("[Negotiation Chat] Error:", error)
        return Response.json(
            { error: "Failed to generate response" },
            { status: 500 }
        )
    }
}
