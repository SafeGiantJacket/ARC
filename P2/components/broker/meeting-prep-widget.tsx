"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarClock, AlertTriangle, CheckCircle, FileText, CalendarCheck } from "lucide-react"
import { CalendarEvent } from "@/lib/types"

interface MeetingPrepWidgetProps {
    events?: CalendarEvent[]
}

export function MeetingPrepWidget({ events = [] }: MeetingPrepWidgetProps) {
    // Filter for future events and sort by date
    const now = new Date()
    const upcomingEvents = events
        .filter(e => new Date(e.meetingDate) > now)
        .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())

    const nextEvent = upcomingEvents[0]

    // Helper to calculate time until
    const getTimeUntil = (dateStr: string) => {
        const diff = new Date(dateStr).getTime() - now.getTime()
        const diffInMinutes = Math.floor(diff / 60000)

        if (diffInMinutes < 60) return `Starts in ${diffInMinutes} minutes`
        const diffInHours = Math.floor(diffInMinutes / 60)
        if (diffInHours < 24) return `Starts in ${diffInHours} hours`
        return `Starts in ${Math.floor(diffInHours / 24)} days`
    }

    if (!nextEvent) {
        return (
            <Card className="bg-slate-50 border-slate-200 mb-6 border-dashed">
                <CardContent className="p-4 flex flex-row items-center gap-4 text-slate-500">
                    <div className="bg-slate-100 p-3 rounded-full">
                        <CalendarCheck className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">No Upcoming Meetings</h3>
                        <p className="text-xs">Sync your calendar or schedule a renewal review.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-full mt-1">
                        <CalendarClock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-blue-900">Upcoming: {nextEvent.title}</h3>
                        <p className="text-sm text-blue-700 font-medium">
                            {getTimeUntil(nextEvent.meetingDate)} • {nextEvent.participants.length} Participants
                        </p>
                        <div className="flex gap-3 mt-2">
                            {/* Only show badges if we have real data to back them (leaving blank for now/generic) */}
                            <div className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                <FileText className="w-3 h-3" />
                                {nextEvent.meetingNotes ? "Notes Available" : "No Notes"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                    {nextEvent.meetingNotes && (
                        <div className="bg-white/60 p-3 rounded-lg border border-blue-100 text-sm max-w-md">
                            <span className="font-semibold block text-blue-900 mb-1">📝 Notes:</span>
                            "{nextEvent.meetingNotes.substring(0, 100)}..."
                        </div>
                    )}
                    {!nextEvent.meetingNotes && (
                        <div className="bg-white/60 p-3 rounded-lg border border-blue-100 text-sm max-w-md italic text-slate-500">
                            No preparation notes found for this meeting.
                        </div>
                    )}

                </div>
            </CardContent>
        </Card>
    )
}
