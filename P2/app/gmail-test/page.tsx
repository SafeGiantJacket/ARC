"use client"

import { useState } from "react"
import { GmailConnector } from "@/components/broker/gmail-connector"
import { GmailInbox } from "@/components/broker/gmail-inbox"
import { QAChatbot } from "@/components/broker/qa-chatbot"
import type { GmailEmail, Policy } from "@/lib/types"

// Mock blockchain policies for testing
const mockPolicies: Policy[] = [
    {
        policyHash: "0x1234567890abcdef1234567890abcdef12345678",
        policyName: "Commercial Property Insurance",
        policyType: "Property",
        coverageAmount: BigInt("1000000000000000000"), // 1 ETH
        premium: BigInt("50000000000000000"), // 0.05 ETH
        startTime: BigInt(Math.floor(Date.now() / 1000)),
        duration: BigInt(365 * 24 * 60 * 60), // 1 year
        renewalCount: BigInt(0),
        notes: "Test policy for Gmail integration",
        status: 1,
        customer: "0xabcdef1234567890abcdef1234567890abcdef12",
    },
]

export default function GmailTestPage() {
    const [gmailEmails, setGmailEmails] = useState<GmailEmail[]>([])

    const handleSyncComplete = (emails: GmailEmail[]) => {
        setGmailEmails(emails)
        console.log("[Gmail Test] Synced emails:", emails)
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">Gmail Integration Test</h1>
                    <p className="text-muted-foreground">
                        Test the Gmail API integration with AI sentiment analysis and blockchain policy linking
                    </p>
                </div>

                {/* Gmail Connector */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Step 1: Connect Gmail</h2>
                    <GmailConnector />
                </div>

                {/* Gmail Inbox */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Step 2: View Synced Emails</h2>
                    <GmailInbox policies={mockPolicies} onSyncComplete={handleSyncComplete} />
                </div>

                {/* Q&A Chatbot */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Step 3: Ask Questions About Your Emails</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Try asking: "Show me negative sentiment emails", "What did [sender] say?", "Recent conversations about
                        renewals"
                    </p>
                    <QAChatbot
                        policies={mockPolicies}
                        placements={[]}
                        dataMode="blockchain"
                        events={[]}
                        emailData={[]}
                        calendarData={[]}
                        gmailEmails={gmailEmails}
                    />
                </div>

                {/* Stats */}
                {gmailEmails.length > 0 && (
                    <div className="p-6 rounded-lg bg-card border border-border">
                        <h3 className="font-semibold mb-4">Integration Stats</h3>
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-3xl font-bold">{gmailEmails.length}</div>
                                <div className="text-sm text-muted-foreground">Total Emails</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-green-500">
                                    {gmailEmails.filter((e) => e.sentiment === "positive").length}
                                </div>
                                <div className="text-sm text-muted-foreground">Positive</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-red-500">
                                    {gmailEmails.filter((e) => e.sentiment === "negative").length}
                                </div>
                                <div className="text-sm text-muted-foreground">Negative</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-purple-500">
                                    {gmailEmails.filter((e) => e.linkedPolicyHash).length}
                                </div>
                                <div className="text-sm text-muted-foreground">Linked to Policies</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
