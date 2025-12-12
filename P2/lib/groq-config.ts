// This file should only be imported in server-side code (API routes)

export const GROQ_API_KEY = "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"

export const GROQ_MODEL = "llama-3.3-70b-versatile"

export const GROQ_CONFIG = {
  apiKey: GROQ_API_KEY,
  model: GROQ_MODEL,
  maxTokens: 2000,
  temperature: 0.7,
}

export function getGroqApiKey(): string {
  // Priority: Environment variable > Hardcoded fallback
  return process.env.GROQ_API_KEY || GROQ_API_KEY
}
