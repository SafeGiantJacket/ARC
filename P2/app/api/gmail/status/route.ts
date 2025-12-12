/**
 * Gmail Status API Route
 * Returns Gmail connection status
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import type { GmailAuthStatus } from "@/lib/types"

export async function GET() {
    try {
        const cookieStore = await cookies()
        const tokensStr = cookieStore.get("gmail_tokens")?.value
        const userEmail = cookieStore.get("gmail_user_email")?.value
        const lastSyncStr = cookieStore.get("gmail_last_sync")?.value

        const status: GmailAuthStatus = {
            isConnected: !!tokensStr,
            email: userEmail,
            lastSync: lastSyncStr ? new Date(lastSyncStr) : undefined,
        }

        return NextResponse.json(status)
    } catch (error) {
        console.error("[Gmail Status] Error:", error)
        return NextResponse.json({
            isConnected: false,
            error: error instanceof Error ? error.message : "Failed to get status",
        })
    }
}

// Disconnect Gmail
export async function DELETE() {
    try {
        const cookieStore = await cookies()
        cookieStore.delete("gmail_tokens")
        cookieStore.delete("gmail_user_email")
        cookieStore.delete("gmail_last_sync")

        return NextResponse.json({
            success: true,
            message: "Gmail disconnected successfully",
        })
    } catch (error) {
        console.error("[Gmail Disconnect] Error:", error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to disconnect",
            },
            { status: 500 },
        )
    }
}
