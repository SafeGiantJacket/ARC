/**
 * Gmail OAuth Callback Route
 * Handles OAuth callback from Google and stores tokens
 */

import { NextRequest, NextResponse } from "next/server"
import { getTokensFromCode, getUserEmail } from "@/lib/gmail-auth"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const code = searchParams.get("code")
        const error = searchParams.get("error")

        // Handle OAuth errors
        if (error) {
            return NextResponse.redirect(
                new URL(`/?gmail_error=${encodeURIComponent(error)}`, request.url),
            )
        }

        if (!code) {
            return NextResponse.redirect(
                new URL("/?gmail_error=no_code", request.url),
            )
        }

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code)

        // Get user email
        const userEmail = await getUserEmail(tokens)

        // Store tokens in httpOnly cookie (secure)
        const cookieStore = await cookies()
        cookieStore.set("gmail_tokens", JSON.stringify(tokens), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: "/",
        })

        // Store user email in separate cookie for display
        cookieStore.set("gmail_user_email", userEmail, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        })

        // Redirect back to dashboard with success message
        return NextResponse.redirect(
            new URL("/?gmail_connected=true", request.url),
        )
    } catch (error) {
        console.error("[Gmail Callback] Error:", error)
        return NextResponse.redirect(
            new URL(
                `/?gmail_error=${encodeURIComponent(error instanceof Error ? error.message : "authentication_failed")}`,
                request.url,
            ),
        )
    }
}
