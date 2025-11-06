import { useState } from "react";
import { useAccount } from "jazz-tools/react";
import { useIsAuthenticated } from "jazz-tools/react-core";
import { PondAccount } from "../schema";
import { betterAuthClient } from "../lib/auth-client";

/**
 * Custom hook for authentication flow logic
 * Extracted from AuthFlow component for reuse
 */
export function useAuthFlow() {
  const { me } = useAccount(PondAccount, {
    resolve: {
      profile: true,
    },
  });

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

  return {
    me,
    isAuthenticated,
    email,
    setEmail,
    emailChecked,
    userExists,
    existingUserName,
    password,
    setPassword,
    name,
    setName,
    loading,
    checking,
    error,
    handleEmailSubmit,
    handleSignIn,
    handleSignUp,
    resetToEmail,
  };
}

