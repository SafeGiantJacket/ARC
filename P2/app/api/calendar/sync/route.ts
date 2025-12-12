/**
 * Calendar Sync API
 * Fetches upcoming events from Google Calendar
 */

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCalendarClient, isTokenExpired, refreshAccessToken } from "@/lib/calendar-auth"

export async function GET() {
    try {
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

        // Fetch upcoming events
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime',
        })

        const events = response.data.items || []

        // Map to internal format
        const mappedEvents = events.map(event => ({
            eventId: event.id,
            title: event.summary || "No Title",
            description: event.description || "",
            startTime: event.start?.dateTime || event.start?.date,
            endTime: event.end?.dateTime || event.end?.date,
            link: event.htmlLink,
            organizer: event.organizer?.email,
            attendees: event.attendees?.map(a => a.email) || []
        }))

        return NextResponse.json({
            success: true,
            events: mappedEvents
        })

    } catch (error) {
        console.error("[Calendar Sync] Error:", error)
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Sync failed" },
            { status: 500 },
        )
    }
}
