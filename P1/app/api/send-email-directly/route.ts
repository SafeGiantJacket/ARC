export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to, subject, body: emailBody, templateId, placementId } = body

    if (!to || !subject || !emailBody) {
      return Response.json({ success: false, error: "Missing required fields: to, subject, body" }, { status: 400 })
    }

    // For now, we simulate the email sending and log to console
    console.log("[v0] Email sent:", {
      to,
      subject,
      timestamp: new Date().toISOString(),
      placementId,
    })

    const emailRecord = {
      id: `email_${Date.now()}`,
      to,
      subject,
      body: emailBody,
      templateId,
      placementId,
      sentAt: new Date().toISOString(),
      status: "sent",
    }

    return Response.json({
      success: true,
      email: emailRecord,
      message: `Email sent successfully to ${to}`,
    })
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return Response.json({ success: false, error: "Failed to send email" }, { status: 500 })
  }
}
