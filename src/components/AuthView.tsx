import { useAuthFlow } from "../hooks/useAuthFlow";

/**
 * AuthView - Authentication UI that matches JournalBrowser styling
 * Used inside JournalBrowser tabs when user is not authenticated
 */
export function AuthView() {
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
    <div style={{ padding: '12px 16px 16px 16px' }}>
      {/* Step 1: Email Input Only */}
      {!emailChecked && (
        <>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: 15, 
            fontWeight: 600, 
            color: '#333',
            textAlign: 'center'
          }}>
            Get Started
          </h2>

          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: 10 }}>
              <label 
                htmlFor="email" 
                style={{ 
                  display: 'block', 
                  marginBottom: 4, 
                  fontSize: 10, 
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
                  padding: '8px 10px',
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  borderRadius: 6,
                  fontSize: 12,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  color: '#333',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 10,
                fontSize: 10,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                lineHeight: 1.3
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={checking}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: checking ? 'rgba(139, 115, 85, 0.3)' : '#8B7355',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: checking ? 'not-allowed' : 'pointer',
                opacity: checking ? 0.6 : 1,
              }}
            >
              {checking ? "Checking..." : "Continue"}
            </button>
          </form>
        </>
      )}

      {/* Step 2: Existing User - Sign In */}
      {emailChecked && userExists && (
        <>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: 15, 
            fontWeight: 600, 
            color: '#333',
            textAlign: 'center'
          }}>
            Welcome back{existingUserName ? `, ${existingUserName}` : ''}!
          </h2>

          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: 10 }}>
              <label 
                htmlFor="password-signin" 
                style={{ 
                  display: 'block', 
                  marginBottom: 4, 
                  fontSize: 10, 
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
                  padding: '8px 10px',
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  borderRadius: 6,
                  fontSize: 12,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  color: '#333',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 10,
                fontSize: 10,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                lineHeight: 1.3
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: loading ? 'rgba(107, 142, 126, 0.4)' : '#6B8E7E',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginBottom: 6,
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <button
            onClick={resetToEmail}
            disabled={loading}
            style={{
              width: '100%',
              padding: '6px',
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              textAlign: 'center',
            }}
          >
            Different email?
          </button>
        </>
      )}

      {/* Step 3: New User - Sign Up */}
      {emailChecked && !userExists && (
        <>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: 15, 
            fontWeight: 600, 
            color: '#333',
            textAlign: 'center'
          }}>
            Create Account
          </h2>

          <form onSubmit={handleSignUp}>
            <div style={{ marginBottom: 10 }}>
              <label 
                htmlFor="name" 
                style={{ 
                  display: 'block', 
                  marginBottom: 4, 
                  fontSize: 10, 
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
                  padding: '8px 10px',
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  borderRadius: 6,
                  fontSize: 12,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  color: '#333',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label 
                htmlFor="password-signup" 
                style={{ 
                  display: 'block', 
                  marginBottom: 4, 
                  fontSize: 10, 
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
                  padding: '8px 10px',
                  border: '1px solid rgba(139, 115, 85, 0.25)',
                  borderRadius: 6,
                  fontSize: 12,
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  color: '#333',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#d32f2f',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 10,
                fontSize: 10,
                border: '1px solid rgba(211, 47, 47, 0.2)',
                lineHeight: 1.3
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: loading ? 'rgba(139, 115, 85, 0.4)' : '#8B7355',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                marginBottom: 6,
              }}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <button
            onClick={resetToEmail}
            disabled={loading}
            style={{
              width: '100%',
              padding: '6px',
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              textAlign: 'center',
            }}
          >
            Different email?
          </button>
        </>
      )}
    </div>
  );
}

