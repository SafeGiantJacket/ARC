/**
 * Gmail OAuth 2.0 Authentication
 * Handles token management and OAuth flow
 */

import { google } from "googleapis"
import { getGoogleClientId, getGoogleClientSecret, getGmailRedirectUri, GMAIL_CONFIG } from "./gmail-config"

export interface GmailTokens {
    access_token: string
    refresh_token?: string
    expiry_date?: number
    scope: string
    token_type: string
}

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
    return new google.auth.OAuth2(getGoogleClientId(), getGoogleClientSecret(), getGmailRedirectUri())
}

/**
 * Generate OAuth URL for user consent
 */
export function getAuthUrl(): string {
    const oauth2Client = createOAuth2Client()

    return oauth2Client.generateAuthUrl({
        access_type: "offline", // Get refresh token
        scope: [...GMAIL_CONFIG.scopes], // Convert readonly to mutable array
        prompt: "consent", // Force consent screen to get refresh token
    })
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string): Promise<GmailTokens> {
    const oauth2Client = createOAuth2Client()

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
        throw new Error("No access token received")
    }

    return tokens as GmailTokens
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
        throw new Error("Failed to refresh access token")
    }

    return credentials as GmailTokens
}

/**
 * Get authenticated Gmail client
 */
export function getGmailClient(tokens: GmailTokens) {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials(tokens)

    return google.gmail({ version: "v1", auth: oauth2Client })
}

/**
 * Verify token is still valid
 */
export function isTokenExpired(tokens: GmailTokens): boolean {
    if (!tokens.expiry_date) {
        return false // Assume valid if no expiry
    }

    // Add 5 minute buffer
    return Date.now() >= tokens.expiry_date - 5 * 60 * 1000
}

/**
 * Get user email from tokens
 */
export async function getUserEmail(tokens: GmailTokens): Promise<string> {
    const oauth2Client = createOAuth2Client()
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    return data.email || ""
}
