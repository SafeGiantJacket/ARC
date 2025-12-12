/**
 * Gmail OAuth Initiation Route
 * Redirects user to Google consent screen
 */

import { NextResponse } from "next/server"
import { getAuthUrl } from "@/lib/gmail-auth"
import { validateGmailConfig } from "@/lib/gmail-config"

export async function GET() {
    try {
        // Validate configuration
        const validation = validateGmailConfig()
        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Gmail configuration invalid",
                    details: validation.errors,
                },
                { status: 500 },
            )
        }

        // Generate OAuth URL
        const authUrl = getAuthUrl()

        console.log("[Gmail Auth] ----------------------------------------")
        console.log("[Gmail Auth] Initiating OAuth flow")
        console.log("[Gmail Auth] Redirect URI configured on server:", process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/auth/gmail/callback")
        console.log("[Gmail Auth] ----------------------------------------")

        // Redirect to Google consent screen
        return NextResponse.redirect(authUrl)
    } catch (error) {
        console.error("[Gmail Auth] Error initiating OAuth:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to initiate Gmail authentication",
            },
            { status: 500 },
        )
    }
}
