/**
 * Gmail to Policy Linker
 * Uses AI and pattern matching to link emails to blockchain policies
 */

import { generateText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { getGroqApiKey, GROQ_MODEL } from "./groq-config"
import type { GmailEmail, PolicyEmailLink, Policy } from "./types"

/**
 * Link email to blockchain policy using AI and pattern matching
 */
export async function linkEmailToPolicy(
    email: GmailEmail,
    policies: Policy[],
): Promise<PolicyEmailLink | null> {
    // First, try pattern matching for policy hashes and addresses
    const patternMatch = findPolicyByPattern(email, policies)
    if (patternMatch) {
        return patternMatch
    }

    // If no pattern match, use AI to infer the link
    return await linkEmailToPolicyWithAI(email, policies)
}

/**
 * Find policy by pattern matching in email content
 */
function findPolicyByPattern(email: GmailEmail, policies: Policy[]): PolicyEmailLink | null {
    const searchText = `${email.subject} ${email.body}`.toLowerCase()

    // Look for policy hash (0x followed by hex characters)
    const hashPattern = /0x[a-fA-F0-9]{40,}/g
    const hashes = searchText.match(hashPattern)

    if (hashes) {
        for (const hash of hashes) {
            const policy = policies.find((p) => p.policyHash.toLowerCase() === hash.toLowerCase())
            if (policy) {
                return {
                    emailId: email.id,
                    policyHash: policy.policyHash,
                    customerAddress: policy.customer,
                    confidence: 0.95,
                    matchReason: "Policy hash found in email content",
                }
            }
        }
    }

    // Look for customer address
    const addressPattern = /0x[a-fA-F0-9]{40}/g
    const addresses = searchText.match(addressPattern)

    if (addresses) {
        for (const address of addresses) {
            const policy = policies.find((p) => p.customer.toLowerCase() === address.toLowerCase())
            if (policy) {
                return {
                    emailId: email.id,
                    policyHash: policy.policyHash,
                    customerAddress: policy.customer,
                    confidence: 0.9,
                    matchReason: "Customer address found in email content",
                }
            }
        }
    }

    // Look for policy name mentions
    for (const policy of policies) {
        const policyName = policy.policyName.toLowerCase()
        if (policyName && searchText.includes(policyName)) {
            return {
                emailId: email.id,
                policyHash: policy.policyHash,
                customerAddress: policy.customer,
                confidence: 0.8,
                matchReason: `Policy name "${policy.policyName}" mentioned in email`,
            }
        }
    }

    return null
}

/**
 * Use AI to infer policy link from email content
 */
async function linkEmailToPolicyWithAI(
    email: GmailEmail,
    policies: Policy[],
): Promise<PolicyEmailLink | null> {
    const apiKey = getGroqApiKey()
    if (!apiKey || policies.length === 0) {
        return null
    }

    const groq = createGroq({ apiKey })

    // Limit to top 20 policies for context
    const policyContext = policies
        .slice(0, 20)
        .map(
            (p, idx) =>
                `${idx + 1}. Policy: ${p.policyName} (${p.policyType})
   Hash: ${p.policyHash}
   Customer: ${p.customer}
   Status: ${p.status === 0 ? "Pending" : p.status === 1 ? "Active" : "Expired"}`,
        )
        .join("\n\n")

    const prompt = `You are analyzing an email to determine if it relates to any of these blockchain insurance policies.

EMAIL:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body.slice(0, 1000)}

POLICIES:
${policyContext}

Task: Determine if this email is related to any of the policies above.

Respond with ONLY valid JSON:
{
  "isRelated": true/false,
  "policyHash": "0x..." or null,
  "customerAddress": "0x..." or null,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation"
}

Rules:
- Only return isRelated: true if you're reasonably confident (>0.6)
- Look for mentions of policy types, customer names, renewal discussions, claims, etc.
- If no clear match, return isRelated: false`

    try {
        const { text } = await generateText({
            model: groq(GROQ_MODEL),
            prompt,
            temperature: 0.2,
        })

        let jsonText = text.trim()
        if (jsonText.includes("```")) {
            jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "")
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            return null
        }

        const result = JSON.parse(jsonMatch[0])

        if (!result.isRelated || !result.policyHash) {
            return null
        }

        return {
            emailId: email.id,
            policyHash: result.policyHash,
            customerAddress: result.customerAddress || undefined,
            confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
            matchReason: result.reason || "AI-inferred relationship",
        }
    } catch (error) {
        console.error("[Policy Linker] AI analysis failed:", error)
        return null
    }
}

/**
 * Link multiple emails to policies in batch
 */
export async function linkEmailsToPolicies(
    emails: GmailEmail[],
    policies: Policy[],
): Promise<Map<string, PolicyEmailLink>> {
    const links = new Map<string, PolicyEmailLink>()

    for (const email of emails) {
        const link = await linkEmailToPolicy(email, policies)
        if (link) {
            links.set(email.id, link)
        }

        // Small delay to avoid rate limits
        await sleep(500)
    }

    return links
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
