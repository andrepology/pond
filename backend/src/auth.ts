import { betterAuth } from "better-auth";
import { jazzPlugin } from "jazz-tools/better-auth/auth/server";
import { Pool } from "pg";

/**
 * Detects if running on Fly.io (production)
 * Fly.io sets FLY_APP_NAME in deployed apps
 */
function isFlyIoProduction(): boolean {
  return !!process.env.FLY_APP_NAME;
}

/**
 * Normalizes DATABASE_URL based on environment
 * - Production (Fly.io): Uses .internal hostname directly
 * - Local dev with proxy: Converts .internal to localhost:5432
 * - Local dev without proxy: Falls back to provided URL
 */
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // In production (Fly.io), use DATABASE_URL as-is (contains .internal)
  if (isFlyIoProduction()) {
    return dbUrl;
  }

  // In local development, if URL contains .internal, replace with localhost
  // This assumes fly proxy is running: fly proxy 5432 -a pond-auth-db
  if (dbUrl.includes(".internal")) {
    const url = new URL(dbUrl);
    url.hostname = "localhost";
    url.port = "5432";
    const normalizedUrl = url.toString();
    console.log("🔄 Local dev: Using proxy connection (localhost:5432)");
    return normalizedUrl;
  }

  // Already configured for local development or other setup
  return dbUrl;
}

const databaseUrl = getDatabaseUrl();

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: databaseUrl,
});

// Log database connection info (actual connection tested on first query)
const connectionHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
console.log('📊 Database configured:', connectionHost);
console.log('🌍 Environment:', isFlyIoProduction() ? 'production (Fly.io)' : 'local development');

/**
 * Better Auth instance with Jazz plugin
 * 
 * The Jazz plugin:
 * - Adds `accountID` field to the user table
 * - Stores Jazz account keys with each user
 * - Intercepts the `x-jazz-auth` header from client
 */
export const auth = betterAuth({
  database: pool,
  
  // Base configuration
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  basePath: "/api/auth",
  
  // Trusted origins (for CORS)
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || ["http://localhost:5173"],
  
  // Enable email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email service
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  
  // Cross-origin cookie settings for production (pond.space → pond-backend.fly.dev)
  // Note: partitioned cookies (CHIPS) not supported in Safari/iOS yet, so omitted for iOS PWA compatibility
  // Chrome 118+ supports partitioned, but Safari ignores it. Keep sameSite: "none" + secure: true for cross-site cookies.
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      // partitioned: true, // Chrome 118+ only; Safari/iOS doesn't support yet - keep commented for iOS PWA compatibility
    },
  },
  
  // Add Jazz plugin - CRITICAL for Jazz account key storage
  plugins: [
    jazzPlugin(),
  ],
  
  // Optional: Database hooks for debugging/logging
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          console.log("✅ User created:", user.email, "Jazz Account ID:", user.accountID);
        },
      },
    },
  },
});

