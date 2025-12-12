/**
 * Google Calendar OAuth 2.0 Authentication
 * Handles token management and OAuth flow
 */

import { google } from "googleapis"
import { getGoogleClientId, getGoogleClientSecret, getCalendarRedirectUri, CALENDAR_CONFIG } from "./calendar-config"

export interface CalendarTokens {
    access_token: string
    refresh_token?: string
    expiry_date?: number
    scope: string
    token_type: string
}

/**
 * Create OAuth2 client for Calendar
 */
export function createCalendarOAuth2Client() {
    return new google.auth.OAuth2(getGoogleClientId(), getGoogleClientSecret(), getCalendarRedirectUri())
}

/**
 * Generate OAuth URL for user consent
 */
export function getCalendarAuthUrl(): string {
    const oauth2Client = createCalendarOAuth2Client()

    return oauth2Client.generateAuthUrl({
        access_type: "offline", // Get refresh token
        scope: [...CALENDAR_CONFIG.scopes],
        prompt: "consent", // Force consent screen
    })
}

/**
 * Exchange authorization code for tokens
 */
export async function getCalendarTokensFromCode(code: string): Promise<CalendarTokens> {
    const oauth2Client = createCalendarOAuth2Client()

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
        throw new Error("No access token received")
    }

    return tokens as CalendarTokens
}

/**
 * Get authenticated Calendar client
 */
export function getCalendarClient(tokens: CalendarTokens) {
    const oauth2Client = createCalendarOAuth2Client()
    oauth2Client.setCredentials(tokens)

    return google.calendar({ version: "v3", auth: oauth2Client })
}

/**
 * Get user email from tokens
 */
export async function getCalendarUserEmail(tokens: CalendarTokens): Promise<string> {
    const oauth2Client = createCalendarOAuth2Client()
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    return data.email || ""
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<CalendarTokens> {
    const oauth2Client = createCalendarOAuth2Client()
    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
        throw new Error("Failed to refresh access token")
    }

    return credentials as CalendarTokens
}

/**
 * Verify token is still valid
 */
export function isTokenExpired(tokens: CalendarTokens): boolean {
    if (!tokens.expiry_date) {
        return false // Assume valid if no expiry
    }

    // Add 5 minute buffer
    return Date.now() >= tokens.expiry_date - 5 * 60 * 1000
}
