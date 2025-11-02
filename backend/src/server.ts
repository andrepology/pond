import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Configuring server...');

// CRITICAL: CORS must be configured BEFORE Better Auth handler
// Allow credentials (cookies) from frontend
app.use(
  cors({
    origin: process.env.TRUSTED_ORIGINS?.split(",") || ["http://localhost:5173"],
    credentials: true,
    // Allow the x-jazz-auth header that Jazz plugin uses
    allowedHeaders: ["Content-Type", "Authorization", "x-jazz-auth"],
  })
);

console.log('✅ CORS configured for:', process.env.TRUSTED_ORIGINS);

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
app.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Pond Auth Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server:      http://localhost:${PORT}
🔐 Auth API:    http://localhost:${PORT}/api/auth/*
🏥 Health:      http://localhost:${PORT}/health
🌍 Environment: ${process.env.NODE_ENV || "development"}
🔓 CORS:        ${process.env.TRUSTED_ORIGINS}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Ready to accept requests!
  `);
});