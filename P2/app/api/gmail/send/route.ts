/**
 * Gmail Send API Route
 * Sends an email via the user's connected Gmail account
 */

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { GmailTokens } from "@/lib/gmail-auth"
import { sendGmailEmail } from "@/lib/gmail-sender"

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
        const { to, subject, body: emailBody } = body

        if (!to || !subject || !emailBody) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields (to, subject, body)",
                },
                { status: 400 },
            )
        }

        console.log(`[Gmail Send] Sending email to ${to}...`)

        // Send email
        const result = await sendGmailEmail(tokens, {
            to,
            subject,
            body: emailBody,
        })

        console.log(`[Gmail Send] Email sent! ID: ${result.id}`)

        return NextResponse.json({
            success: true,
            id: result.id,
            threadId: result.threadId,
        })
    } catch (error) {
        console.error("[Gmail Send] Error:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to send email",
            },
            { status: 500 },
        )
    }
}
