import { motion } from 'motion/react'
import { useAuthFlow } from "../hooks/useAuthFlow";

/**
 * AuthView - Authentication UI that matches JournalBrowser styling
 * Used inside JournalBrowser tabs when user is not authenticated
 */
export function AuthView({ onMinimize }: { onMinimize?: () => void }) {
  const {
    me,
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
  } = useAuthFlow();

  // Loading state
  if (me === undefined) {
    return (
      <div style={{ 
        color: '#8B7355', 
        fontSize: 14, 
        textAlign: 'center', 
        padding: '32px 16px' 
      }}>
        Loading...
      </div>
    );
  }

    return (
    <div style={{ padding: '12px 20px 20px 20px' }}>
      {/* Step 1: Email Input Only */}
      {!emailChecked && (
        <>

          <form onSubmit={handleEmailSubmit} style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <label 
                htmlFor="email" 
                style={{ 
                  display: 'block', 
                  marginBottom: 6, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Email
              </label>
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
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  color: '#2C2C2C',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.4)'
                  e.target.style.backgroundColor = '#fff'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)'
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 12,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                lineHeight: 1.4
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <motion.button
                layoutId="continueButton"
                transition={{ layout: { type: 'spring', stiffness: 300, damping: 35 } }}
                type="submit" 
                disabled={checking}
                style={{
                  padding: '8px 20px',
                  backgroundColor: checking ? 'rgba(139, 115, 85, 0.3)' : '#8B7355',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: checking ? 'not-allowed' : 'pointer',
                  opacity: checking ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  width: 'fit-content',
                }}
              >
                {checking ? "Checking..." : "continue"}
              </motion.button>
            </div>
          </form>
        </>
      )}

      {/* Step 2: Existing User - Sign In */}
      {emailChecked && userExists && (
        <>
          <form onSubmit={handleSignIn} style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <label 
                htmlFor="password-signin" 
                style={{ 
                  display: 'block', 
                  marginBottom: 6, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Password
              </label>
              <input
                id="password-signin"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                placeholder="Your password"
                autoComplete="current-password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  color: '#2C2C2C',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.4)'
                  e.target.style.backgroundColor = '#fff'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)'
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 12,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                lineHeight: 1.4
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  backgroundColor: loading ? 'rgba(107, 142, 126, 0.4)' : '#6B8E7E',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  letterSpacing: '-0.01em',
                  transition: 'background-color 0.2s ease, opacity 0.2s ease',
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>

          <button
            onClick={resetToEmail}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 11,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              textAlign: 'center',
              marginTop: 8,
              transition: 'opacity 0.2s ease',
            }}
          >
            Different email?
          </button>
        </>
      )}

      {/* Step 3: New User - Sign Up */}
      {emailChecked && !userExists && (
        <>
          <form onSubmit={handleSignUp} style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <label 
                htmlFor="name" 
                style={{ 
                  display: 'block', 
                  marginBottom: 6, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                placeholder="Your name"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  color: '#2C2C2C',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.4)'
                  e.target.style.backgroundColor = '#fff'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)'
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label 
                htmlFor="password-signup" 
                style={{ 
                  display: 'block', 
                  marginBottom: 6, 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Password
              </label>
              <input
                id="password-signup"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  color: '#2C2C2C',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, background-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.4)'
                  e.target.style.backgroundColor = '#fff'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(139, 115, 85, 0.2)'
                  e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 12,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                lineHeight: 1.4
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  padding: '8px 20px',
                  backgroundColor: loading ? 'rgba(139, 115, 85, 0.4)' : '#8B7355',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  letterSpacing: '-0.01em',
                  transition: 'background-color 0.2s ease, opacity 0.2s ease',
                }}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </div>
          </form>

          <button
            onClick={resetToEmail}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 11,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              textAlign: 'center',
              marginTop: 8,
              transition: 'opacity 0.2s ease',
            }}
          >
            Different email?
          </button>
        </>
      )}
    </div>
  );
}

