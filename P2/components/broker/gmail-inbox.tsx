"use client"

import { useState, useEffect } from "react"
import {
    Mail,
    TrendingUp,
    TrendingDown,
    Minus,
    ExternalLink,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Sparkles,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { GmailEmail, Policy } from "@/lib/types"

interface GmailInboxProps {
    policies: Policy[]
    onSyncComplete?: (emails: GmailEmail[]) => void
    initialEmails?: GmailEmail[]
}

export function GmailInbox({ policies, onSyncComplete, initialEmails = [] }: GmailInboxProps) {
    const [emails, setEmails] = useState<GmailEmail[]>(initialEmails)
    const [filteredEmails, setFilteredEmails] = useState<GmailEmail[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "neutral" | "negative">("all")
    const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null)

    // Listen for sync requests from GmailConnector
    useEffect(() => {
        const handleSyncRequest = () => {
            syncEmails()
        }

        window.addEventListener("gmail-sync-requested", handleSyncRequest)
        return () => window.removeEventListener("gmail-sync-requested", handleSyncRequest)
    }, [policies])

    // Filter emails based on search and sentiment
    useEffect(() => {
        let filtered = emails

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (email) =>
                    email.subject.toLowerCase().includes(query) ||
                    email.from.toLowerCase().includes(query) ||
                    email.body.toLowerCase().includes(query),
            )
        }

        // Sentiment filter
        if (sentimentFilter !== "all") {
            filtered = filtered.filter((email) => email.sentiment === sentimentFilter)
        }

        setFilteredEmails(filtered)
    }, [emails, searchQuery, sentimentFilter])

    const syncEmails = async () => {
        setIsLoading(true)
        try {
            const response = await fetch("/api/gmail/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    maxResults: 50,
                    dateRangeDays: 30,
                    policies: policies.map((p) => ({
                        policyHash: p.policyHash,
                        policyName: p.policyName,
                        policyType: p.policyType,
                        customer: p.customer,
                        status: p.status,
                    })),
                }, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ),
            })

            const data = await response.json()

            if (data.success && data.emails) {
                setEmails(data.emails)
                onSyncComplete?.(data.emails)
            }
        } catch (error) {
            console.error("[Gmail Inbox] Sync failed:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case "positive":
                return <TrendingUp className="h-4 w-4" />
            case "negative":
                return <TrendingDown className="h-4 w-4" />
            default:
                return <Minus className="h-4 w-4" />
        }
    }

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case "positive":
                return "bg-green-500/10 text-green-500 border-green-500/30"
            case "negative":
                return "bg-red-500/10 text-red-500 border-red-500/30"
            default:
                return "bg-gray-500/10 text-gray-500 border-gray-500/30"
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

        if (diffHours < 24) {
            return `${diffHours}h ago`
        } else if (diffHours < 48) {
            return "Yesterday"
        } else {
            return date.toLocaleDateString()
        }
    }

    const stats = {
        total: emails.length,
        positive: emails.filter((e) => e.sentiment === "positive").length,
        neutral: emails.filter((e) => e.sentiment === "neutral").length,
        negative: emails.filter((e) => e.sentiment === "negative").length,
        linked: emails.filter((e) => e.linkedPolicyHash).length,
    }

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            {emails.length > 0 && (
                <div className="grid grid-cols-5 gap-4">
                    <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Total Emails</div>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </Card>
                    <Card className="p-4 bg-green-500/5 border-green-500/20">
                        <div className="text-sm text-green-600 dark:text-green-400">Positive</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.positive}</div>
                    </Card>
                    <Card className="p-4 bg-gray-500/5 border-gray-500/20">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Neutral</div>
                        <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.neutral}</div>
                    </Card>
                    <Card className="p-4 bg-red-500/5 border-red-500/20">
                        <div className="text-sm text-red-600 dark:text-red-400">Negative</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.negative}</div>
                    </Card>
                    <Card className="p-4 bg-purple-500/5 border-purple-500/20">
                        <div className="text-sm text-purple-600 dark:text-purple-400">Linked to Policies</div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.linked}</div>
                    </Card>
                </div>
            )}

            {/* Search and Filters */}
            <Card className="p-4">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search emails by subject, sender, or content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={sentimentFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSentimentFilter("all")}
                        >
                            All
                        </Button>
                        <Button
                            variant={sentimentFilter === "positive" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSentimentFilter("positive")}
                            className={sentimentFilter === "positive" ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Positive
                        </Button>
                        <Button
                            variant={sentimentFilter === "neutral" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSentimentFilter("neutral")}
                        >
                            <Minus className="h-4 w-4 mr-1" />
                            Neutral
                        </Button>
                        <Button
                            variant={sentimentFilter === "negative" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSentimentFilter("negative")}
                            className={sentimentFilter === "negative" ? "bg-red-500 hover:bg-red-600" : ""}
                        >
                            <TrendingDown className="h-4 w-4 mr-1" />
                            Negative
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Email List */}
            <div className="space-y-2">
                {isLoading ? (
                    <Card className="p-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Clock className="h-5 w-5 animate-spin" />
                            <span>Syncing emails and analyzing sentiment...</span>
                        </div>
                    </Card>
                ) : filteredEmails.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">
                        {emails.length === 0 ? (
                            <div>
                                <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No emails synced yet. Click "Sync Emails" to get started.</p>
                            </div>
                        ) : (
                            <p>No emails match your search criteria.</p>
                        )}
                    </Card>
                ) : (
                    filteredEmails.map((email) => (
                        <Card
                            key={email.id}
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedEmail(email)}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{email.subject || "(No Subject)"}</h4>
                                        {email.isUnread && (
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                                                New
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{email.from}</p>
                                    <p className="text-sm text-foreground/80 line-clamp-2">{email.snippet}</p>

                                    {email.linkedPolicyHash && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                                                <Sparkles className="h-3 w-3 mr-1" />
                                                Linked to Policy: {email.linkedPolicyHash.slice(0, 10)}...
                                            </Badge>
                                            {email.linkConfidence && (
                                                <span className="text-xs text-muted-foreground">
                                                    {Math.round(email.linkConfidence * 100)}% confidence
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs text-muted-foreground">{formatDate(email.date)}</span>
                                    {email.sentiment && (
                                        <Badge variant="outline" className={getSentimentColor(email.sentiment)}>
                                            {getSentimentIcon(email.sentiment)}
                                            <span className="ml-1 capitalize">{email.sentiment}</span>
                                        </Badge>
                                    )}
                                    {email.sentimentConfidence && (
                                        <span className="text-xs text-muted-foreground">
                                            {Math.round(email.sentimentConfidence * 100)}% confidence
                                        </span>
                                    )}
                                    <a
                                        href={email.gmailLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        View in Gmail
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Email Detail Modal (Simple version - can be enhanced) */}
            {selectedEmail && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedEmail(null)}
                >
                    <Card className="max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold mb-2">{selectedEmail.subject}</h2>
                                <p className="text-sm text-muted-foreground">From: {selectedEmail.from}</p>
                                <p className="text-sm text-muted-foreground">Date: {new Date(selectedEmail.date).toLocaleString()}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                                ✕
                            </Button>
                        </div>

                        {selectedEmail.sentiment && (
                            <div className="mb-4">
                                <Badge variant="outline" className={getSentimentColor(selectedEmail.sentiment)}>
                                    {getSentimentIcon(selectedEmail.sentiment)}
                                    <span className="ml-1 capitalize">{selectedEmail.sentiment}</span>
                                    {selectedEmail.sentimentConfidence && (
                                        <span className="ml-2">({Math.round(selectedEmail.sentimentConfidence * 100)}%)</span>
                                    )}
                                </Badge>
                            </div>
                        )}

                        {selectedEmail.linkedPolicyHash && (
                            <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">
                                    Linked to Blockchain Policy
                                </p>
                                <p className="text-xs font-mono">{selectedEmail.linkedPolicyHash}</p>
                                {selectedEmail.linkConfidence && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Match confidence: {Math.round(selectedEmail.linkConfidence * 100)}%
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="prose dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-sm">{selectedEmail.body}</div>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <Button asChild className="flex-1">
                                <a href={selectedEmail.gmailLink} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in Gmail
                                </a>
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedEmail(null)}>
                                Close
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
