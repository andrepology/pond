import { betterAuth } from "better-auth";
import { jazzPlugin } from "jazz-tools/better-auth/auth/server";
import { Pool } from "pg";

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log database connection info (actual connection tested on first query)
console.log('📊 Database configured:', process.env.DATABASE_URL?.split('@')[1]);

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

