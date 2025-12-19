"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sparkles, X, Send, Bot, AlertCircle } from "lucide-react"
import { EmailData, CalendarEvent } from "@/lib/types"

interface AskMyDataFABProps {
    emailData?: EmailData[]
    calendarData?: CalendarEvent[]
}

interface Message {
    role: 'user' | 'bot'
    content: string
}

export function AskMyDataFAB({ emailData = [], calendarData = [] }: AskMyDataFABProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Initialize greeting ONLY once
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { role: 'bot', content: `Hi! I'm connected to your Dashboard.\n• ${emailData.length} Emails\n• ${calendarData.length} Calendar Events\nAsk away!` }
            ])
        }
    }, [emailData.length, calendarData.length, messages.length])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isTyping])

    const handleSend = () => {
        if (!input.trim()) return

        const userQuery = input.trim().toLowerCase()
        const originalInput = input

        setMessages(prev => [...prev, { role: 'user', content: originalInput }])
        setInput("")
        setIsTyping(true)

        // Simulate AI processing time
        setTimeout(() => {
            try {
                let response = "I couldn't find any specific matches for that."

                // DATA SEARCH LOGIC
                // Safely access properties with optional chaining and fallback empty strings
                const relevantEmails = emailData.filter(e =>
                    (e.subject || "").toLowerCase().includes(userQuery) ||
                    (e.summary || "").toLowerCase().includes(userQuery) ||
                    (e.senderEmail || "").toLowerCase().includes(userQuery) ||
                    (e.clientName || "").toLowerCase().includes(userQuery)
                )

                const relevantEvents = calendarData.filter(e =>
                    (e.title || "").toLowerCase().includes(userQuery) ||
                    (e.meetingNotes || "").toLowerCase().includes(userQuery) ||
                    (e.clientName || "").toLowerCase().includes(userQuery)
                )

                if (relevantEmails.length > 0 || relevantEvents.length > 0) {
                    response = `**Found ${relevantEmails.length} emails and ${relevantEvents.length} events.**\n`

                    if (relevantEmails.length > 0) {
                        // Take top 3 recent emails
                        response += `\n**Emails:**`
                        relevantEmails.slice(0, 3).forEach(e => {
                            response += `\n- "${e.subject}" (${e.sentiment})`
                        })
                    }

                    if (relevantEvents.length > 0) {
                        response += `\n**Events:**`
                        relevantEvents.slice(0, 3).forEach(e => {
                            response += `\n- "${e.title}" (${new Date(e.meetingDate).toLocaleDateString()})`
                        })
                    }
                } else {
                    // Check for intent-based queries
                    if (userQuery.includes("count") || userQuery.includes("how many") || userQuery.includes("total")) {
                        if (userQuery.includes("email") || userQuery.includes("inbox")) {
                            response = `You have exactly ${emailData.length} emails synced in your inbox.`
                        } else if (userQuery.includes("event") || userQuery.includes("meeting") || userQuery.includes("calendar")) {
                            response = `You have ${calendarData.length} calendar events synced.`
                        } else {
                            response = `Current Status:\n• Emails: ${emailData.length}\n• Events: ${calendarData.length}`
                        }
                    } else if (userQuery.includes("risk") || userQuery.includes("urgent")) {
                        const urgentEmails = emailData.filter(e => e.sentiment === "negative").length
                        response = `I found ${urgentEmails} emails with negative sentiment/high urgency.`
                    }
                }

                setMessages(prev => [...prev, { role: 'bot', content: response }])
            } catch (err) {
                console.error("AI Widget Error:", err)
                setMessages(prev => [...prev, { role: 'bot', content: "I encountered an error processing your data request." }])
            } finally {
                setIsTyping(false)
            }
        }, 800)
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {isOpen && (
                <Card className="w-[320px] h-[450px] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col bg-white border-slate-200">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-3 rounded-t-lg flex flex-row justify-between items-center space-y-0 shadow-sm">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            Broker Assistant
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20 rounded-full" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] text-xs p-3 rounded-2xl whitespace-pre-wrap shadow-sm ${m.role === 'user'
                                        ? 'bg-purple-600 text-white rounded-tr-sm'
                                        : 'bg-white border text-slate-800 rounded-tl-sm'
                                    }`}>
                                    {/* Simple Markdown Rendering Support (Bold/List) */}
                                    {m.content.split('\n').map((line, idx) => {
                                        if (line.startsWith('**') && line.endsWith('**')) return <strong key={idx}>{line.slice(2, -2)}</strong>
                                        if (line.startsWith('- ')) return <div key={idx} className="pl-2">• {line.slice(2)}</div>
                                        return <div key={idx}>{line}</div>
                                    })}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border text-slate-500 rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 animate-pulse text-purple-500" />
                                    <span className="text-xs">Processing data...</span>
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </CardContent>

                    <CardFooter className="p-2 border-t bg-white">
                        <div className="flex w-full gap-2">
                            <Input
                                placeholder="Ask about policies, emails..."
                                className="h-9 text-xs focus-visible:ring-purple-500"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={isTyping}
                            />
                            <Button
                                size="icon"
                                className="h-9 w-9 bg-purple-600 hover:bg-purple-700 transition-all active:scale-95"
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            <Button
                size="lg"
                className={`rounded-full w-14 h-14 shadow-xl transition-all duration-300 ${isOpen
                        ? "bg-slate-800 rotate-0 scale-100"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/30"
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-7 h-7 text-white animate-bounce-subtle" />}
            </Button>
        </div>
    )
}
