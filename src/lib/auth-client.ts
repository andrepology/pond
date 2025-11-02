import { createAuthClient } from "better-auth/client";
import { jazzPluginClient } from "jazz-tools/better-auth/auth/client";

/**
 * Better Auth client with Jazz plugin
 * 
 * This client:
 * - Handles authentication (sign up, sign in, sign out)
 * - Stores Jazz account keys with Better Auth backend
 * - Syncs Jazz authentication state with Better Auth
 */
export const betterAuthClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  plugins: [
    jazzPluginClient(),
    // Add other Better Auth client plugins here (e.g., for social auth)
  ],
});

