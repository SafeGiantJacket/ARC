"use client"

import { useState } from "react"
import type {
  EmailTemplate,
  ScheduledEmail,
  Policy,
  InsurancePlacement,
  CSVRenewalData,
  DataMode,
  EmailData,
} from "@/lib/types"
import { formatEther } from "@/lib/web3-utils"
import { getEmailsForPolicy } from "@/lib/connector-data"
import { Mail, Plus, Send, ChevronDown, CheckCircle, User, FileText, Sparkles } from "lucide-react"

interface SelectedItem {
  type: "policy" | "placement"
  policy?: Policy
  placement?: InsurancePlacement
  email?: string
}

interface EmailOutreachProps {
  policies: Policy[]
  placements: InsurancePlacement[]
  dataMode: DataMode
  csvData: CSVRenewalData[]
  emailData?: EmailData[]
}

const COMPETITIVE_RESPONSE_BODY = `Dear {{clientName}},

Thank you for sharing the competitive quote you received. We've reviewed it and have great news - we were able to secure better terms and pricing through our carrier relationships.

Our revised quote:
• Premium: [NEWPREMIUM] ETH (vs [COMPETITIVEPREMIUM] ETH)
• Enhanced coverage options available
• Dedicated renewal support included

Let's discuss how we can move forward with this improved solution.

Best regards,
{{brokerName}}`

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "renewal-request",
    name: "Renewal Quote Request",
    subject: "{{clientName}} - Renewal Quote for {{policyType}}",
    body: `Dear {{clientName}},

We hope you're having a great year. As your trusted policy partner, we wanted to reach out regarding the renewal of your {{policyType}} policy.

Your current coverage expires on {{expiryDate}}, giving us time to shop your placement with our carrier partners to secure you the best rates and terms.

Would you have time for a quick call this week to discuss your renewal? We can also send over any updated applications or questionnaires you might need to complete.

Looking forward to hearing from you.

Best regards,
{{brokerName}}`,
    category: "renewal",
    variables: ["clientName", "policyType", "expiryDate", "brokerName"],
  },
  {
    id: "urgent-renewal",
    name: "Urgent Renewal - 30 Days",
    subject: "Action Required: {{clientName}} - Renewal Expiring {{expiryDate}}",
    body: `Dear {{clientName}},

Your {{policyType}} policy expires on {{expiryDate}} - just {{daysToExpiry}} days away. To ensure no coverage gaps, we need to act quickly.

Please provide the following at your earliest convenience:
• Completed renewal application
• Updated loss runs or claims history
• Any changes to your coverage needs

Once we receive these items, we can immediately begin the quote process with our carriers.

Thank you for your prompt attention to this matter.

Best regards,
{{brokerName}}`,
    category: "reminder",
    variables: ["clientName", "policyType", "expiryDate", "daysToExpiry", "brokerName"],
  },
  {
    id: "followup",
    name: "Renewal Follow-up",
    subject: "Checking in: {{clientName}} Renewal Status",
    body: `Hi {{clientName}},

Just following up on your {{policyType}} renewal that we discussed last week. Have you had a chance to review the quotes we sent over?

I'm happy to walk you through the options or address any questions you might have. Please let me know how you'd like to proceed.

Looking forward to your response.

Best regards,
{{brokerName}}`,
    category: "followup",
    variables: ["clientName", "policyType", "brokerName"],
  },
  {
    id: "competitive-response",
    name: "Competitive Rate Response",
    subject: "We Beat That Quote - {{clientName}}: {{policyType}}",
    body: COMPETITIVE_RESPONSE_BODY,
    category: "custom",
    variables: ["clientName", "policyType", "newPremium", "competitivePremium", "brokerName"],
  },
]

