/**
 * Gmail Email Fetcher
 * Fetches and parses emails from Gmail API
 */

import { gmail_v1 } from "googleapis"
import type { GmailEmail } from "./types"
import { getGmailClient, type GmailTokens } from "./gmail-auth"
import { GMAIL_CONFIG } from "./gmail-config"

/**
 * Fetch emails from Gmail
 */
export async function fetchGmailEmails(
    tokens: GmailTokens,
    options: {
        maxResults?: number
        dateRangeDays?: number
        labelIds?: string[]
    } = {},
): Promise<GmailEmail[]> {
    const gmail = getGmailClient(tokens)

    const maxResults = options.maxResults || GMAIL_CONFIG.defaultFetchParams.maxResults
    const dateRangeDays = options.dateRangeDays || GMAIL_CONFIG.defaultDateRange
    const labelIds = options.labelIds || GMAIL_CONFIG.defaultFetchParams.labelIds

    // Calculate date filter (Gmail uses seconds since epoch)
    const afterDate = new Date()
    afterDate.setDate(afterDate.getDate() - dateRangeDays)
    const afterTimestamp = Math.floor(afterDate.getTime() / 1000)

    // Build query
    const query = `after:${afterTimestamp}`

    // List messages
    const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        labelIds: Array.isArray(labelIds) ? labelIds : [...labelIds], // Convert readonly to mutable array
        q: query,
        includeSpamTrash: GMAIL_CONFIG.defaultFetchParams.includeSpamTrash,
    })

    const messages = listResponse.data?.messages || []

    if (messages.length === 0) {
        return []
    }

    // Fetch full message details in parallel (with rate limiting)
    const emails: GmailEmail[] = []

    for (const message of messages) {
        if (!message.id) continue

        try {
            const fullMessage = await gmail.users.messages.get({
                userId: "me",
                id: message.id,
                format: "full",
            })

            const parsedEmail = parseGmailMessage(fullMessage.data)
            if (parsedEmail) {
                emails.push(parsedEmail)
            }

            // Rate limiting - wait between requests
            await sleep(200) // 5 requests per second
        } catch (error) {
            console.error(`[Gmail] Failed to fetch message ${message.id}:`, error)
            // Continue with other messages
        }
    }

    return emails
}

/**
 * Parse Gmail message into our GmailEmail format
 */
function parseGmailMessage(message: gmail_v1.Schema$Message): GmailEmail | null {
    if (!message.id || !message.payload) {
        return null
    }

    const headers = message.payload.headers || []
    const getHeader = (name: string): string => {
        const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        return header?.value || ""
    }

    const subject = getHeader("Subject")
    const from = getHeader("From")
    const to = getHeader("To")
    const date = getHeader("Date")

    // Extract email address from "Name <email@example.com>" format
    const fromEmail = extractEmail(from)

    // Get email body
    const { plainText, htmlText } = extractBody(message.payload)

    // Get labels
    const labels = message.labelIds || []

    // Check if unread
    const isUnread = labels.includes("UNREAD")

    // Check for attachments
    const hasAttachments = hasAttachmentsParts(message.payload)

    // Create Gmail link
    const gmailLink = `https://mail.google.com/mail/u/0/#inbox/${message.id}`

    return {
        id: message.id,
        threadId: message.threadId || message.id,
        subject,
        from,
        fromEmail,
        to,
        date: date || new Date().toISOString(),
        snippet: message.snippet || "",
        body: plainText.slice(0, GMAIL_CONFIG.maxBodyLength),
        bodyHtml: htmlText,
        labels,
        isUnread,
        hasAttachments,
        gmailLink,
    }
}

/**
 * Extract email address from header
 */
function extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/)
    return match ? match[1] : fromHeader
}

/**
 * Extract plain text and HTML body from message
 */
function extractBody(payload: gmail_v1.Schema$MessagePart): { plainText: string; htmlText: string } {
    let plainText = ""
    let htmlText = ""

    function extractFromPart(part: gmail_v1.Schema$MessagePart) {
        if (part.mimeType === "text/plain" && part.body?.data) {
            plainText += decodeBase64(part.body.data)
        } else if (part.mimeType === "text/html" && part.body?.data) {
            htmlText += decodeBase64(part.body.data)
        }

        // Recursively check parts
        if (part.parts) {
            for (const subPart of part.parts) {
                extractFromPart(subPart)
            }
        }
    }

    extractFromPart(payload)

    return { plainText, htmlText }
}

/**
 * Check if message has attachments
 */
function hasAttachmentsParts(payload: gmail_v1.Schema$MessagePart): boolean {
    if (payload.filename && payload.filename.length > 0) {
        return true
    }

    if (payload.parts) {
        return payload.parts.some((part) => hasAttachmentsParts(part))
    }

    return false
}

/**
 * Decode base64url encoded string
 */
function decodeBase64(encoded: string): string {
    try {
        // Replace URL-safe characters
        const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
        // Decode
        return Buffer.from(base64, "base64").toString("utf-8")
    } catch (error) {
        console.error("[Gmail] Failed to decode base64:", error)
        return ""
    }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
