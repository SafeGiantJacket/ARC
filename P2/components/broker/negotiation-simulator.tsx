"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Bot, User, RefreshCw, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle, Link } from "lucide-react"
import type { GmailEmail, CalendarEvent, RenewalBrief, EmailData } from "@/lib/types" // Changed import

interface NegotiationSimulatorProps {
    brief: RenewalBrief
    policyName: string
    premium: string
    emailData?: EmailData[] // Changed type
    calendarData?: CalendarEvent[]
}

interface Message {
    id: string
    role: "user" | "carrier" | "coach"
    content: string
    timestamp: Date
    sentiment?: "positive" | "negative" | "neutral"
}

export function NegotiationSimulator({ brief, policyName, premium, emailData, calendarData }: NegotiationSimulatorProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [mode, setMode] = useState<"simulator" | "coach">("simulator")
    const scrollRef = useRef<HTMLDivElement>(null)

    // Check if real data is connected
    const hasLiveContext = (emailData?.length || 0) > 0 || (calendarData?.length || 0) > 0

    useEffect(() => {
        // Initial Message
        if (messages.length === 0) {
            setMessages([
                {
                    id: "init",
                    role: "carrier",
                    content: `Hello. Regarding the renewal for ${policyName}. Given the market conditions, we are looking at a 15% rate increase.`,
                    timestamp: new Date(),
                    sentiment: "neutral"
                }
            ])
        }
    }, [policyName, messages.length])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async () => {
        if (!inputValue.trim()) return

        const newUserMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, newUserMsg])
        setInputValue("")
        setIsTyping(true)

        try {
            // CALL REAL API
            const response = await fetch("/api/negotiate-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messages.concat(newUserMsg).map(m => ({ role: m.role === "coach" ? "system" : m.role, content: m.content })),
                    context: {
                        policyName,
                        premium,
                        summary: brief.summary,
                        risks: brief.riskFactors,
                        mode: mode, // Pass mode to API
                        liveContext: hasLiveContext ? {
                            emailCount: emailData?.length,
                            recentEmailSubject: emailData?.[0]?.subject // Changed snippet to subject
                        } : undefined
                    }
                })
            })

            const data = await response.json()

            const newMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: mode === "coach" ? "coach" : "carrier",
                content: data.content,
                timestamp: new Date(),
                sentiment: "neutral" // API could return sentiment too
            }

            setMessages(prev => [...prev, newMsg])
        } catch (error) {
            console.error("Negotiation API Error:", error)
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <Card className="h-[600px] flex flex-col w-full shadow-lg border-t-4 border-t-purple-500">
            <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-600" />
                            {mode === "simulator" ? "Negotiation Battle Simulator" : "Diplomacy Coach"}
                        </CardTitle>
                        <CardDescription>
                            {mode === "simulator" ? "Practice against AI Carrier" : "Get real-time advice on what to say"}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={mode === "simulator" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMode("simulator")}
                        >
                            Simulator
                        </Button>
                        <Button
                            variant={mode === "coach" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMode("coach")}
                        >
                            Coach
                        </Button>
                    </div>
                </div>
                {!hasLiveContext && (
                    <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Live Data Disconnected. Sync Gmail/Calendar on Dashboard for real context.</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
                <ScrollArea className="h-full p-4">
                    <div className="flex flex-col gap-4 pb-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
                            >
                                <Avatar className="w-8 h-8">
                                    {msg.role === "carrier" && (
                                        <>
                                            <AvatarImage src="/bot-avatar.png" />
                                            <AvatarFallback className="bg-purple-100 text-purple-700"><Bot className="w-4 h-4" /></AvatarFallback>
                                        </>
                                    )}
                                    {msg.role === "coach" && (
                                        <AvatarFallback className="bg-green-100 text-green-700"><Sparkles className="w-4 h-4" /></AvatarFallback>
                                    )}
                                    {msg.role === "user" && (
                                        <>
                                            <AvatarImage src="/user-avatar.png" />
                                            <AvatarFallback className="bg-blue-100 text-blue-700"><User className="w-4 h-4" /></AvatarFallback>
                                        </>
                                    )}
                                </Avatar>
                                <div
                                    className={`p-3 rounded-2xl text-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" :
                                        msg.role === "coach" ? "bg-green-50 text-green-900 border border-green-200" :
                                            "bg-muted text-foreground rounded-tl-none border"
                                        }`}
                                >
                                    <p>{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3 max-w-[80%]">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-purple-100"><Bot className="w-4 h-4 animate-pulse" /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-none border">
                                    <span className="animate-pulse">AI is thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 bg-muted/30">
                <div className="flex w-full gap-2">
                    <Input
                        placeholder={mode === "simulator" ? "Type your counter-offer..." : "Ask: 'How do I respond to...?'"}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={isTyping}
                        className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!inputValue.trim() || isTyping}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
