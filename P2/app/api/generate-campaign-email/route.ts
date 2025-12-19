import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "@/lib/groq-config"

export async function POST(request: Request) {
    try {
        const { policy, campaignType, stepName, additionalContext } = await request.json()

        const apiKey = getGroqApiKey()
        const groq = createGroq({ apiKey })

        const systemPrompt = `You are an expert insurance broker copywriter. 
        Your goal is to write a personalized, professional, and effective renewal email for a client.
        
        Campaign Type: ${campaignType}
        Step: ${stepName}
        
        Rules:
        - Output ONLY the email body in Markdown format.
        - Subject line should be the first line, bolded.
        - Tone should match the campaign (Standard = Professional, Aggressive = Urgent, Relationship = Warm).
        - Use placeholders like [Client Name] if not provided, but try to use specific Policy data if available.
        - Keep it under 200 words.
        `

        const userPrompt = `
        Client: ${policy?.customer || "Valued Client"}
        Policy: ${policy?.policyName || "Insurance Policy"}
        Premium: ${policy?.premium || "TBD"}
        Expiry: ${policy?.duration ? "Expiring soon" : "Upcoming"}
        
        Context: ${additionalContext || "None provided."}
        
        Write the email draft now.
        `

        const { text } = await generateText({
            model: groq(GROQ_MODEL),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7,
        })

        return Response.json({ success: true, email: text })

    } catch (error) {
        console.error("Campaign Email Error:", error)
        return Response.json({ success: false, error: "Failed to generate email" }, { status: 500 })
    }
}
