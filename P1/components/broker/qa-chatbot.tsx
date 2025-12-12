"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type {
  QAMessage,
  QASource,
  Policy,
  InsurancePlacement,
  PolicyEvent,
  DataMode,
  EmailData,
  CalendarEvent,
} from "@/lib/types"
import {
  MessageSquare,
  Send,
  Database,
  FileSpreadsheet,
  Link2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Mail,
  Calendar,
  Mic,
  Volume2,
  Square,
} from "lucide-react"
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from "web-speech-api"

interface QAChatbotProps {
  policies: Policy[]
  placements: InsurancePlacement[]
  dataMode: DataMode
  events: PolicyEvent[]
  emailData?: EmailData[]
  calendarData?: CalendarEvent[]
}

export function QAChatbot({
  policies,
  placements,
  dataMode,
  events,
  emailData = [],
  calendarData = [],
}: QAChatbotProps) {
  const [messages, setMessages] = useState<QAMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I can answer questions about your ${dataMode === "csv" ? "placements and renewal pipeline" : "policies and customers"} using live data from connected systems including CRM, Email, and Calendar. What would you like to know?`,
      timestamp: new Date(),
      confidence: 1,
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onstart = () => setIsListening(true)
      recognitionRef.current.onend = () => setIsListening(false)

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }

        if (event.results[event.results.length - 1].isFinal) {
          setInput(transcript.trim())
        }
      }

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[v0] Speech recognition error:", event.error)
      }

      setVoiceEnabled(true)
    }
  }, [])

  const speakMessage = useCallback(
    (text: string, messageId: string) => {
      if (speakingId === messageId) {
        window.speechSynthesis.cancel()
        setSpeakingId(null)
        return
      }

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }

      const utterance = new window.SpeechSynthesisUtterance(text)
      utterance.rate = 1
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onend = () => {
        setSpeakingId(null)
      }

      setSpeakingId(messageId)
      window.speechSynthesis.speak(utterance)
    },
    [speakingId],
  )

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start()
    }
  }, [isListening])

  const SUGGESTED_QUESTIONS =
    dataMode === "csv"
      ? [
          "Which placements are expiring in the next 30 days?",
          "What is the total premium at risk this quarter?",
          "Show me high priority renewals with negative sentiment emails",
          "Which carriers have the most quoted placements?",
          "What upcoming meetings do we have with clients?",
        ]
      : [
          "Which policies are expiring in the next 30 days?",
          "What is the total premium at risk this month?",
          "Show me policies with high churn risk",
          "Which customers have multiple policies?",
          "What recent communications do we have with clients?",
        ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getSourceIcon = (system: QASource["system"]) => {
    switch (system) {
      case "blockchain":
        return <Database className="h-3 w-3" />
      case "email":
        return <Mail className="h-3 w-3" />
      case "calendar":
        return <Calendar className="h-3 w-3" />
      case "crm":
      case "csv":
        return <FileSpreadsheet className="h-3 w-3" />
      default:
        return <Database className="h-3 w-3" />
    }
  }

  const getSourceColor = (system: QASource["system"]) => {
    switch (system) {
      case "blockchain":
        return "bg-blue-500/10 text-blue-300 border-blue-500/30"
      case "email":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30"
      case "calendar":
        return "bg-violet-500/10 text-violet-300 border-violet-500/30"
      case "crm":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
      case "csv":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
      default:
        return "bg-primary/10 text-primary border-primary/30"
    }
  }

  const getSourceLabel = (system: QASource["system"]) => {
    switch (system) {
      case "blockchain":
        return "Blockchain"
      case "email":
        return "Email"
      case "calendar":
        return "Calendar"
      case "crm":
        return "CRM"
      case "csv":
        return "Data File"
      default:
        return "Source"
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-primary"
    if (confidence >= 0.5) return "text-yellow-400"
    return "text-orange-400"
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High"
    if (confidence >= 0.5) return "Medium"
    return "Low"
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: QAMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const questionText = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/qa-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          dataMode,
          context: {
            policies:
              dataMode === "blockchain"
                ? policies.map((p) => ({
                    policyHash: p.policyHash,
                    policyName: p.policyName,
                    policyType: p.policyType,
                    coverageAmount: (Number(p.coverageAmount) / 1e18).toFixed(4),
                    premium: (Number(p.premium) / 1e18).toFixed(4),
                    status: p.status,
                    customer: p.customer,
                    renewalCount: Number(p.renewalCount),
                  }))
                : [],
            placements: dataMode === "csv" ? placements : [],
            events: events.slice(0, 20),
            emailData: emailData,
            calendarData: calendarData,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const assistantMessage: QAMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: data.answer || data.error || `Error: ${response.statusText}. Please try again.`,
          timestamp: new Date(),
          sources: [],
          confidence: 0,
          isError: true,
        }
        setMessages((prev) => [...prev, assistantMessage])
        return
      }

      const assistantMessage: QAMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources,
        confidence: data.confidence,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("[v0] Q&A error:", error)
      const errorMessage: QAMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `Network error: ${error instanceof Error ? error.message : "Failed to connect"}. Please check your connection and try again.`,
        timestamp: new Date(),
        confidence: 0,
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <div className="flex flex-col h-[600px] rounded-xl bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Policy Copilot Q&A</h3>
            <p className="text-xs text-muted-foreground">Live connector data analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {dataMode === "csv" ? (
            <>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary">
                <FileSpreadsheet className="h-3 w-3" />
                <span>{placements.length} placements</span>
              </div>
              {emailData.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 text-orange-400">
                  <Mail className="h-3 w-3" />
                  <span>{emailData.length}</span>
                </div>
              )}
              {calendarData.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-400">
                  <Calendar className="h-3 w-3" />
                  <span>{calendarData.length}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary">
              <Database className="h-3 w-3" />
              <span>{policies.length} policies</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                  : message.isError
                    ? "bg-destructive/10 border border-destructive/20 rounded-2xl rounded-bl-md"
                    : "bg-secondary rounded-2xl rounded-bl-md"
              } px-4 py-3`}
            >
              {message.isError && (
                <div className="flex items-center gap-2 text-destructive text-xs mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Error occurred</span>
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Data from {message.sources.length} source{message.sources.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {message.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={`/pipeline?filter=${source.recordType}&id=${source.recordId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-start gap-2.5 p-2.5 rounded-lg border transition-all hover:shadow-lg hover:underline cursor-pointer ${getSourceColor(source.system)}`}
                      >
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {getSourceIcon(source.system)}
                          <span className="text-xs font-semibold">{getSourceLabel(source.system).split(" ")[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-medium text-foreground capitalize">{source.recordType}</p>
                          <p className="text-xs font-mono mt-0.5 dark:opacity-70 dark:text-gray-400 text-black">
                            ID: {source.recordId}
                          </p>
                          {source.excerpt && (
                            <p className="text-xs dark:opacity-80 line-clamp-2 mt-1.5 italic dark:text-gray-300 text-gray-900">
                              {source.excerpt}
                            </p>
                          )}
                          {source.link && (
                            <span
                              onClick={(e) => e.preventDefault()}
                              className="text-xs mt-2 inline-flex items-center gap-1 text-primary hover:underline opacity-80 hover:opacity-100 transition-opacity"
                            >
                              View Source →
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Data summary section */}
                  <div className="mt-3 p-2.5 rounded-lg bg-card/50 border border-border/30 text-xs">
                    <p className="font-semibold text-foreground mb-1.5">Source Summary:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.sources
                        .reduce(
                          (acc, s) => {
                            const existing = acc.find((x) => x.system === s.system)
                            if (existing) existing.count++
                            else acc.push({ system: s.system, count: 1 })
                            return acc
                          },
                          [] as Array<{ system: string; count: number }>,
                        )
                        .map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-md text-xs font-medium bg-secondary/60 text-secondary-foreground"
                          >
                            {getSourceLabel(s.system as QASource["system"]).split(" ")[1]} ×{s.count}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence & Actions */}
              {message.role === "assistant" && message.confidence !== undefined && (
                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs flex items-center gap-1 ${getConfidenceColor(message.confidence)}`}>
                      <Sparkles className="h-3 w-3" />
                      {getConfidenceLabel(message.confidence)} confidence ({Math.round(message.confidence * 100)}%)
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {voiceEnabled && (
                      <button
                        onClick={() => speakMessage(message.content, message.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          speakingId === message.id ? "bg-primary/20" : "hover:bg-background/50"
                        }`}
                        title="Read message aloud"
                      >
                        {speakingId === message.id ? (
                          <Square className="h-3 w-3 text-primary" />
                        ) : (
                          <Volume2 className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="p-1.5 rounded-lg hover:bg-background/50 transition-colors"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Searching connected systems...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedQuestion(question)}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={
              dataMode === "csv"
                ? "Ask about placements, renewals, carriers, or client communications..."
                : "Ask about policies, customers, or events..."
            }
            className="flex-1 px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          {voiceEnabled && (
            <button
              onClick={startListening}
              disabled={isLoading}
              className={`px-4 py-3 rounded-xl transition-colors ${
                isListening
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              title="Click to start voice input"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Answers use live data from CRM, Blockchain, Email, and Calendar. No documents stored.
        </p>
      </div>
    </div>
  )
}
