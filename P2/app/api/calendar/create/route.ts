/**
 * Create Calendar Event API
 * Creates a new event in Google Calendar
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCalendarClient, isTokenExpired, refreshAccessToken } from "@/lib/calendar-auth"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { title, description, startTime, endTime } = body

        if (!title || !startTime || !endTime) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
        }

        const cookieStore = await cookies()
        const tokensCookie = cookieStore.get("calendar_tokens")

        if (!tokensCookie) {
            return NextResponse.json({
                success: false,
                error: "Not connected to Calendar"
            }, { status: 401 })
        }

        let tokens = JSON.parse(tokensCookie.value)

        // Token Refresh Logic
        if (isTokenExpired(tokens)) {
            if (tokens.refresh_token) {
                try {
                    tokens = await refreshAccessToken(tokens.refresh_token)
                    cookieStore.set("calendar_tokens", JSON.stringify(tokens), {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: 60 * 60 * 24 * 30,
                        path: "/",
                    })
                } catch (e) {
                    return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 })
                }
            } else {
                return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 })
            }
        }

        const calendar = getCalendarClient(tokens)

        const event = {
            summary: title,
            description: description,
            start: {
                dateTime: startTime, // ISO string
                timeZone: 'UTC', // Or user's time zone if we track it
            },
            end: {
                dateTime: endTime, // ISO string
                timeZone: 'UTC',
            },
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        })

        return NextResponse.json({
            success: true,
            eventId: response.data.id,
            link: response.data.htmlLink
        })

    } catch (error) {
        console.error("[Calendar Create] Error:", error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to create event" },
            { status: 500 },
        )
    }
}
