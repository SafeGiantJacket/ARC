"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { getContract, getContractReadOnly, formatHash, formatEther, getPolicyStatusText } from "@/lib/web3-utils"
import type {
  Policy,
  PolicyEvent,
  CSVRenewalData,
  InsurancePlacement,
  DataMode,
  EmailData,
  CalendarEvent,
} from "@/lib/types"
import { parseInsuranceCSV, generateSampleCSV } from "@/lib/csv-parser"
import { parseEmailCSV, generateEmailSampleCSV } from "@/lib/email-csv-parser"
import { parseCalendarCSV, generateCalendarSampleCSV } from "@/lib/calendar-csv-parser"
import {
  Plus,
  Activity,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  MessageSquare,
  Upload,
  Download,
  Database,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Zap,
} from "lucide-react"
import { RenewalPipeline } from "./renewal-pipeline"
import { EmailOutreach } from "./email-outreach"
import { QAChatbot } from "./qa-chatbot"
import { BrokerCalendarNotes } from "./broker-calendar-notes"
import { EmailSummary } from "./email-summary"
import { MeetingSummary } from "./meeting-summary"
import { AISmartScheduler } from "@/components/broker/ai-smart-scheduler"
import { BrokerCreatePolicy } from "./broker-create-policy"
import { PolicyUploader } from "./policy-uploader"
import { BrokerCalendarWithScheduler } from "./broker-calendar-with-scheduler"
import { Card } from "@/components/ui/card"

interface BrokerDashboardProps {
  brokerAddress: string
  dataMode: DataMode
  onDataModeChange: (mode: DataMode) => void
}

