export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      template,
      variables,
      recipientEmail,
      scheduledAt,
      attachBrief,
      briefData,
      to,
      subject,
      body: emailBody,
      templateId,
      policyId,
    } = body

    // Replace template variables
    let emailSubject = subject
    let emailBodyContent = emailBody

    if (template && variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, "g")
        emailSubject = emailSubject.replace(regex, value as string)
        emailBodyContent = emailBodyContent.replace(regex, value as string)
      })
    }

    // If attaching brief, generate a summary section
    let briefSection = ""
    if (attachBrief && briefData) {
      briefSection = `

---
RENEWAL BRIEF SUMMARY
---
${briefData.summary}

Key Insights:
${briefData.keyInsights.map((i: { text: string }) => `• ${i.text}`).join("\n")}

Suggested Actions:
${briefData.suggestedActions.map((a: { action: string; priority: string }) => `• [${a.priority.toUpperCase()}] ${a.action}`).join("\n")}
---`
      emailBodyContent += briefSection
    }

    // In production, integrate with email service (SendGrid, Mailgun, etc.)
    // For now, we log the email and return success
    console.log("[v0] Email being sent to:", to)
    console.log("[v0] Subject:", emailSubject)
    console.log("[v0] Template ID:", templateId)

    const emailRecord = {
      id: `email_${Date.now()}`,
      to: to || recipientEmail,
      subject: emailSubject,
      body: emailBodyContent,
      templateId,
      policyId,
      sentAt: new Date().toISOString(),
      status: scheduledAt ? "scheduled" : "sent",
    }

    return Response.json({
      success: true,
      email: emailRecord,
      message: scheduledAt
        ? `Email scheduled for ${scheduledAt}`
        : `Email sent successfully to ${to || recipientEmail}`,
    })
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return Response.json({ success: false, error: "Failed to send email" }, { status: 500 })
  }
}
