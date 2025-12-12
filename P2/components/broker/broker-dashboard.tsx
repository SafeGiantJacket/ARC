"use client"
import { useState, useCallback, useEffect } from "react"
import { getContractReadOnly } from "@/lib/web3-utils"
import type { Policy, DataMode, GmailEmail } from "@/lib/types"
import { Plus, RefreshCw, Calendar, TrendingUp, MessageSquare, Mail } from "lucide-react"
import { Card } from "@/components/ui/card"
import { BrokerCreatePolicy } from "./broker-create-policy"
import { RenewalPipeline } from "./renewal-pipeline"
import { QAChatbot } from "./qa-chatbot"
import { BrokerCalendarWithScheduler } from "./broker-calendar-with-scheduler"
import { EmailOutreach } from "./email-outreach"
import { GmailConnector } from "./gmail-connector"
import { CalendarConnector } from "./calendar-connector"
import { GmailInbox } from "./gmail-inbox"

interface BrokerDashboardProps {
  brokerAddress: string
  dataMode: DataMode
}

export function BrokerDashboard({ brokerAddress, dataMode = "csv" }: BrokerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "create" | "outreach" | "qa" | "calendar" | "mail">(
    "pipeline",
  )
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(false)
  const [gmailEmails, setGmailEmails] = useState<GmailEmail[]>([])
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])

  const handleGmailSync = (emails: GmailEmail[]) => {
    setGmailEmails(emails)
    console.log("[Broker Dashboard] Synced emails:", emails.length)
  }

  const loadPolicies = useCallback(async () => {
    if (dataMode !== "blockchain") return
    setLoading(true)
    try {
      const contract = await getContractReadOnly()
      const policiesData: Policy[] = []
      let index = 0

      while (index < 1000) {
        try {
          const hash = await contract.allPolicyHashes(index)
          if (hash && hash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            const policy = await contract.getPolicy(hash)
            policiesData.push({
              policyHash: policy.policyHash,
              policyName: policy.policyName,
              policyType: policy.policyType,
              coverageAmount: policy.coverageAmount,
              premium: policy.premium,
              startTime: policy.startTime,
              duration: policy.duration,
              renewalCount: policy.renewalCount,
              notes: policy.notes,
              status: policy.status,
              customer: policy.customer,
            })
            index++
          } else {
            break
          }
        } catch (e) {
          break
        }
      }

      setPolicies(policiesData)
      console.log(`[v0] Loaded ${policiesData.length} policies from blockchain`)
    } catch (error) {
      console.error("[v0] Error loading policies:", error)
    } finally {
      setLoading(false)
    }
  }, [dataMode])

  useEffect(() => {
    if (dataMode === "blockchain") {
      loadPolicies()
    }
  }, [dataMode, loadPolicies])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Broker Dashboard</h2>
        <div className="flex items-center gap-3">
          {activeTab === "mail" && (
            <>
              <GmailConnector />
              <div className="h-6 w-px bg-border mx-2" />
            </>
          )}
          <button
            onClick={loadPolicies}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 rounded-lg bg-card border border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "pipeline" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <TrendingUp className="h-4 w-4" />
          1. Pipeline
        </button>

        <button
          onClick={() => setActiveTab("create")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "create" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <Plus className="h-4 w-4" />
          2. Create Policy
        </button>

        <button
          onClick={() => setActiveTab("outreach")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "outreach" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <Mail className="h-4 w-4" />
          3. Outreach
        </button>

        <button
          onClick={() => setActiveTab("qa")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "qa" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <MessageSquare className="h-4 w-4" />
          4. Q&A & Analysis
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "calendar" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <Calendar className="h-4 w-4" />
          5. Calendar & AI
        </button>

        <button
          onClick={() => setActiveTab("mail")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === "mail" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
        >
          <Mail className="h-4 w-4" />
          6. Mail
        </button>
      </div>

      {/* Stats Overview */}
      {dataMode === "blockchain" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 rounded-lg bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Policies</p>
            <p className="text-2xl font-bold">{policies.length}</p>
          </Card>
          <Card className="p-4 rounded-lg bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-primary">{policies.filter((p) => Number(p.status) === 1).length}</p>
          </Card>
          <Card className="p-4 rounded-lg bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {policies.filter((p) => Number(p.status) === 0).length}
            </p>
          </Card>
          <Card className="p-4 rounded-lg bg-card border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Expired</p>
            <p className="text-2xl font-bold text-destructive">
              {policies.filter((p) => Number(p.status) === 2).length}
            </p>
          </Card>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "pipeline" && <RenewalPipeline policies={policies} placements={[]} dataMode={dataMode} />}

      {activeTab === "create" && (
        <BrokerCreatePolicy
          brokerAddress={brokerAddress}
          onPolicyCreated={() => {
            loadPolicies()
          }}
        />
      )}

      {activeTab === "outreach" && (
        <EmailOutreach policies={policies} placements={[]} dataMode={dataMode} csvData={[]} />
      )}

      {activeTab === "qa" && (
        <QAChatbot
          policies={policies}
          placements={[]}
          events={[]}
          dataMode={dataMode}
          emailData={[]}
          calendarData={[]}
          gmailEmails={gmailEmails}
        />
      )}

      {activeTab === "calendar" && (
        <div className="space-y-6">
          <CalendarConnector onEventsFetched={(events) => setCalendarEvents(events)} />
          <BrokerCalendarWithScheduler placements={[]} emailData={[]} externalEvents={calendarEvents} />
        </div>
      )}

      {activeTab === "mail" && (
        <div className="space-y-6">
          <GmailInbox policies={policies} onSyncComplete={handleGmailSync} />
        </div>
      )}
    </div>
  )
}
