"use client"

import { useState, useEffect } from "react"
import { Mail, RefreshCw, CheckCircle, AlertCircle, LogOut, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GmailAuthStatus } from "@/lib/types"

export function GmailConnector() {
    const [status, setStatus] = useState<GmailAuthStatus>({ isConnected: false })
    const [isLoading, setIsLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    // Fetch Gmail connection status
    const fetchStatus = async () => {
        try {
            const response = await fetch("/api/gmail/status")
            const data = await response.json()
            setStatus(data)
        } catch (error) {
            console.error("[Gmail Connector] Failed to fetch status:", error)
        }
    }

    useEffect(() => {
        fetchStatus()

        // Check for OAuth callback success/error in URL
        const params = new URLSearchParams(window.location.search)
        if (params.get("gmail_connected") === "true") {
            fetchStatus()
            // Clean up URL
            window.history.replaceState({}, "", window.location.pathname)
        }
    }, [])

    const handleConnect = () => {
        setIsLoading(true)
        // Redirect to OAuth flow
        window.location.href = "/api/auth/gmail"
    }

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect Gmail?")) {
            return
        }

        try {
            setIsLoading(true)
            const response = await fetch("/api/gmail/status", {
                method: "DELETE",
            })

            if (response.ok) {
                setStatus({ isConnected: false })
            }
        } catch (error) {
            console.error("[Gmail Connector] Failed to disconnect:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            // Trigger sync (will be handled by parent component)
            const event = new CustomEvent("gmail-sync-requested")
            window.dispatchEvent(event)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Card className="p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`p-3 rounded-lg ${status.isConnected ? "bg-green-500/20" : "bg-muted"
                            }`}
                    >
                        <Mail className={`h-6 w-6 ${status.isConnected ? "text-green-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Gmail Integration</h3>
                        <p className="text-sm text-muted-foreground">
                            {status.isConnected
                                ? `Connected as ${status.email}`
                                : "Connect your Gmail to analyze email sentiment"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {status.isConnected ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
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

            {status.isConnected && status.lastSync && (
                <div className="mt-4 text-xs text-muted-foreground">
                    Last synced: {new Date(status.lastSync).toLocaleString()}
                </div>
            )}

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
                                    Sync Emails
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
                                <Mail className="h-4 w-4 mr-2" />
                                Connect Gmail
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
