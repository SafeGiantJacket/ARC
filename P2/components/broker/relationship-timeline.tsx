"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Calendar, ArrowUpRight, ArrowDownRight, Minus, MessageSquare } from "lucide-react"
import { InteractionEvent } from "@/lib/types"

interface RelationshipTimelineProps {
    events?: InteractionEvent[]
}

// Mock data generator for demo purposes
const MOCK_EVENTS: InteractionEvent[] = [
    {
        id: "1",
        type: "email",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        sentiment: "negative",
        direction: "inbound",
        summary: "Client complained about the premium hike.",
    },
    {
        id: "2",
        type: "call",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        sentiment: "neutral",
        direction: "outbound",
        summary: "Left voicemail regarding renewal options.",
    },
    {
        id: "3",
        type: "meeting",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 2 weeks ago
        sentiment: "positive",
        direction: "inbound",
        summary: "Quarterly review. Client is happy with claims handling.",
    },
    {
        id: "4",
        type: "email",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 1 month ago
        sentiment: "positive",
        direction: "outbound",
        summary: "Sent market update report.",
    },
    {
        id: "5",
        type: "email",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 1.5 months ago
        sentiment: "neutral",
        direction: "inbound",
        summary: "Asked for clarification on Cyber policy."
    }
]

export function RelationshipTimeline({ events = MOCK_EVENTS }: RelationshipTimelineProps) {
    // Sort events by date (newest first)
    const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime())

    const getIcon = (type: InteractionEvent["type"]) => {
        switch (type) {
            case "email": return <Mail className="w-4 h-4" />
            case "call": return <Phone className="w-4 h-4" />
            case "meeting": return <Calendar className="w-4 h-4" />
            default: return <MessageSquare className="w-4 h-4" />
        }
    }

    const getSentimentColor = (sentiment: InteractionEvent["sentiment"]) => {
        switch (sentiment) {
            case "positive": return "bg-green-100 border-green-200 text-green-700"
            case "negative": return "bg-red-100 border-red-200 text-red-700"
            default: return "bg-gray-100 border-gray-200 text-gray-700"
        }
    }

    const getSentimentIcon = (sentiment: InteractionEvent["sentiment"]) => {
        switch (sentiment) {
            case "positive": return <ArrowUpRight className="w-3 h-3 text-green-600" />
            case "negative": return <ArrowDownRight className="w-3 h-3 text-red-600" />
            default: return <Minus className="w-3 h-3 text-gray-400" />
        }
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    Interaction Pulse
                    <Badge variant="outline" className="text-xs font-normal">Last 90 Days</Badge>
                </CardTitle>
                <CardDescription>
                    Visual history of client touchpoints and sentiment tracking.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <div className="flex w-max space-x-4 p-1">
                        {sortedEvents.map((event) => (
                            <div
                                key={event.id}
                                className={`w-[200px] p-4 rounded-xl border-2 flex flex-col gap-3 transition-all hover:scale-105 cursor-pointer ${getSentimentColor(event.sentiment)}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-white/50 rounded-lg">
                                        {getIcon(event.type)}
                                    </div>
                                    <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded text-xs font-medium">
                                        {getSentimentIcon(event.sentiment)}
                                        <span className="capitalize">{event.sentiment}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs opacity-70 font-semibold uppercase tracking-wider">
                                        {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        <span className="mx-1">•</span>
                                        {event.direction}
                                    </p>
                                    <p className="text-sm font-medium leading-snug whitespace-normal line-clamp-2">
                                        {event.summary}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
