"use client"

import { useState, useEffect, useCallback } from "react"
import { getContractReadOnly, formatHash } from "@/lib/web3-utils"
import type { Policy, PolicyEvent } from "@/lib/types"
import { Plus, TrendingUp, Mail, MessageSquare, Calendar, Activity, RefreshCw } from "lucide-react"
import { BrokerCreatePolicy } from "./broker-create-policy"
import { EmailOutreach } from "./email-outreach"
import { QAChatbot } from "./qa-chatbot"
import { BrokerCalendarWithScheduler } from "./broker-calendar-with-scheduler"
import { RenewalPipeline } from "./renewal-pipeline"
import { Card } from "@/components/ui/card"

interface PipelineDashboardProps {
  brokerAddress: string
  dataMode?: "csv" | "blockchain"
}

export function BrokerPipelineDashboard({ brokerAddress, dataMode = "blockchain" }: PipelineDashboardProps) {
  const [activeSection, setActiveSection] = useState<
    "pipeline" | "create" | "accept" | "outreach" | "qa" | "calendar" | "activity" | "upload"
  >("pipeline")
  const [policies, setPolicies] = useState<Policy[]>([])
  const [events, setEvents] = useState<PolicyEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [placements, setPlacements] = useState<any[]>([])
  const [emailData, setEmailData] = useState<any[]>([])

  const loadPolicies = useCallback(async () => {
    if (dataMode !== "blockchain") return
    setLoading(true)
    try {
      const contract = await getContractReadOnly()
      // Fetch policies created by this broker
      const hashes = await contract.getAllPolicies()
      const policiesData: Policy[] = []

      for (const hash of hashes) {
        try {
          const policy = await contract.getPolicy(hash)
          if (policy.broker?.toLowerCase() === brokerAddress?.toLowerCase()) {
            policiesData.push(policy)
          }
        } catch (e) {
          console.log("[v0] Error fetching policy")
        }
      }

      setPolicies(policiesData)
    } catch (error) {
      console.error("[v0] Error loading policies:", error)
    } finally {
      setLoading(false)
    }
  }, [brokerAddress, dataMode])

  const loadEvents = useCallback(async () => {
    if (dataMode !== "blockchain") return
    setEventsLoading(true)
    try {
      // This would connect to blockchain event logs from Sepolia
      const contract = await getContractReadOnly()
      // Events loading logic
      setEvents([])
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
  }, [loadPolicies, loadEvents, dataMode])

  const hasActivePolicies = policies.some((p) => p.status === 1)

  if (!hasActivePolicies && activeSection === "pipeline" && dataMode === "blockchain") {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header Navigation */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-8 px-6 py-4 overflow-x-auto">
            <button
              onClick={() => setActiveSection("create")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Create Policy
            </button>
            <button
              onClick={() => setActiveSection("pipeline")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap bg-primary/20 text-primary"
            >
              <TrendingUp className="h-4 w-4" />
              Pipeline
            </button>
            <button
              onClick={() => setActiveSection("outreach")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              Outreach
            </button>
            <button
              onClick={() => setActiveSection("qa")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Q&A
            </button>
            <button
              onClick={() => setActiveSection("calendar")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Calendar className="h-4 w-4" />
              Calendar & AI
            </button>
            <button
              onClick={() => setActiveSection("activity")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-muted-foreground hover:text-foreground"
            >
              <Activity className="h-4 w-4" />
              Activity Log
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-8">
          {activeSection === "pipeline" && (
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="text-center py-20">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-3">No Active Policies</h1>
                <p className="text-muted-foreground mb-8">
                  Get started by creating your first policy to view your renewal pipeline and manage customer
                  agreements.
                </p>
                <button
                  onClick={() => setActiveSection("create")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create First Policy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Navigation */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 px-6 py-4 overflow-x-auto">
          <button
            onClick={() => setActiveSection("pipeline")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeSection === "pipeline"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <TrendingUp className="h-4 w-4" />
            Pipeline
          </button>
          <button
            onClick={() => setActiveSection("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeSection === "create" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Plus className="h-4 w-4" />
            Create Policy
          </button>
          <button
            onClick={() => setActiveSection("outreach")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeSection === "outreach"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Mail className="h-4 w-4" />
            Outreach
          </button>
          <button
            onClick={() => setActiveSection("qa")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeSection === "qa" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <MessageSquare className="h-4 w-4" />
            Q&A
          </button>
          <button
            onClick={() => setActiveSection("calendar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeSection === "calendar"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar & AI
          </button>
          <button
            onClick={() => setActiveSection("activity")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeSection === "activity"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Activity className="h-4 w-4" />
            Activity Log
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        {activeSection === "pipeline" && (
          <div className="max-w-6xl mx-auto">
            <RenewalPipeline
              policies={policies}
              placements={placements}
              dataMode={dataMode}
              emailData={emailData}
              calendarData={[]}
            />
          </div>
        )}

        {activeSection === "create" && (
          <div className="max-w-2xl mx-auto">
            <BrokerCreatePolicy
              brokerAddress={brokerAddress}
              onPolicyCreated={() => {
                loadPolicies()
                loadEvents()
              }}
            />
          </div>
        )}

        {activeSection === "outreach" && (
          <div className="max-w-4xl mx-auto">
            <EmailOutreach policies={policies} placements={placements} dataMode={dataMode} />
          </div>
        )}

        {activeSection === "qa" && (
          <div className="max-w-4xl mx-auto">
            <QAChatbot
              policies={policies}
              placements={placements}
              events={events}
              dataMode={dataMode}
              emailData={emailData}
              calendarData={[]}
            />
          </div>
        )}

        {activeSection === "calendar" && (
          <div className="max-w-6xl mx-auto">
            <BrokerCalendarWithScheduler placements={placements} emailData={emailData} />
          </div>
        )}

        {activeSection === "activity" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Blockchain Activity Log (Sepolia Testnet)</h2>
              <button
                onClick={loadEvents}
                disabled={eventsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${eventsLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            {events.length === 0 ? (
              <div className="text-center py-12 rounded-lg bg-card border border-border">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No blockchain events logged</p>
                <p className="text-xs text-muted-foreground mt-2">Events from Sepolia testnet will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event, idx) => (
                  <Card key={idx} className="p-4 border border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="font-medium capitalize">{event.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.timestamp * 1000).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground px-3 py-1 rounded-lg bg-secondary">
                        {formatHash(event.hash)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
