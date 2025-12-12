/**
 * Google Calendar OAuth Initiation Route
 */

import { NextResponse } from "next/server"
import { getCalendarAuthUrl } from "@/lib/calendar-auth"
import { validateCalendarConfig } from "@/lib/calendar-config"

export async function GET() {
    try {
        // Validate configuration
        const validation = validateCalendarConfig()
        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Calendar configuration invalid",
                    details: validation.errors,
                },
                { status: 500 },
            )
        }

        // Generate OAuth URL
        const authUrl = getCalendarAuthUrl()

        // Redirect to Google consent screen
        return NextResponse.redirect(authUrl)
    } catch (error) {
        console.error("[Calendar Auth] Error initiating OAuth:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to initiate Calendar authentication",
            },
            { status: 500 },
        )
    }
}
