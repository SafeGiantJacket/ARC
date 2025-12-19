"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, CheckCircle2, Circle, Clock, Mail, Calendar, Loader2, Sparkles, Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { Policy } from "@/lib/types"

type CampaignStrategy = "standard" | "aggressive" | "relationship"

interface CampaignStep {
    id: number
    type: "email" | "call" | "meeting"
    name: string
    status: "pending" | "completed" | "active"
    dueInDays: number
}

const STRATEGIES: Record<CampaignStrategy, CampaignStep[]> = {
    standard: [
        { id: 1, type: "email", name: "T-90 Renewal Notice", status: "completed", dueInDays: 0 },
        { id: 2, type: "email", name: "T-60 Market Update", status: "active", dueInDays: 5 },
        { id: 3, type: "call", name: "T-30 Review Call", status: "pending", dueInDays: 30 },
    ],
    aggressive: [
        { id: 1, type: "email", name: "Urgent Renewal Alert", status: "active", dueInDays: 0 },
        { id: 2, type: "call", name: "Follow-up Call", status: "pending", dueInDays: 2 },
        { id: 3, type: "email", name: "Final Notice", status: "pending", dueInDays: 5 },
    ],
    relationship: [
        { id: 1, type: "meeting", name: "Coffee Chat", status: "active", dueInDays: 7 },
        { id: 2, type: "email", name: "Personalized Proposal", status: "pending", dueInDays: 14 },
    ]
}

interface PipelineCampaignManagerProps {
    policies: Policy[]
}

