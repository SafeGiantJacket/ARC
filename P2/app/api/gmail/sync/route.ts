/**
 * Gmail Sync API Route
 * Fetches emails, analyzes sentiment, and links to policies
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { GmailTokens } from "@/lib/gmail-auth"
import { fetchGmailEmails } from "@/lib/gmail-fetcher"
import { analyzeBatchEmailSentiment } from "@/lib/gmail-sentiment-analyzer"
import { linkEmailsToPolicies } from "@/lib/gmail-policy-linker"
import type { Policy, GmailEmail } from "@/lib/types"

export async function POST(request: NextRequest) {
    try {
        // Get tokens from cookie
        const cookieStore = await cookies()
        const tokensStr = cookieStore.get("gmail_tokens")?.value

        if (!tokensStr) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Not authenticated with Gmail",
                },
                { status: 401 },
            )
        }

        const tokens: GmailTokens = JSON.parse(tokensStr)

        // Get request parameters
        const body = await request.json()
        const { maxResults = 50, dateRangeDays = 30, policies = [] } = body

        // Fetch emails from Gmail
        console.log("[Gmail Sync] Fetching emails...")
        const emails = await fetchGmailEmails(tokens, {
            maxResults,
            dateRangeDays,
        })

        if (emails.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No emails found in the specified date range",
                emails: [],
                sentiments: [],
                links: [],
                stats: {
                    totalEmails: 0,
                    withSentiment: 0,
                    linkedToPolicies: 0,
                },
            })
        }

        console.log(`[Gmail Sync] Fetched ${emails.length} emails`)

        // Analyze sentiment
        console.log("[Gmail Sync] Analyzing sentiment...")
        const sentiments = await analyzeBatchEmailSentiment(emails)

        // Merge sentiment data into emails
        const emailsWithSentiment: GmailEmail[] = emails.map((email) => {
            const sentiment = sentiments.find((s) => s.emailId === email.id)
            return {
                ...email,
                sentiment: sentiment?.sentiment,
                sentimentConfidence: sentiment?.confidence,
            }
        })

        // Link emails to policies if policies provided
        let policyLinks: Map<string, any> = new Map()
        if (Array.isArray(policies) && policies.length > 0) {
            console.log("[Gmail Sync] Linking emails to policies...")
            policyLinks = await linkEmailsToPolicies(emailsWithSentiment, policies as Policy[])

            // Merge policy links into emails
            emailsWithSentiment.forEach((email) => {
                const link = policyLinks.get(email.id)
                if (link) {
                    email.linkedPolicyHash = link.policyHash
                    email.linkedCustomerAddress = link.customerAddress
                    email.linkConfidence = link.confidence
                }
            })
        }

        // Calculate stats
        const stats = {
            totalEmails: emails.length,
            withSentiment: sentiments.length,
            linkedToPolicies: policyLinks.size,
            sentimentBreakdown: {
                positive: sentiments.filter((s) => s.sentiment === "positive").length,
                neutral: sentiments.filter((s) => s.sentiment === "neutral").length,
                negative: sentiments.filter((s) => s.sentiment === "negative").length,
            },
        }

        // Update last sync time in cookie
        cookieStore.set("gmail_last_sync", new Date().toISOString(), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        })

        return NextResponse.json({
            success: true,
            emails: emailsWithSentiment,
            sentiments,
            links: Array.from(policyLinks.values()),
            stats,
        })
    } catch (error) {
        console.error("[Gmail Sync] Error:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to sync Gmail",
            },
            { status: 500 },
        )
    }
}