export function EmailOutreach({ policies, placements, dataMode, emailData = [] }: EmailOutreachProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [attachBrief, setAttachBrief] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentEmails, setSentEmails] = useState<ScheduledEmail[]>([])
  const [previewExpanded, setPreviewExpanded] = useState(true)
  const [generatedEmails, setGeneratedEmails] = useState<
    Array<{ subject: string; tone: string; body: string; rationale: string }>
  >([])
  const [isGenerating, setIsGenerating] = useState(false)

  const [customVariables, setCustomVariables] = useState<Record<string, string>>({
    brokerName: "Your Policy Partner",
    newPremium: "0",
    competitivePremium: "0",
  })

  const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
    category: "custom",
    variables: [],
  })

  const getClientName = () => selectedItem?.placement?.client || selectedItem?.policy?.policyName || "Valued Client"
  const getPolicyType = () => selectedItem?.placement?.productLine || selectedItem?.policy?.policyType || "Policy"
  const getExpiryDate = () => selectedItem?.placement?.placementExpiryDate || "Coming Soon"
  const getPremium = () => {
    if (selectedItem?.placement) return `${selectedItem.placement.totalPremium}`
    if (selectedItem?.policy) return formatEther(selectedItem.policy.premium)
    return "0"
  }

  const getRecentEmails = () => {
    if (!selectedItem) return []
    const policyId = selectedItem.placement?.placementId || selectedItem.policy?.policyHash || ""
    return getEmailsForPolicy(policyId)
  }

  const interpolateTemplate = (template: string): string => {
    let result = template
    result = result.replace(/{{clientName}}/g, getClientName())
    result = result.replace(/{{policyType}}/g, getPolicyType())
    result = result.replace(/{{expiryDate}}/g, getExpiryDate())
    result = result.replace(/{{daysToExpiry}}/g, selectedItem?.placement?.daysUntilExpiry?.toString() || "30")
    result = result.replace(/{{brokerName}}/g, customVariables.brokerName)
    result = result.replace(/\[NEWPREMIUM\]/g, customVariables.newPremium)
    result = result.replace(/\[COMPETITIVEPREMIUM\]/g, customVariables.competitivePremium)

    Object.entries(customVariables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
    })

    return result
  }

  const handleSendEmail = async (emailBody?: string, emailSubject?: string) => {
    if (!selectedTemplate) return

    const subject = emailSubject || interpolateTemplate(selectedTemplate.subject)
    const body = emailBody || interpolateTemplate(selectedTemplate.body)

    setSending(true)
    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedItem?.email || "abhirnayak063@gmail.com",
          subject,
          body,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const newEmail: ScheduledEmail = {
          id: `email_${Date.now()}`,
          templateId: selectedTemplate.id,
          recipientEmail: "abhirnayak063@gmail.com",
          policyHash: selectedItem?.placement?.placementId || selectedItem?.policy?.policyHash || "",
          scheduledAt: new Date(),
          status: "sent",
          attachBrief,
        }
        setSentEmails((prev) => [newEmail, ...prev])
        setSelectedTemplate(null)
        setSelectedItem(null)
      } else {
        console.error("[v0] Error response:", data)
      }
    } catch (error) {
      console.error("[v0] Error sending email:", error)
    } finally {
      setSending(false)
    }
  }

  const handleAddTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject || !newTemplate.body) return

    const template: EmailTemplate = {
      id: `template_${Date.now()}`,
      name: newTemplate.name || "",
      subject: newTemplate.subject || "",
      body: newTemplate.body || "",
      category: (newTemplate.category || "custom") as EmailTemplate["category"],
      variables: newTemplate.variables || [],
    }

    setTemplates((prev) => [...prev, template])
    setNewTemplate({ category: "custom", variables: [] })
  }

  const handleGenerateCustomEmails = async () => {
    if (!selectedItem) return

    setIsGenerating(true)
    try {
      const emailHistory = selectedItem.placement
        ? emailData.filter((e) => e.policyId === selectedItem.placement?.placementId).slice(0, 3)
        : []

      const clientSentiment =
        emailHistory.length > 0
          ? emailHistory.reduce((acc, e) => (e.sentiment === "negative" ? acc + 1 : acc - 1), 0) > 0
            ? "negative"
            : "positive"
          : "neutral"

      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement: selectedItem.placement,
          policy: selectedItem.policy,
          emailHistory,
          clientSentiment,
        }, (key, value) => (typeof value === 'bigint' ? value.toString() : value)),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setGeneratedEmails(data.emails || [])
      }
    } catch (error) {
      console.error("[v0] Error generating custom emails:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const itemsToShow = dataMode === "csv" ? placements : policies

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Email Templates
            </h3>

            <div className="space-y-2 mb-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template)
                    setEditingTemplate(null)
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all ${selectedTemplate?.id === template.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                >
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs opacity-75">{template.category}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setEditingTemplate({
                  id: `custom_${Date.now()}`,
                  name: "",
                  subject: "",
                  body: "",
                  category: "custom",
                  variables: [],
                })
              }
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          </div>

          {/* Recent Emails from Connectors */}
          {selectedItem && getRecentEmails().length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
                <Mail className="h-4 w-4 text-blue-500" />
                Recent Communication
              </h4>
              <div className="space-y-2">
                {getRecentEmails()
                  .slice(0, 3)
                  .map((email, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-secondary text-xs text-foreground">
                      <p className="font-medium truncate">{email.subject}</p>
                      <p className="text-muted-foreground text-xs mt-1">{email.receivedAt}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Item & Email Selection */}
        <div className="md:col-span-2 space-y-4">
          {/* Select Item to Email */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" />
              Select {dataMode === "csv" ? "Placement" : "Policy"}
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {itemsToShow.slice(0, 20).map((item) => {
                const name = dataMode === "csv" ? (item as InsurancePlacement).client : (item as Policy).policyName

                return (
                  <button
                    key={dataMode === "csv" ? (item as InsurancePlacement).placementId : (item as Policy).policyHash}
                    onClick={() =>
                      setSelectedItem({
                        type: dataMode === "csv" ? "placement" : "policy",
                        [dataMode === "csv" ? "placement" : "policy"]: item,
                        email: "abhirnayak063@gmail.com",
                      })
                    }
                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedItem?.policy === item || selectedItem?.placement === item
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-primary/50 bg-card text-foreground"
                      }`}
                  >
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dataMode === "csv" ? (item as InsurancePlacement).productLine : (item as Policy).policyType}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Template Preview & Editor */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <button
              onClick={() => setPreviewExpanded(!previewExpanded)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                {editingTemplate ? "Create Template" : "Email Preview"}
              </h3>
              <ChevronDown className={`h-4 w-4 transition-transform ${previewExpanded ? "rotate-180" : ""}`} />
            </button>

            {previewExpanded && (
              <div className="space-y-3">
                {editingTemplate ? (
                  <>
                    <input
                      type="text"
                      placeholder="Template name"
                      value={newTemplate.name || ""}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Subject line"
                      value={newTemplate.subject || ""}
                      onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm"
                    />
                    <textarea
                      placeholder="Email body"
                      value={newTemplate.body || ""}
                      onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm h-32 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTemplate}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        Save Template
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="flex-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : selectedTemplate ? (
                  <>
                    <div className="p-3 rounded-lg bg-secondary text-foreground">
                      <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                      <p className="text-sm font-medium">{interpolateTemplate(selectedTemplate.subject)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary text-foreground">
                      <p className="text-xs text-muted-foreground mb-1">Body:</p>
                      <p className="text-sm whitespace-pre-wrap">{interpolateTemplate(selectedTemplate.body)}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a template to preview</p>
                )}
              </div>
            )}
          </div>

          {/* Send Email Section - CHANGED: Single SEND EMAIL button */}
          {selectedTemplate && selectedItem && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <button
                onClick={() => handleSendEmail()}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send Email"}
              </button>
            </div>
          )}

          {/* Generate AI Personalized Emails */}
          {selectedItem && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <button
                onClick={handleGenerateCustomEmails}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate AI Personalized Emails"}
              </button>

              {generatedEmails.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Generated Email Variations:</p>
                  {generatedEmails.map((email, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-secondary border border-border space-y-2 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                              {email.tone}
                            </span>
                            <p className="text-xs font-medium text-foreground line-clamp-1">{email.subject}</p>
                          </div>
                          <p className="text-xs text-muted-foreground italic">{email.rationale}</p>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-md bg-input border border-border">
                        <p className="text-xs leading-relaxed text-foreground line-clamp-3">{email.body}</p>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSelectedTemplate({
                              id: `generated_${idx}`,
                              name: `${email.tone} - ${email.subject}`,
                              subject: email.subject,
                              body: email.body,
                              category: "custom",
                              variables: [],
                            })
                            setEditingTemplate(null)
                          }}
                          className="flex-1 px-3 py-2 text-xs rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:border-primary/50 transition-all font-medium"
                        >
                          Use Template
                        </button>
                        <button
                          onClick={() => handleSendEmail(email.body, email.subject)}
                          className="flex-1 px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium"
                        >
                          Send Email
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sent Emails History */}
      {sentEmails.length > 0 && (
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="font-semibold mb-4 text-foreground">Sent Emails</h3>
          <div className="space-y-2">
            {sentEmails.slice(0, 10).map((email) => (
              <div key={email.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{email.recipientEmail}</p>
                  <p className="text-xs text-muted-foreground">{email.scheduledAt.toString()}</p>
                </div>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                  Sent
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
