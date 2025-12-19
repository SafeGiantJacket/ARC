"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Download, MessageCircle, X } from "lucide-react"

interface ClientProposalViewProps {
    proposalId: string
    clientName: string
    premium: string
    coverage: string
    policyType: string
    expiryDate: string
    onAccept: () => void
    onDecline: () => void
}

export function ClientProposalView({
    proposalId,
    clientName,
    premium,
    coverage,
    policyType,
    expiryDate,
    onAccept,
    onDecline
}: ClientProposalViewProps) {
    return (
        <Card className="w-full max-w-2xl mx-auto border-t-4 border-t-blue-600 shadow-xl">
            <CardHeader className="text-center pb-2">
                <Badge className="mx-auto mb-2 bg-blue-100 text-blue-700 hover:bg-blue-200">Renewal Offer</Badge>
                <CardTitle className="text-2xl font-bold">Insurance Renewal Proposal</CardTitle>
                <CardDescription>Prepared for {clientName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Key Highlights */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Policy Type</p>
                        <p className="font-medium text-slate-900">{policyType}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Expires On</p>
                        <p className="font-medium text-red-600">{expiryDate}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Coverage Limit</p>
                        <p className="font-medium text-slate-900">{coverage}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Annual Premium</p>
                        <p className="text-lg font-bold text-blue-600">{premium}</p>
                    </div>
                </div>

                {/* Improvements Section */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        What's included in this renewal?
                    </h4>
                    <ul className="space-y-2 pl-6 text-sm text-slate-600 list-disc">
                        <li>Maintained existing coverage limits with no reduction.</li>
                        <li>Added <strong>Cyber Extortion</strong> rider as discussed.</li>
                        <li>Premium increase limited to 5% despite market hardening.</li>
                        <li>Waived administrative renewal fees.</li>
                    </ul>
                </div>

            </CardContent>
            <CardFooter className="flex flex-col gap-3 bg-slate-50 p-6 border-t">
                <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-lg shadow-md" onClick={onAccept}>
                    Accept & Renew Now
                </Button>
                <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1" onClick={onDecline}>
                        <X className="w-4 h-4 mr-2" />
                        Review / Changes
                    </Button>
                    <Button variant="outline" className="flex-1">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat with Broker
                    </Button>
                    <Button variant="outline" className="flex-1">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
