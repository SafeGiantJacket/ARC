"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Share2, Send, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface ShareToTeamsModalProps {
    isOpen: boolean
    onClose: () => void
    briefContent: string
    policyName: string
}

export function ShareToTeamsModal({ isOpen, onClose, briefContent, policyName }: ShareToTeamsModalProps) {
    const [channel, setChannel] = useState<string>("")
    const [message, setMessage] = useState<string>(`Please review the renewal brief for ${policyName}.`)
    const [isSharing, setIsSharing] = useState(false)

    const handleShare = async () => {
        if (!channel) {
            toast.error("Please select a Teams channel")
            return
        }

        setIsSharing(true)

        // Simulate API call/Webhook
        await new Promise(resolve => setTimeout(resolve, 1500))

        console.log("[Teams Integration] Shared to channel:", channel)
        console.log("[Teams Integration] Message:", message)
        console.log("[Teams Integration] Content:", briefContent.substring(0, 100) + "...")

        setIsSharing(false)
        toast.success("Successfully shared to Teams!", {
            description: `Posted to #${channel}`,
            icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        })
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-[#6264A7]" /> {/* Teams Color */}
                        Share to Microsoft Teams
                    </DialogTitle>
                    <DialogDescription>
                        Post this renewal brief to a Teams channel for collaboration.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="channel">Select Channel</Label>
                        <Select value={channel} onValueChange={setChannel}>
                            <SelectTrigger id="channel">
                                <SelectValue placeholder="Select a channel..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="renewals-general">Renewals - General</SelectItem>
                                <SelectItem value="underwriting-review">Underwriting Review</SelectItem>
                                <SelectItem value="high-priority">High Priority Accounts</SelectItem>
                                <SelectItem value="client-outreach">Client Outreach</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a note..."
                            className="min-h-[80px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSharing}>Cancel</Button>
                    <Button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="bg-[#6264A7] hover:bg-[#53558f] text-white"
                    >
                        {isSharing ? (
                            "Sharing..."
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Share
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
