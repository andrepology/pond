import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { useAuthFlow } from '../../hooks/useAuthFlow'
import { glass, text, tint, blur } from './theme'

interface AuthViewProps {
  isDocked: boolean
  isAuthMinimized: boolean
  setIsAuthMinimized: (minimized: boolean) => void
  isAuthTransitioningOut: boolean
  showAuthAfterCollapse: boolean
  hasActiveTab: boolean
}

export function AuthView({
  isDocked,
  isAuthMinimized,
  setIsAuthMinimized,
  isAuthTransitioningOut,
  showAuthAfterCollapse,
  hasActiveTab
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

  const [introSeen, setIntroSeen] = React.useState(false)

  return (
    <AnimatePresence>
      {!isAuthenticated && showAuthAfterCollapse && !isAuthTransitioningOut && (isDocked || isAuthMinimized) && !hasActiveTab && (
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
            // backgroundColor: glass.ultraLight,
            //backdropFilter: blur.medium,
            borderRadius: 12,
            border: 'none',
            pointerEvents: 'auto',
            overflow: 'hidden',
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
                  fontWeight: 500,
                  color: text.secondary,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
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
                    color: text.secondary,
                    backgroundColor: tint.earthStrong,
                    backdropFilter: blur.subtle,
                    border: 'none',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.0125em',
                    width: 'fit-content',
                  }}
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
                    color: text.secondary,
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                    width: 'fit-content',
                  }}
                >
                  hey, human bean
                </motion.div>
                <button
                  onClick={() => setIsAuthMinimized(true)}
                  style={{
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: glass.ultraLight,
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
                    <line x1="4" y1="4" x2="12" y2="12" stroke={text.tertiary} strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="12" y1="4" x2="4" y2="12" stroke={text.tertiary} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: '12px 20px 20px 20px' }}>
                {/* Step 0: Introduction */}
                {!introSeen && (
                  <div style={{ marginTop: 0 }}>
                    <div style={{
                      fontSize: 14,
                      color: 'white',
                      lineHeight: 1.5,
                      marginBottom: 16,
                      fontWeight: 400,
                    }}>
                      we created pond as an anchor for presence and calm amidst busy digital life.
                    </div>
                    <div style={{
                      fontSize: 14,
                      color: 'white',
                      lineHeight: 1.4,
                      marginBottom: 16,
                    }}>
                       while we are still stitching the parts together,  it is already functional and beautiful; as such, you are welcome here and it will be an honor to have your presence 💛
                    </div>

                    <div style={{
                      fontSize: 14,
                      color: 'white',
                      lineHeight: 1.4,
                      marginBottom: 16,
                    }}>
                      may it serve you, dear fellow human bean. 
                    </div>

                    <div style={{
                      fontSize: 14,
                      color: 'white',
                      lineHeight: 1.4,
                      marginBottom: 16,
                    }}>
                      huggingly,<br /><a href="https://svitlana.me" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>svitlana</a> and <a href="https://andrepology.substack.com/p/why-i-draw" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>andre</a> (no corporations or VCs involved;)🌻
                    </div>
                  

                    <img 
                      src="/svitlana-and-andre.jpg" 
                      alt="Svitlana and Andre" 
                      style={{
                        width: '50%',
                        borderRadius: 8,
                        marginBottom: 16,
                      }}
                    />

                    <div style={{
                      fontSize: 10,
                      color: 'white',
                      lineHeight: 1.4,
                      marginBottom: 8,
                      opacity: 0.8
                    }}>
                      <div>• pond is local-first: your data stays on your device, encrypted. we can't see it even if we tried.</div>
                      <div>• when AI is used, it is never stored anywhere except your device.</div>
                      <div>• Innio will always ask before sharing anything he learns about you.</div>
                    </div>

                    <div style={{
                      fontSize: 10,
                      color: 'white',
                      lineHeight: 1.4,
                      marginBottom: 16,
                    }}>
                      p.s.: join this <a href="https://t.me/pondspace" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>telegram channel</a> for updates and co-creation ;3
                    </div>

                   

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <motion.button
                        layoutId="continueButton"
                        transition={{ layout: { type: 'spring', stiffness: 400, damping: 35 } }}
                        onClick={() => setIntroSeen(true)}
                        style={{
                          padding: '8px 20px',
                          backgroundColor: tint.earth,
                          backdropFilter: blur.subtle,
                          fontSize: 13,
                          fontWeight: 500,
                          color: text.earth,
                          border: 'none',
                          borderRadius: 9999,
                          cursor: 'pointer',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.0125em',
                          width: 'fit-content',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        continue
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Step 1: Email Input Only */}
                {introSeen && !emailChecked && (
                  <form onSubmit={handleEmailSubmit} style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <label
                        htmlFor="email"
                        style={{
                          display: 'block',
                          marginBottom: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: text.tertiary,
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
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 14,
                          boxSizing: 'border-box',
                          backgroundColor: glass.light,
                          backdropFilter: blur.subtle,
                          color: text.primary,
                          outline: 'none',
                          transition: 'background-color 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = glass.strong
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = glass.light
                        }}
                      />
                    </div>

                    {error && (
                      <div style={{
                        color: text.primary,
                        backgroundColor: tint.coral,
                        backdropFilter: blur.subtle,
                        padding: '10px 12px',
                        borderRadius: 8,
                        marginBottom: 12,
                        fontSize: 12,
                        border: 'none',
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
                          backgroundColor: checking ? tint.earth : tint.earthStrong,
                          backdropFilter: blur.subtle,
                          fontSize: 13,
                          fontWeight: 500,
                          color: text.primary,
                          border: 'none',
                          borderRadius: 9999,
                          cursor: 'pointer',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.0125em',
                          width: 'fit-content',
                          opacity: checking ? 0.6 : 1,
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {checking ? "checking..." : "continue"}
                      </motion.button>
                    </div>
                  </form>
                )}

                {/* Step 2: Existing User - Sign In */}
                {introSeen && emailChecked && userExists && (
                  <form onSubmit={handleSignIn} style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <label
                        htmlFor="password-signin"
                        style={{
                          display: 'block',
                          marginBottom: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: text.tertiary,
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
                        placeholder="your password"
                        autoComplete="current-password"
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 14,
                          boxSizing: 'border-box',
                          backgroundColor: glass.light,
                          backdropFilter: blur.subtle,
                          color: text.primary,
                          outline: 'none',
                          transition: 'background-color 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = glass.strong
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = glass.light
                        }}
                      />
                    </div>

                    {error && (
                      <div style={{
                        color: text.primary,
                        backgroundColor: tint.coral,
                        backdropFilter: blur.subtle,
                        padding: '10px 12px',
                        borderRadius: 8,
                        marginBottom: 12,
                        fontSize: 12,
                        border: 'none',
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
                          backgroundColor: loading ? tint.sage : tint.sageStrong,
                          backdropFilter: blur.subtle,
                          color: text.primary,
                          border: 'none',
                          borderRadius: 9999,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1,
                          letterSpacing: '-0.01em',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? "signing in..." : "sign in"}
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
                        color: text.subtle,
                        fontSize: 11,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1,
                        textAlign: 'center',
                        marginTop: 8,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      different email?
                    </button>
                  </form>
                )}

                {/* Step 3: New User - Sign Up */}
                {introSeen && emailChecked && !userExists && (
                  <form onSubmit={handleSignUp} style={{ marginTop: 12 }}>
                    <div style={{ marginBottom: 12 }}>
                      <label
                        htmlFor="name"
                        style={{
                          display: 'block',
                          marginBottom: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: text.tertiary,
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
                        placeholder="your name"
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 14,
                          boxSizing: 'border-box',
                          backgroundColor: glass.light,
                          backdropFilter: blur.subtle,
                          color: text.primary,
                          outline: 'none',
                          transition: 'background-color 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = glass.strong
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = glass.light
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
                          color: text.tertiary,
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
                        placeholder="at least 8 characters please:)"
                        autoComplete="new-password"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 14,
                          boxSizing: 'border-box',
                          backgroundColor: glass.light,
                          backdropFilter: blur.subtle,
                          color: text.primary,
                          outline: 'none',
                          transition: 'background-color 0.2s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.backgroundColor = glass.strong
                        }}
                        onBlur={(e) => {
                          e.target.style.backgroundColor = glass.light
                        }}
                      />
                    </div>

                    {error && (
                      <div style={{
                        color: text.primary,
                        backgroundColor: tint.coral,
                        backdropFilter: blur.subtle,
                        padding: '10px 12px',
                        borderRadius: 8,
                        marginBottom: 12,
                        fontSize: 12,
                        border: 'none',
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
                          backgroundColor: loading ? tint.earth : tint.earthStrong,
                          backdropFilter: blur.subtle,
                          color: text.primary,
                          border: 'none',
                          borderRadius: 9999,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: loading ? 'not-allowed' : 'pointer',
                          opacity: loading ? 0.6 : 1,
                          letterSpacing: '-0.01em',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? "creating account..." : "sign up"}
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
                        color: text.subtle,
                        fontSize: 11,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.5 : 1,
                        textAlign: 'center',
                        marginTop: 8,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      different email?
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