export function PipelineCampaignManager({ policies }: PipelineCampaignManagerProps) {
    const [strategy, setStrategy] = useState<CampaignStrategy>("standard")
    const [isActive, setIsActive] = useState(false)
    const [steps, setSteps] = useState<CampaignStep[]>(STRATEGIES.standard)
    const [selectedPolicyId, setSelectedPolicyId] = useState<string>("")

    // AI Draft State
    const [isGenerating, setIsGenerating] = useState(false)
    const [draftEmail, setDraftEmail] = useState("")
    const [showDraftModal, setShowDraftModal] = useState(false)
    const [editingStep, setEditingStep] = useState<CampaignStep | null>(null)

    const handleStrategyChange = (val: string) => {
        setStrategy(val as CampaignStrategy)
        setSteps(STRATEGIES[val as CampaignStrategy])
        setIsActive(false)
    }

    const startCampaign = () => {
        if (!selectedPolicyId) {
            alert("Please select a policy first.")
            return
        }
        setIsActive(true)
    }

    const handleGenerateDraft = async (step: CampaignStep) => {
        setEditingStep(step)
        setIsGenerating(true)
        setShowDraftModal(true)
        setDraftEmail("") // Reset

        try {
            console.log("Generating draft for policy:", selectedPolicyId)
            const policy = policies.find(p => p.policyHash === selectedPolicyId)

            if (!policy) {
                console.error("Policy not found for ID:", selectedPolicyId)
                setDraftEmail("Error: Policy not found.")
                setIsGenerating(false)
                return
            }

            const formattedPolicy = {
                ...policy,
                premium: policy.premium ? (Number(policy.premium) / 1e18).toFixed(4) + " ETH" : "TBD"
            }

            const response = await fetch("/api/generate-campaign-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    policy: formattedPolicy,
                    campaignType: strategy,
                    stepName: step.name,
                    additionalContext: "Client has been unresponsive for 2 weeks."
                }, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                )
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("API Error:", response.status, errorText)
                throw new Error(`API Error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()
            if (data.success) {
                setDraftEmail(data.email)
            } else {
                console.error("API returned success=false", data)
                setDraftEmail(`Failed to generate draft: ${data.error || "Unknown error"}`)
            }
        } catch (error) {
            console.error("Frontend Catch Error:", error)
            setDraftEmail(`Error connecting to AI service: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const getIcon = (type: CampaignStep["type"]) => {
        switch (type) {
            case "email": return <Mail className="w-4 h-4" />
            case "call": return <Clock className="w-4 h-4" />
            case "meeting": return <Calendar className="w-4 h-4" />
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg flex justify-between items-center">
                    <span>Automated Outreach</span>
                    {isActive && <Badge variant="default" className="bg-green-600">Active</Badge>}
                </CardTitle>
                <CardDescription>Select a policy and strategy to automate renewal touchpoints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId} disabled={isActive}>
                        <SelectTrigger className="w-full md:w-[300px]">
                            <SelectValue placeholder="Select Policy for Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                            {policies.map(p => (
                                <SelectItem key={p.policyHash} value={p.policyHash}>
                                    {p.policyName} ({p.customer})
                                </SelectItem>
                            ))}
                            {policies.length === 0 && <SelectItem value="none" disabled>No policies loaded</SelectItem>}
                        </SelectContent>
                    </Select>

                    <Select value={strategy} onValueChange={handleStrategyChange} disabled={isActive}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Strategy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="standard">Standard Renewal</SelectItem>
                            <SelectItem value="aggressive">High Urgency</SelectItem>
                            <SelectItem value="relationship">Relationship First</SelectItem>
                        </SelectContent>
                    </Select>

                    {!isActive && (
                        <Button onClick={startCampaign} className="bg-blue-600 hover:bg-blue-700" disabled={!selectedPolicyId}>
                            <Play className="w-4 h-4 mr-2" />
                            Start Campaign
                        </Button>
                    )}
                </div>

                {selectedPolicyId && (
                    <div className="space-y-4 relative">
                        {/* Connector Line */}
                        <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-gray-200 -z-10" />

                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-start gap-4 bg-white p-2 rounded-lg transition-all hover:bg-gray-50 border border-transparent hover:border-gray-200">
                                <div className="bg-white z-10">
                                    {step.status === "completed" && <CheckCircle2 className="w-10 h-10 text-green-500 fill-white" />}
                                    {step.status === "active" && <Circle className="w-10 h-10 text-blue-500 fill-blue-100 animate-pulse" />}
                                    {step.status === "pending" && <Circle className="w-10 h-10 text-gray-300 fill-white" />}
                                </div>
                                <div className="flex-1 pt-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className={`font-semibold ${step.status === "active" ? "text-blue-700" : "text-gray-700"}`}>
                                            {step.name}
                                        </h4>
                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                            {getIcon(step.type)}
                                            {step.status === "completed" ? "Sent" : `Due in ${step.dueInDays} days`}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {step.type === "email" && "Drafts personalized email based on templates."}
                                        {step.type === "call" && "Schedules a call task in your calendar."}
                                        {step.type === "meeting" && "Proposes meeting times via Calendly."}
                                    </p>

                                    {/* Action Buttons */}
                                    {step.type === "email" && isActive && step.status !== "completed" && (
                                        <div className="mt-2 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs gap-1"
                                                onClick={() => handleGenerateDraft(step)}
                                            >
                                                <Sparkles className="w-3 h-3 text-purple-600" />
                                                Generate Draft
                                            </Button>
                                            {step.status === "active" && (
                                                <Button size="sm" variant="secondary" className="h-8 text-xs text-blue-700 bg-blue-100 hover:bg-blue-200">
                                                    Auto-send enabled
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!selectedPolicyId && (
                    <div className="text-center py-10 text-gray-500 border-2 border-dashed rounded-lg">
                        <Mail className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>Select a policy to view campaign timeline</p>
                    </div>
                )}
            </CardContent>

            {/* AI Draft Review Modal */}
            <Dialog open={showDraftModal} onOpenChange={setShowDraftModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            AI Email Draft for "{editingStep?.name}"
                        </DialogTitle>
                        <DialogDescription>
                            Review and edit the AI-generated email before approving.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                <p>Analyzing policy data and writing email...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Textarea
                                    className="min-h-[300px] font-mono text-sm leading-relaxed p-4"
                                    value={draftEmail}
                                    onChange={(e) => setDraftEmail(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDraftModal(false)}>Discard</Button>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowDraftModal(false)} disabled={isGenerating}>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve & Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
