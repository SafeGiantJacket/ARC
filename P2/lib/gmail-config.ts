/**
 * Gmail API Configuration
 * Handles OAuth scopes, API settings, and rate limiting
 */

export const GMAIL_CONFIG = {
    // OAuth 2.0 Scopes
    scopes: [
        "https://www.googleapis.com/auth/gmail.readonly", // Read emails
        "https://www.googleapis.com/auth/userinfo.email", // Get user email
        "https://www.googleapis.com/auth/gmail.send", // Send emails
    ],

    // API Rate Limiting
    rateLimit: {
        maxRequestsPerSecond: 5,
        maxEmailsPerFetch: 50,
    },

    // Default fetch parameters
    defaultFetchParams: {
        maxResults: 50,
        labelIds: ["INBOX"], // Only fetch from inbox
        includeSpamTrash: false,
    },

    // Date range for email fetching (days)
    defaultDateRange: 30, // Last 30 days

    // Email processing
    maxBodyLength: 10000, // Max characters to extract from email body

    // Sentiment analysis batch size
    sentimentBatchSize: 10,
} as const

export function getGoogleClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || ""
}

export function getGoogleClientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || ""
}

export function getGmailRedirectUri(): string {
    return process.env.GMAIL_REDIRECT_URI || "http://localhost:3000/api/auth/gmail/callback"
}

export function getNextAuthSecret(): string {
    return process.env.NEXTAUTH_SECRET || "default-secret-change-in-production"
}

// Validate Gmail configuration
export function validateGmailConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!getGoogleClientId()) {
        errors.push("GOOGLE_CLIENT_ID is not set in environment variables")
    }

    if (!getGoogleClientSecret()) {
        errors.push("GOOGLE_CLIENT_SECRET is not set in environment variables")
    }

    if (!getGmailRedirectUri()) {
        errors.push("GMAIL_REDIRECT_URI is not set in environment variables")
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}
