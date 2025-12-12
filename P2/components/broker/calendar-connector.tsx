"use client"

import { useState, useEffect } from "react"
import { Calendar, RefreshCw, CheckCircle, AlertCircle, LogOut, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CalendarStatus {
    isConnected: boolean
    email?: string
    error?: string
}

interface CalendarConnectorProps {
    onEventsFetched?: (events: any[]) => void
}

export function CalendarConnector({ onEventsFetched }: CalendarConnectorProps) {
    const [status, setStatus] = useState<CalendarStatus>({ isConnected: false })
    const [isLoading, setIsLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    // Fetch Calendar connection status
    const fetchStatus = async () => {
        try {
            const response = await fetch("/api/calendar/status")
            const data = await response.json()
            setStatus(data)
        } catch (error) {
            console.error("[Calendar Connector] Failed to fetch status:", error)
        }
    }

    useEffect(() => {
        fetchStatus()

        // Check for OAuth callback success/error in URL
        const params = new URLSearchParams(window.location.search)
        if (params.get("calendar_connected") === "true") {
            fetchStatus()
            // Clean up URL
            window.history.replaceState({}, "", window.location.pathname)
        }
    }, [])

    const handleConnect = () => {
        setIsLoading(true)
        // Redirect to OAuth flow
        window.location.href = "/api/auth/calendar"
    }

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect Calendar?")) {
            return
        }

        try {
            setIsLoading(true)
            const response = await fetch("/api/calendar/status", {
                method: "DELETE",
            })

            if (response.ok) {
                setStatus({ isConnected: false })
            }
        } catch (error) {
            console.error("[Calendar Connector] Failed to disconnect:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            // Trigger sync (will be handled by parent component or specific logic)
            // For now, since we don't have a global store, we'll dispatch an event
            const response = await fetch("/api/calendar/sync")
            const data = await response.json()

            if (data.success) {
                if (onEventsFetched) {
                    onEventsFetched(data.events)
                }
                const event = new CustomEvent("calendar-sync-success", { detail: data.events })
                window.dispatchEvent(event)
                alert(`Synced ${data.events.length} events from Calendar`)
            } else {
                alert("Failed to sync: " + data.error)
            }
        } catch (error) {
            console.error("Sync failed:", error)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-3 rounded-lg ${status.isConnected ? "bg-blue-500/20" : "bg-muted"
                            }`}
                    >
                        <Calendar className={`h-6 w-6 ${status.isConnected ? "text-blue-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Google Calendar</h3>
                        <p className="text-sm text-muted-foreground">
                            {status.isConnected
                                ? `Connected as ${status.email}`
                                : "Sync meetings to track renewal discussions"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {status.isConnected ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not Connected
                        </Badge>
                    )}
                </div>
            </div>

            <div className="mt-6 flex gap-2">
                {status.isConnected ? (
                    <>
                        <Button onClick={handleSync} disabled={isSyncing} className="flex-1">
                            {isSyncing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Sync Meetings
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Disconnect
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleConnect} disabled={isLoading} className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Calendar className="h-4 w-4 mr-2" />
                                Connect Calendar
                            </>
                        )}
                    </Button>
                )}
            </div>

            {status.error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{status.error}</p>
                </div>
            )}
        </Card>
    )
}
