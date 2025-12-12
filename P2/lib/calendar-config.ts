/**
 * Google Calendar API Configuration
 */

export const CALENDAR_CONFIG = {
    // OAuth 2.0 Scopes
    scopes: [
        "https://www.googleapis.com/auth/calendar", // Full calendar access (read/write)
        "https://www.googleapis.com/auth/userinfo.email", // Get user email
    ],
} as const

export function getGoogleClientId(): string {
    return process.env.CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ""
}

export function getGoogleClientSecret(): string {
    return process.env.CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ""
}

export function getCalendarRedirectUri(): string {
    return process.env.CALENDAR_REDIRECT_URI || "http://localhost:3000/api/auth/calendar/callback"
}

// Validate Calendar configuration
export function validateCalendarConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!getGoogleClientId()) {
        errors.push("GOOGLE_CLIENT_ID is not set in environment variables")
    }

    if (!getGoogleClientSecret()) {
        errors.push("GOOGLE_CLIENT_SECRET is not set in environment variables")
    }

    // We can fallback to localhost if not set, but ideally it should be set
    // if (!getCalendarRedirectUri()) {
    //     errors.push("CALENDAR_REDIRECT_URI is not set in environment variables")
    // }

    return {
        valid: errors.length === 0,
        errors,
    }
}
