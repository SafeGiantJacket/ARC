/**
 * Gmail Sender Utility
 * Handles constructing raw emails and sending via Gmail API
 */

import { GmailTokens, getGmailClient } from "./gmail-auth"

interface SendEmailParams {
    to: string
    subject: string
    body: string
    from?: string
}

/**
 * Send an email using the Gmail API
 */
export async function sendGmailEmail(tokens: GmailTokens, { to, subject, body }: SendEmailParams) {
    const gmail = getGmailClient(tokens)

    // Construct raw email (RFC 2822)
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`
    const messageParts = [
        `To: ${to}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        body,
    ]
    const message = messageParts.join("\n")

    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")

    try {
        const res = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        })

        return res.data
    } catch (error) {
        console.error("Error sending email:", error)
        throw error
    }
}
