import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth, pool } from "./auth.js";

// Set process title for better identification
process.title = "pond-auth-backend";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

console.log('🔧 Configuring server...');

// CRITICAL: CORS must be configured BEFORE Better Auth handler
// Allow credentials (cookies) from frontend
const allowedOrigins = process.env.TRUSTED_ORIGINS?.split(",") || ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in the static list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow all Vercel deployments (*.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    // Allow the x-jazz-auth header that Jazz plugin uses
    allowedHeaders: ["Content-Type", "Authorization", "x-jazz-auth"],
  })
);

console.log('✅ CORS configured for:', allowedOrigins.join(', '), '+ *.vercel.app');

// CRITICAL: Mount Better Auth handler BEFORE express.json()
// Better Auth needs to handle raw request body for certain operations
app.all("/api/auth/*", toNodeHandler(auth));

console.log('✅ Better Auth handler mounted at /api/auth/*');

// Now we can use express.json() for other routes
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "pond-auth-server"
  });
});

// Check if email exists in database
app.get("/api/check-email", async (req, res) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'invalid email format' });
  }

  try {
    const result = await pool.query(
      'SELECT name FROM "user" WHERE email = $1',
      [email]
    );

    const exists = result.rows.length > 0;
    const name = result.rows[0]?.name;

    res.json({ exists, name });
  } catch (error) {
    console.error('Database error checking email:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Future API routes will go here
// app.use("/api/elevenlabs", elevenLabsRouter);
// app.use("/api/ai", aiRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// Start server
// Listen on 0.0.0.0 for Fly.io (required for external connections)
const hostname = process.env.FLY_APP_NAME ? "0.0.0.0" : "localhost";
app.listen(PORT, hostname, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Pond Auth Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server:      http://${hostname}:${PORT}
🔐 Auth API:    http://${hostname}:${PORT}/api/auth/*
🏥 Health:      http://${hostname}:${PORT}/health
🌍 Environment: ${process.env.NODE_ENV || "development"}
🔓 CORS:        ${process.env.TRUSTED_ORIGINS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Ready to accept requests!
  `);
});