export function BrokerDashboard({ brokerAddress, dataMode = "csv", onDataModeChange }: BrokerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "policies" | "create" | "activity" | "calendar" | "upload">(
    "overview",
  )
  const [policies, setPolicies] = useState<Policy[]>([])
  const [events, setEvents] = useState<PolicyEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [csvData, setCsvData] = useState<CSVRenewalData[]>([])
  const [placements, setPlacements] = useState<InsurancePlacement[]>([])
  const [emailData, setEmailData] = useState<EmailData[]>([])
  const [calendarData, setCalendarData] = useState<CalendarEvent[]>([])

  const [formData, setFormData] = useState({
    policyName: "",
    policyType: "",
    coverageAmount: "",
    premium: "",
    durationInDays: "",
    notes: "",
    customerAddress: "",
  })
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const loadPolicies = useCallback(async () => {
    if (dataMode !== "blockchain") return
    setLoading(true)
    try {
      const contract = await getContractReadOnly()
      const policiesData: Policy[] = []
      let index = 0
      while (true) {
        try {
          const hash = await contract.allPolicyHashes(index)
          const policy = await contract.getPolicy(hash)
          policiesData.push(policy)
          index++
        } catch {
          break
        }
      }
      setPolicies(policiesData)
    } catch (error) {
      console.error("[v0] Error loading policies:", error)
    } finally {
      setLoading(false)
    }
  }, [dataMode])

  const loadEvents = useCallback(async () => {
    if (dataMode !== "blockchain") return
    setEventsLoading(true)
    try {
      const { ethers } = await import("ethers")
      const provider = new ethers.BrowserProvider(window.ethereum!)
      const contract = await getContractReadOnly()

      const createdFilter = contract.filters.PolicyCreated()
      const signedFilter = contract.filters.PolicySigned()
      const renewedFilter = contract.filters.PolicyRenewed()
      const expiredFilter = contract.filters.PolicyExpired()

      const [createdEvents, signedEvents, renewedEvents, expiredEvents] = await Promise.all([
        contract.queryFilter(createdFilter, -10000),
        contract.queryFilter(signedFilter, -10000),
        contract.queryFilter(renewedFilter, -10000),
        contract.queryFilter(expiredFilter, -10000),
      ])

      const allEvents: PolicyEvent[] = []

      for (const e of createdEvents) {
        const block = await provider.getBlock(e.blockNumber)
        allEvents.push({
          type: "created",
          hash: e.args?.[0] || "",
          customer: e.args?.[1] || "",
          timestamp: block?.timestamp || 0,
          transactionHash: e.transactionHash,
        })
      }

      for (const e of signedEvents) {
        const block = await provider.getBlock(e.blockNumber)
        allEvents.push({
          type: "signed",
          hash: e.args?.[0] || "",
          customer: e.args?.[1] || "",
          timestamp: block?.timestamp || 0,
          transactionHash: e.transactionHash,
        })
      }

      for (const e of renewedEvents) {
        const block = await provider.getBlock(e.blockNumber)
        allEvents.push({
          type: "renewed",
          hash: e.args?.[0] || "",
          renewalCount: Number(e.args?.[1] || 0),
          timestamp: block?.timestamp || 0,
          transactionHash: e.transactionHash,
        })
      }

      for (const e of expiredEvents) {
        const block = await provider.getBlock(e.blockNumber)
        allEvents.push({
          type: "expired",
          hash: e.args?.[0] || "",
          timestamp: block?.timestamp || 0,
          transactionHash: e.transactionHash,
        })
      }

      allEvents.sort((a, b) => b.timestamp - a.timestamp)
      setEvents(allEvents)
    } catch (error) {
      console.error("[v0] Error loading events:", error)
    } finally {
      setEventsLoading(false)
    }
  }, [dataMode])

  useEffect(() => {
    if (dataMode === "blockchain") {
      loadPolicies()
      loadEvents()
    }
  }, [dataMode, loadPolicies, loadEvents])

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseInsuranceCSV(text)
      setPlacements(parsed)
      console.log("[v0] Loaded", parsed.length, "placements from CSV")
    }
    reader.readAsText(file)
  }

  const handleEmailCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseEmailCSV(text)
      setEmailData(parsed)
      console.log("[v0] Loaded", parsed.length, "emails from CSV")
    }
    reader.readAsText(file)
  }

  const handleCalendarCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCalendarCSV(text)
      setCalendarData(parsed)
      console.log("[v0] Loaded", parsed.length, "calendar events from CSV")
    }
    reader.readAsText(file)
  }

  const downloadSampleEmailCSV = () => {
    const csv = generateEmailSampleCSV()
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-email-log.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadSampleCalendarCSV = () => {
    const csv = generateCalendarSampleCSV()
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-calendar-log.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (dataMode !== "blockchain") return
    setCreating(true)
    try {
      const { ethers } = await import("ethers")
      const contract = await getContract()
      const coverageWei = ethers.parseEther(formData.coverageAmount)
      const premiumWei = ethers.parseEther(formData.premium)
      const durationSeconds = Number(formData.durationInDays) * 24 * 60 * 60

      const tx = await contract.createPolicy(
        formData.customerAddress,
        formData.policyName,
        formData.policyType,
        coverageWei,
        premiumWei,
        durationSeconds,
        formData.notes,
      )
      await tx.wait()
      setFormData({
        policyName: "",
        policyType: "",
        coverageAmount: "",
        premium: "",
        durationInDays: "",
        notes: "",
        customerAddress: "",
      })
      loadPolicies()
      loadEvents()
    } catch (error) {
      console.error("[v0] Error creating policy:", error)
    } finally {
      setCreating(false)
    }
  }

  const filteredPolicies = policies.filter(
    (p) =>
      p.policyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.policyHash?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredPlacements = placements.filter(
    (p) =>
      p.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.placementId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.coverage?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Stats
  const blockchainStats = {
    total: policies.length,
    active: policies.filter((p) => p.status === 1).length,
    pending: policies.filter((p) => p.status === 0).length,
    expired: policies.filter((p) => p.status === 2).length,
  }

  const csvStats = {
    total: placements.length,
    quoted: placements.filter((p) => p.placementStatus === "Quote").length,
    submitted: placements.filter((p) => p.placementStatus === "Submitted").length,
    totalPremium: placements.reduce((sum, p) => sum + (p.totalPremium || 0), 0),
  }

  const connectorStats = {
    emails: emailData.length,
    calendar: calendarData.length,
  }

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-foreground">Broker Dashboard</h2>
      </div>

      {/* Blockchain tabs for policies, calendar, and uploads */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {[
          { id: "overview", label: "Overview" },
          { id: "policies", label: "Policies" },
          { id: "create", label: "Create Policy" },
          { id: "calendar", label: "Calendar & AI Scheduler" },
          { id: "upload", label: "Upload Policies" },
          { id: "activity", label: "Activity" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && dataMode === "blockchain" && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Policies</p>
            <p className="text-2xl font-bold">{policies.length}</p>
          </Card>
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-primary">{policies.filter((p) => p.status === 1).length}</p>
          </Card>
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {policies.filter((p) => p.status === 0).length}
            </p>
          </Card>
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Expired</p>
            <p className="text-2xl font-bold text-destructive">{policies.filter((p) => p.status === 2).length}</p>
          </Card>
        </div>
      )}

      {/* Calendar with AI Scheduler Tab */}
      {activeTab === "calendar" && <BrokerCalendarWithScheduler placements={placements} emailData={emailData} />}

      {/* Policy Upload Tab */}
      {activeTab === "upload" && (
        <div className="max-w-2xl">
          <PolicyUploader
            onPoliciesLoad={(policies) => {
              console.log("[v0] Policies loaded:", policies)
            }}
          />
        </div>
      )}

      {/* Create Policy Tab */}
      {activeTab === "create" && dataMode === "blockchain" && (
        <div className="max-w-2xl">
          <BrokerCreatePolicy
            brokerAddress={brokerAddress}
            onPolicyCreated={() => {
              loadPolicies()
              loadEvents()
            }}
          />
        </div>
      )}

      {/* Policies List Tab */}
      {activeTab === "policies" && dataMode === "blockchain" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Blockchain Policies</h3>
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
              {policies.length} total
            </span>
          </div>
          <div className="grid gap-4">
            {policies.map((policy) => (
              <Card key={policy.policyHash} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground">{policy.policyName}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          policy.status === 1
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : policy.status === 0
                              ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                              : "bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {getPolicyStatusText(policy.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>Type: {policy.policyType}</div>
                      <div>Coverage: {formatEther(policy.coverageAmount)} ETH</div>
                      <div>Premium: {formatEther(policy.premium)} ETH</div>
                      <div>Duration: {Math.floor(Number(policy.duration) / 86400)} days</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && dataMode === "blockchain" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">Recent Blockchain Events</h3>
          <div className="space-y-2">
            {events.map((event, idx) => (
              <Card key={idx} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground capitalize">{event.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{formatHash(event.hash)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {dataMode === "csv" && (
        <div className="p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Data Connectors - CSV Upload
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload CSV files to connect your policy placements, email logs, and calendar events for renewal insights.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Placements CSV */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-blue-400" />
                <span className="font-medium">Placements Data</span>
                {placements.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                    {placements.length} loaded
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">Insurance placements from your CRM system</p>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors text-sm">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
                <button
                  onClick={() => {
                    const csv = generateSampleCSV()
                    const blob = new Blob([csv], { type: "text/csv" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "sample-placements.csv"
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  title="Download sample"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Email CSV */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-5 w-5 text-orange-400" />
                <span className="font-medium">Email Logs</span>
                {emailData.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    {emailData.length} loaded
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">Email threads and sentiment from Outlook/Mail</p>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg cursor-pointer hover:bg-orange-600 transition-colors text-sm">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                  <input type="file" accept=".csv" onChange={handleEmailCSVUpload} className="hidden" />
                </label>
                <button
                  onClick={downloadSampleEmailCSV}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  title="Download sample"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar CSV */}
            <div className="p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Calendar Events</span>
                {calendarData.length > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                    {calendarData.length} loaded
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">Meetings and notes from Outlook Calendar</p>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg cursor-pointer hover:bg-purple-600 transition-colors text-sm">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                  <input type="file" accept=".csv" onChange={handleCalendarCSVUpload} className="hidden" />
                </label>
                <button
                  onClick={downloadSampleCalendarCSV}
                  className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  title="Download sample"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Data Summary */}
          {(placements.length > 0 || emailData.length > 0 || calendarData.length > 0) && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-sm font-medium mb-2">Connected Data Summary:</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {placements.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                    <Database className="h-3 w-3" />
                    {placements.length} placements | ${(csvStats.totalPremium / 1000000).toFixed(2)}M premium
                  </span>
                )}
                {emailData.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 text-orange-400">
                    <Mail className="h-3 w-3" />
                    {emailData.length} email threads | {emailData.filter((e) => e.sentiment === "negative").length}{" "}
                    negative sentiment
                  </span>
                )}
                {calendarData.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                    <Calendar className="h-3 w-3" />
                    {calendarData.length} meetings | {calendarData.reduce((sum, c) => sum + c.participants.length, 0)}{" "}
                    participants
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "pipeline" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab("outreach")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "outreach" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Outreach
        </button>
        <button
          onClick={() => setActiveTab("qa")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "qa" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Q&A
        </button>
        <button
          onClick={() => setActiveTab("calendar-notes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "calendar-notes" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Calendar & Notes
        </button>
        <button
          onClick={() => setActiveTab("email-summary")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "email-summary" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Email Summary
        </button>
        <button
          onClick={() => setActiveTab("meeting-summary")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "meeting-summary" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Meeting Summary
        </button>
        {dataMode === "blockchain" && (
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "activity" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            <Activity className="h-4 w-4" />
            Activity
          </button>
        )}
        <button
          onClick={() => setActiveTab("ai-scheduler")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === "ai-scheduler" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          AI Scheduler
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && dataMode === "blockchain" && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Policies</p>
            <p className="text-2xl font-bold">{policies.length}</p>
          </Card>
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-primary">{policies.filter((p) => p.status === 1).length}</p>
          </Card>
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {policies.filter((p) => p.status === 0).length}
            </p>
          </Card>
          <Card className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Expired</p>
            <p className="text-2xl font-bold text-destructive">{policies.filter((p) => p.status === 2).length}</p>
          </Card>
        </div>
      )}

      {activeTab === "pipeline" && (
        <RenewalPipeline
          policies={policies}
          placements={placements}
          dataMode={dataMode}
          emailData={emailData}
          calendarData={calendarData}
        />
      )}

      {activeTab === "outreach" && <EmailOutreach policies={policies} placements={placements} dataMode={dataMode} />}

      {activeTab === "qa" && (
        <QAChatbot
          policies={policies}
          placements={placements}
          events={events}
          dataMode={dataMode}
          emailData={emailData}
          calendarData={calendarData}
        />
      )}

      {activeTab === "calendar-notes" && <BrokerCalendarNotes placements={placements} emailData={emailData} />}

      {activeTab === "email-summary" && <EmailSummary placements={placements} emailData={emailData} />}

      {activeTab === "meeting-summary" && <MeetingSummary placements={placements} calendarData={calendarData} />}

      {activeTab === "activity" && dataMode === "blockchain" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <button
              onClick={loadEvents}
              disabled={eventsLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {events.slice(0, 20).map((event, index) => (
              <div key={`${event.transactionHash}-${index}`} className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      event.type === "created"
                        ? "bg-blue-500/10"
                        : event.type === "signed"
                          ? "bg-green-500/10"
                          : event.type === "renewed"
                            ? "bg-purple-500/10"
                            : "bg-red-500/10"
                    }`}
                  >
                    {event.type === "created" && <Plus className="h-5 w-5 text-blue-400" />}
                    {event.type === "signed" && <CheckCircle className="h-5 w-5 text-green-400" />}
                    {event.type === "renewed" && <RefreshCw className="h-5 w-5 text-purple-400" />}
                    {event.type === "expired" && <AlertCircle className="h-5 w-5 text-red-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium capitalize">{event.type}</p>
                    <p className="text-sm text-muted-foreground">Policy: {formatHash(event.hash)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{new Date(event.timestamp * 1000).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp * 1000).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && !eventsLoading && (
              <div className="text-center py-12 text-muted-foreground">No activity found</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "ai-scheduler" && (
        <AISmartScheduler placements={placements} emailData={emailData} calendarData={calendarData} />
      )}
    </div>
  )
}
