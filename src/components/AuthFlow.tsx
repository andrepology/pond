import { useState } from "react";
import { useAccount } from "jazz-tools/react";
import { useIsAuthenticated } from "jazz-tools/react-core";
import { PondAccount } from "../schema";
import { betterAuthClient } from "../lib/auth-client";

/**
 * Unified authentication flow component for Better Auth + Jazz
 *
 * Single form that adapts based on email existence:
 * - Enter email → check if exists in DB
 * - If exists: "Welcome back, [Name]" + password field (sign in)
 * - If new: Name field + password field (sign up)
 */
export function AuthFlow() {
  const { me } = useAccount(PondAccount, {
    resolve: {
      profile: true,
    },
  });

  // Check Better Auth authentication state (distinguishes anonymous from authenticated)
  const isAuthenticated = useIsAuthenticated();

  // Unified flow state
  const [email, setEmail] = useState("");
  const [emailChecked, setEmailChecked] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [existingUserName, setExistingUserName] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email existence checking function
  const checkEmail = async (emailToCheck: string) => {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/check-email?email=${encodeURIComponent(emailToCheck)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check email');
      }

      const data = await response.json();
      setUserExists(data.exists);
      setExistingUserName(data.name || null);
      setEmailChecked(true);
    } catch (err) {
      console.error('Email check error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check email');
    } finally {
      setChecking(false);
    }
  };

  // Handle email input and checking
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    await checkEmail(email);
  };

  // Handle sign in
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
      // On success, Better Auth will handle session creation
    } catch (err) {
      console.error("❌ Sign in error:", err);
      const errorMsg = err instanceof Error ? err.message : "Sign in failed";
      setError(`Connection error: ${errorMsg}. Is the backend running on port 3000?`);
    } finally {
      setLoading(false);
    }
  };

  // Handle sign up
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

  // Reset to email input
  const resetToEmail = () => {
    setEmailChecked(false);
    setUserExists(false);
    setExistingUserName(null);
    setPassword("");
    setName("");
    setError(null);
  };

  // Loading state: Jazz account loading
  if (me === undefined) {
    return (
      <div className="auth-container">
        <p>Loading...</p>
      </div>
    );
  }

  // User is authenticated - hide auth flow completely
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        {/* Step 1: Email Input Only */}
        {!emailChecked && (
          <>
            <h2>Get Started</h2>

            <form onSubmit={handleEmailSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={checking}
                  placeholder="your@email.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {error && <div className="error">{error}</div>}

              <button type="submit" disabled={checking}>
                {checking ? "Checking..." : "Continue"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Existing User - Sign In */}
        {emailChecked && userExists && (
          <>
            <h2>Welcome back, {existingUserName || "there"}!</h2>

            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  style={{ opacity: 0.7 }}
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
                  placeholder="Your password"
                  autoComplete="current-password"
                  autoFocus
                />
              </div>

              {error && <div className="error">{error}</div>}

              <button type="submit" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <button
              className="link-button"
              onClick={resetToEmail}
              disabled={loading}
            >
              Different email?
            </button>
          </>
        )}

        {/* Step 3: New User - Sign Up */}
        {emailChecked && !userExists && (
          <>
            <h2>Create Account</h2>

            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

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
                  autoFocus
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
                  autoComplete="new-password"
                />
              </div>

              {error && <div className="error">{error}</div>}

              <button type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <button
              className="link-button"
              onClick={resetToEmail}
              disabled={loading}
            >
              Different email?
            </button>
          </>
        )}
      </div>

      <style>{`
        .auth-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 1.5rem;
          border: 1px solid #e0e7ef;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          min-width: 320px;
          max-width: 360px;
          z-index: 1000;
        }

        .auth-form h2 {
          margin: 0 0 0.75rem 0;
          font-size: 1.25rem;
          font-weight: 500;
          color: #333;
        }

        .form-group {
          margin-bottom: 0.875rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.375rem;
          font-weight: 500;
          font-size: 0.875rem;
          color: #333;
        }

        .form-group input {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.95rem;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #999;
          box-shadow: 0 0 0 2px rgba(153, 153, 153, 0.1);
        }

        .form-group input:disabled {
          background-color: #f9f9f9;
          cursor: not-allowed;
        }

        .auth-form button[type="submit"] {
          width: 100%;
          padding: 0.75rem;
          background: #666;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          margin-top: 0.875rem;
          transition: background 0.2s;
        }

        .auth-form button[type="submit"]:hover:not(:disabled) {
          background: #555;
        }

        .auth-form button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .link-button {
          width: 100%;
          padding: 0.5rem;
          background: none;
          border: none;
          color: #666;
          font-size: 0.85rem;
          cursor: pointer;
          margin-top: 0.75rem;
          transition: color 0.2s;
        }

        .link-button:hover:not(:disabled) {
          color: #333;
          text-decoration: underline;
        }

        .link-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 0.625rem;
          border-radius: 4px;
          margin-top: 0.875rem;
          font-size: 0.85rem;
          border: 1px solid #ffcdd2;
        }

        .auth-success {
          text-align: center;
        }

        .auth-success h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 500;
          color: #333;
        }

        .auth-success p {
          margin: 0.375rem 0;
          color: #666;
          font-size: 0.875rem;
        }

        .status-text {
          color: #2e7d32 !important;
          font-weight: 500;
          margin-top: 0.875rem !important;
        }

        .auth-success button {
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: #d32f2f;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .auth-success button:hover {
          background: #b71c1c;
        }
      `}</style>
    </div>
  );
}
