import { motion, AnimatePresence } from 'motion/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { useAuthFlow } from '../../hooks/useAuthFlow'

interface AuthViewProps {
  isDocked: boolean
  isAuthMinimized: boolean
  setIsAuthMinimized: (minimized: boolean) => void
  isAuthTransitioningOut: boolean
  showAuthAfterCollapse: boolean
}

export function AuthView({
  isDocked,
  isAuthMinimized,
  setIsAuthMinimized,
  isAuthTransitioningOut,
  showAuthAfterCollapse
}: AuthViewProps) {
  const isAuthenticated = useIsAuthenticated()

  const {
    email,
    setEmail,
    emailChecked,
    userExists,
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
  } = useAuthFlow()

  return (
    <AnimatePresence>
      {!isAuthenticated && showAuthAfterCollapse && !isAuthTransitioningOut && (isDocked || isAuthMinimized) && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 60 }}
          style={{
            position: 'fixed',
            top: 24,
            left: 0,
            right: 0,
            width: 'min(400px, 90vw)',
            margin: '0 auto',
            zIndex: 2000,
            backgroundColor: 'var(--glass-sand-bg)',
            backdropFilter: 'blur(var(--glass-blur))',
            borderRadius: 12,
            border: '1px solid var(--glass-sand-border)',
            pointerEvents: 'auto',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            color: 'var(--glass-text-primary)',
          }}
        >
          {isAuthMinimized ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                gap: 12,
              }}
            >
              <motion.div
                layoutId="authTitle"
                transition={{ layout: { type: 'spring', stiffness: 300, damping: 35 } }}
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#2C2C2C',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  width: 'fit-content',
                }}
              >
                hey, human bean
              </motion.div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  layoutId="continueButton"
                  transition={{ layout: { type: 'spring', stiffness: 400, damping: 50 } }}
                  onClick={() => setIsAuthMinimized(false)}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#fff',
                    backgroundColor: '#8B7355',
                    border: 'none',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.0125em',
                    width: 'fit-content',
                  }}
                  whileHover={{ backgroundColor: '#7B6355', scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  continue
                </motion.button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px 0px 20px',
                }}
              >
                <motion.div
                  layoutId="authTitle"
                  transition={{ layout: { type: 'spring', stiffness: 300, damping: 35 } }}
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#2C2C2C',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                    width: 'fit-content',
                  }}
                >
                  hey, human bean.
                </motion.div>
                <button
                  onClick={() => setIsAuthMinimized(true)}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(139, 115, 85, 0.08)',
                    border: 'none',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                  aria-label="Minimize"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ display: 'block' }}
                  >
                    <line x1="4" y1="4" x2="12" y2="12" stroke="#666" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="12" y1="4" x2="4" y2="12" stroke="#666" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: '12px 20px 20px 20px' }}>
                {/* Step 1: Email Input Only */}
                {!emailChecked && (
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
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 9999,
                          cursor: 'pointer',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.0125em',
                          width: 'fit-content',
                        }}
                        whileHover={{ backgroundColor: '#7B6355', scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {checking ? "Checking..." : "continue"}
                      </motion.button>
                    </div>
                  </form>
                )}

                {/* Step 2: Existing User - Sign In */}
                {emailChecked && userExists && (
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
                      <motion.button
                        layoutId="continueButton"
                        transition={{ layout: { type: 'spring', stiffness: 300, damping: 35 } }}
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
                      </motion.button>
                    </div>

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
                  </form>
                )}

                {/* Step 3: New User - Sign Up */}
                {emailChecked && !userExists && (
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
                      <motion.button
                        layoutId="continueButton"
                        transition={{ layout: { type: 'spring', stiffness: 300, damping: 35 } }}
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
                      </motion.button>
                    </div>

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
                  </form>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
