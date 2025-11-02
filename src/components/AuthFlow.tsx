import { useState } from "react";
import { useAccount } from "jazz-tools/react";
import { useIsAuthenticated } from "jazz-tools/react-core";
import { PondAccount } from "../schema";
import { betterAuthClient } from "../lib/auth-client";

/**
 * Authentication flow component for Better Auth + Jazz
 * 
 * With Better Auth + Jazz integration:
 * - Jazz ALWAYS creates an account (anonymous initially)
 * - We check Better Auth session to know if user is truly authenticated
 * - On sign up/in, the anonymous Jazz account transforms to authenticated
 */
export function AuthFlow() {
  const { me } = useAccount(PondAccount, {
    resolve: {
      profile: true,
    },
  });

  // Check Better Auth authentication state - this determines if user is truly authenticated
  const isAuthenticated = useIsAuthenticated();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading state: Jazz account loading
  if (me === undefined) {
    return (
      <div className="auth-container">
        <p>Loading...</p>
      </div>
    );
  }

  // User is authenticated via Better Auth (is authenticated AND has Jazz account)
  if (isAuthenticated && me !== null) {
    return (
      <div className="auth-container">
        <div className="auth-success">
          <h2>Welcome, {me.profile?.name || "Friend"}!</h2>
          <p>Jazz Account ID: {me.$jazz.id}</p>
          <p className="status-text">
            ✓ Authenticated and syncing locally-first
          </p>
          <button onClick={async () => {
            await betterAuthClient.signOut();
            window.location.reload(); // Refresh to reset state
          }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // User is NOT authenticated with Better Auth (may have anonymous Jazz account)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log("🔐 Attempting sign in...");
    console.log("📡 API URL:", import.meta.env.VITE_API_URL || "http://localhost:3000");

    try {
      const result = await betterAuthClient.signIn.email({
        email,
        password,
      });
      
      console.log("✅ Sign in result:", result);
      
      if (result.error) {
        console.error("❌ Sign in error from server:", result.error);
        setError(result.error.message || "Sign in failed");
      }
      // On success, Jazz will automatically update and session will be set
    } catch (err) {
      console.error("❌ Sign in error:", err);
      const errorMsg = err instanceof Error ? err.message : "Sign in failed";
      setError(`Connection error: ${errorMsg}. Is the backend running on port 3000?`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log("📝 Attempting sign up...");
    console.log("📡 API URL:", import.meta.env.VITE_API_URL || "http://localhost:3000");

    try {
      const result = await betterAuthClient.signUp.email(
        {
          email,
          password,
          name,
        },
        {
          onSuccess: async () => {
            // Set the Jazz profile name after successful signup
            if (me?.profile) {
              me.profile.$jazz.set("name", name);
              console.log("✅ Jazz profile name set to:", name);
            }
          },
        }
      );

      console.log("✅ Sign up result:", result);

      if (result.error) {
        console.error("❌ Sign up error from server:", result.error);
        setError(result.error.message || "Sign up failed");
      } else {
        // Success! Jazz account will transform from anonymous to authenticated
        console.log("✅ Sign up successful! Jazz account transformed.");
      }
    } catch (err) {
      console.error("❌ Sign up error:", err);
      const errorMsg = err instanceof Error ? err.message : "Sign up failed";
      setError(`Connection error: ${errorMsg}. Is the backend running on port 3000?`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>{mode === "signin" ? "Sign In" : "Sign Up"}</h2>
        
        {/* Debug info */}
        <div style={{ fontSize: '10px', color: '#999', marginBottom: '1rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px' }}>
          <strong>Debug:</strong> API URL = {import.meta.env.VITE_API_URL || "http://localhost:3000"}
        </div>
        <p className="subtitle">
          {mode === "signin" 
            ? "Sign in to sync your data across devices" 
            : "Create an account to get started"}
        </p>

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
          {mode === "signup" && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                placeholder="Your name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
              placeholder="Min. 8 characters"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <button
          className="link-button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          disabled={loading}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Have an account? Sign in"}
        </button>
      </div>

      <style>{`
        .auth-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 360px;
          max-width: 400px;
          z-index: 1000;
        }

        .auth-form h2,
        .auth-success h2 {
          margin: 0 0 0.5rem;
          font-size: 1.75rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .subtitle {
          margin: 0 0 1.5rem;
          font-size: 0.9rem;
          color: #666;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          font-size: 0.9rem;
          color: #333;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }

        .form-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .auth-form button[type="submit"] {
          width: 100%;
          padding: 0.875rem;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
          transition: background 0.2s;
        }

        .auth-form button[type="submit"]:hover:not(:disabled) {
          background: #357abd;
        }

        .auth-form button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .link-button {
          width: 100%;
          padding: 0.75rem;
          background: none;
          border: none;
          color: #4a90e2;
          font-size: 0.9rem;
          cursor: pointer;
          margin-top: 1rem;
          transition: color 0.2s;
        }

        .link-button:hover:not(:disabled) {
          color: #357abd;
          text-decoration: underline;
        }

        .link-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error {
          color: #e74c3c;
          background: #ffe6e6;
          padding: 0.75rem;
          border-radius: 6px;
          margin-top: 1rem;
          font-size: 0.875rem;
          border: 1px solid #ffcccc;
        }

        .auth-success {
          text-align: center;
        }

        .auth-success p {
          margin: 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .status-text {
          color: #27ae60 !important;
          font-weight: 500;
          margin-top: 1rem !important;
        }

        .auth-success button {
          margin-top: 2rem;
          padding: 0.875rem 2rem;
          background: #e74c3c;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .auth-success button:hover {
          background: #c0392b;
        }
      `}</style>
    </div>
  );
}
