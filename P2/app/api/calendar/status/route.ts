/**
 * Calendar Status API
 * Checks if the user is connected to Google Calendar
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCalendarUserEmail, isTokenExpired, refreshAccessToken } from "@/lib/calendar-auth"

export async function GET() {
    try {
        const cookieStore = await cookies()
        const tokensCookie = cookieStore.get("calendar_tokens")
        const emailCookie = cookieStore.get("calendar_user_email")

        if (!tokensCookie) {
            return NextResponse.json({
                isConnected: false,
            })
        }

        let tokens = JSON.parse(tokensCookie.value)
        const email = emailCookie?.value

        // Check if token needs refresh
        if (isTokenExpired(tokens)) {
            console.log("[Calendar Status] Token expired, refreshing...")
            if (tokens.refresh_token) {
                try {
                    tokens = await refreshAccessToken(tokens.refresh_token)
                    // Update cookie
                    cookieStore.set("calendar_tokens", JSON.stringify(tokens), {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: 60 * 60 * 24 * 30,
                        path: "/",
                    })
                } catch (refreshError) {
                    console.error("[Calendar Status] Failed to refresh token:", refreshError)
                    return NextResponse.json({ isConnected: false, error: "Token expired and refresh failed" })
                }
            } else {
                return NextResponse.json({ isConnected: false, error: "Token expired and no refresh token" })
            }
        }

        // If we don't have the email in cookie, try to fetch it
        let displayEmail = email
        if (!displayEmail) {
            try {
                displayEmail = await getCalendarUserEmail(tokens)
                if (displayEmail) {
                    cookieStore.set("calendar_user_email", displayEmail, {
                        httpOnly: false,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: 60 * 60 * 24 * 30,
                        path: "/",
                    })
                }
            } catch (e) {
                console.error("[Calendar Status] Failed to fetch email:", e)
            }
        }

        return NextResponse.json({
            isConnected: true,
            email: displayEmail,
        })
    } catch (error) {
        console.error("[Calendar Status] Error:", error)
        return NextResponse.json(
            { isConnected: false, error: "Failed to check status" },
            { status: 500 },
        )
    }
}

export async function DELETE() {
    try {
        const cookieStore = await cookies()
        cookieStore.delete("calendar_tokens")
        cookieStore.delete("calendar_user_email")

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: "Failed to disconnect" },
            { status: 500 },
        )
    }
}
