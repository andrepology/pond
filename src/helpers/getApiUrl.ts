/**
 * Get the API URL - always uses production URL
 * Can be overridden with VITE_API_URL if needed
 */
export function getApiUrl(): string {
  // Allow override via env var, but default to production
  return import.meta.env.VITE_API_URL || "https://pond-backend.fly.dev";
}

