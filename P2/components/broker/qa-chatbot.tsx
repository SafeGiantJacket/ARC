"use client"

import { useState, useRef, useEffect } from "react"
import type {
  QAMessage,
  QASource,
  Policy,
  InsurancePlacement,
  PolicyEvent,
  DataMode,
  EmailData,
  CalendarEvent,
  GmailEmail,
} from "@/lib/types"
import {
  MessageSquare,
  Send,
  Database,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Mail,
  Calendar,
  ExternalLink,
} from "lucide-react"

const BLOCKCHAIN_CONTRACT_URL = "https://sepolia.etherscan.io/address/0x2e6d92cfc80616637dc67a61dcf11e3859ad852f"

interface QAChatbotProps {
  policies: Policy[]
  placements: InsurancePlacement[]
  dataMode: DataMode
  events: PolicyEvent[]
  emailData?: EmailData[]
  calendarData?: CalendarEvent[]
  gmailEmails?: GmailEmail[]
}

export function QAChatbot({
  policies,
  placements,
  dataMode,
  events,
  emailData = [],
  calendarData = [],
  gmailEmails = [],
}: QAChatbotProps) {
  const [messages, setMessages] = useState<QAMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I can answer questions about your ${dataMode === "csv" ? "placements and renewal pipeline" : "blockchain policies and customers"} using live data from connected systems. What would you like to know?`,
      timestamp: new Date(),
      confidence: 1,
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      case "gmail":
        return <Mail className="h-3 w-3" />
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
    return "bg-foreground/5 text-foreground border-foreground/20"
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
      const serializedPolicies = policies.map((p) => ({
        policyHash: String(p.policyHash || ""),
        policyName: String(p.policyName || ""),
        policyType: String(p.policyType || ""),
        coverageAmount: String(Number(p.coverageAmount || 0) / 1e18),
        premium: String(Number(p.premium || 0) / 1e18),
        status: Number(p.status || 0),
        customer: String(p.customer || ""),
        renewalCount: Number(p.renewalCount || 0),
        daysUntilExpiry:
          p.startTime && p.duration
            ? Math.ceil((Number(p.startTime) + Number(p.duration) - Math.floor(Date.now() / 1000)) / 86400)
            : 0,
      }))

      const response = await fetch("/api/qa-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionText,
          dataMode,
          context: {
            policies: dataMode === "blockchain" ? serializedPolicies : [],
            placements: dataMode === "csv" ? placements : [],
            events: events.slice(0, 20),
            emailData: emailData,
            calendarData: calendarData,
            gmailEmails: gmailEmails,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const assistantMessage: QAMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content: data.answer || data.error || `Error: ${response.statusText}`,
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
        content: `Network error: ${error instanceof Error ? error.message : "Failed to connect"}`,
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

  const isPolicyBasedQuestion = (sources?: QASource[]) => {
    if (!sources || sources.length === 0) return false
    return sources.some(
      (s) =>
        s.system === "blockchain" ||
        (s.recordType &&
          (s.recordType.toLowerCase().includes("policy") || s.recordType.toLowerCase().includes("placement"))),
    )
  }

  const shouldShowBlockchainLink = (content: string, sources?: QASource[]) => {
    return dataMode === "blockchain" && isPolicyBasedQuestion(sources)
  }

  return (
    <div className="flex flex-col h-[600px] rounded-lg bg-card border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">ARC Policy Copilot</h3>
            <p className="text-xs text-muted-foreground">Live data analysis from blockchain & connectors</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] ${message.role === "user"
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                : message.isError
                  ? "bg-destructive/10 border border-destructive/20 rounded-2xl rounded-bl-md"
                  : "bg-secondary rounded-2xl rounded-bl-md"
                } px-4 py-3`}
            >
              {message.isError && (
                <div className="flex items-center gap-2 text-destructive text-xs mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Error occurred
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {message.role === "assistant" &&
                !message.isError &&
                shouldShowBlockchainLink(message.content, message.sources) && (
                  <a
                    href={BLOCKCHAIN_CONTRACT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>View Live Connector on Sepolia</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                )}

              {message.role === "assistant" && !message.isError && message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-foreground/10 space-y-2">
                  <p className="text-xs font-semibold text-foreground mb-2">📊 You know, sources listed:</p>
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-3 py-2 rounded border flex flex-col gap-1 ${getSourceColor(source.system)}`}
                    >
                      <div className="flex items-center gap-2">
                        {getSourceIcon(source.system)}
                        <span className="font-semibold capitalize">{source.system}</span>
                        <span className="text-foreground/60 text-[10px]">({source.recordType})</span>
                      </div>
                      {source.recordId && <div className="text-foreground/70 pl-5">ID: {source.recordId}</div>}
                      {source.excerpt && <div className="text-foreground/70 pl-5 italic">{source.excerpt}</div>}
                      {source.link && (
                        <a
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground/60 hover:text-foreground pl-5 text-[10px] underline"
                        >
                          View source →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {message.role === "assistant" && !message.isError && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    Confidence: {Math.round((message.confidence || 0.5) * 100)}%
                  </span>
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="p-1.5 rounded-lg hover:bg-background/50 transition-colors ml-auto"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
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
                <span className="text-sm text-muted-foreground">Analyzing connected systems...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about policies, renewals, blockchain status..."
            className="flex-1 px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
