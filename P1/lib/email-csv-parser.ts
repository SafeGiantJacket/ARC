import type { EmailData } from "./types"

export function parseEmailCSV(csvText: string): EmailData[] {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ""))
  const emails: EmailData[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 3) continue

    const getValue = (keys: string[]): string => {
      for (const key of keys) {
        const idx = headers.findIndex((h) => h.includes(key))
        if (idx >= 0 && values[idx]) return values[idx]
      }
      return ""
    }

    const email: EmailData = {
      emailId: getValue(["emailid", "id", "messageid"]) || `EM-${i}`,
      subject: getValue(["subject", "title"]),
      clientName: getValue(["clientname", "client", "from", "sender"]),
      receivedAt: getValue(["receivedat", "received", "date", "datetime"]),
      policyId: getValue(["policyid", "policy", "placementid"]),
      summary: getValue(["summary", "body", "preview", "snippet"]),
      sentiment: (getValue(["sentiment", "tone"]) as EmailData["sentiment"]) || "neutral",
      threadCount: Number.parseInt(getValue(["threadcount", "threads", "count"]), 10) || 1,
      sourceLink: getValue(["sourcelink", "link", "url"]) || `https://mail.example.com/${i}`,
      senderEmail: getValue(["senderemail", "fromemail", "email"]) || "",
    }

    if (email.subject || email.clientName) {
      emails.push(email)
    }
  }

  return emails
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

export function generateEmailSampleCSV(): string {
  return `EmailId,Subject,ClientName,ReceivedAt,PolicyId,Summary,Sentiment,ThreadCount,SourceLink,SenderEmail
EM-501,Renewal – Need Updated Proposal,Alpha Manufacturing Ltd,2025-01-14 09:17 AM,POL-8841,Client urgently requesting renewal quote; mentions competitor pricing and is considering switching,negative,7,https://outlook.office.com/mail/em501,contact@alphamfg.com
EM-502,Claims Report for Underwriter,Brightline Logistics,2025-01-20 03:02 PM,POL-6722,Loss-run shared; underwriter asked for clarification on claim details. Standard processing.,neutral,11,https://outlook.office.com/mail/em502,info@brightlinelogistics.com
EM-503,Renewal Checklist & Required Docs,Seawind Hotels,2025-01-28 01:44 PM,POL-5530,Client sent property valuation but cyber questionnaire missing. Waiting on missing documentation.,neutral,5,https://outlook.office.com/mail/em503,admin@seawindhotels.com
EM-504,Appreciation + Next Cycle,Orion Tech Services,2025-01-04 06:40 PM,POL-9005,Client appreciated last renewal speed and pricing. Open to proposal for cyber policy expansion.,positive,3,https://outlook.office.com/mail/em504,buyer@oriontech.com
EM-505,URGENT: Policy Expiring Soon,Delta Construction Corp,2025-02-01 08:15 AM,POL-7823,Client expressing frustration over missed deadlines and lack of communication. Demanding immediate resolution.,negative,15,https://outlook.office.com/mail/em505,legal@deltaconstruction.com
EM-506,Renewal Approved & Bound,Pacific Insurance Group,2025-01-25 02:30 PM,POL-5412,Excellent progress - all parties signed off. Coverage bound and effective immediately.,positive,4,https://outlook.office.com/mail/em506,renewals@pacificins.com
EM-507,Pending Quote Feedback,Zenith Manufacturing,2025-02-03 11:45 AM,POL-9234,Awaiting client feedback on three carrier quotes. No response to follow-up emails.,neutral,6,https://outlook.office.com/mail/em507,procurement@zenithmfg.com
EM-508,Complaint - Poor Service,Guardian Security Ltd,2025-02-02 04:20 PM,POL-6890,Client complained about claim handling process and slow response times from carrier. Requesting account review.,negative,9,https://outlook.office.com/mail/em508,complaints@guardiansec.com
EM-509,Renewal Complete - Thank You,Maple Retail Network,2025-01-30 10:00 AM,POL-4567,Client very satisfied with renewal terms and quick turnaround. Plans to expand coverage next year.,positive,2,https://outlook.office.com/mail/em509,manager@maplenetwork.com`
}
