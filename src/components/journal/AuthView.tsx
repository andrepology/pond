import React from 'react'
import { motion, AnimatePresence, useMotionTemplate, useTransform, useMotionValue, useSpring } from 'motion/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { useAuthFlow } from '../../hooks/useAuthFlow'
import { betterAuthClient } from '../../lib/auth-client'
import { glass, text, tint, blur } from './theme'

// Font loading pattern
const loadFont = () => {
  return new Promise<void>((resolve) => {
    const font = new FontFace('AlteHaasGroteskBold', 'url(/fonts/AlteHaasGroteskBold.ttf)')
    font.load().then(() => {
      document.fonts.add(font)
      resolve()
    })
  })
}

const layoutTransition = {
  type: 'spring',
  stiffness: 160,
  damping: 24,
  mass: 1
} as const

interface PrimaryButtonProps extends React.ComponentProps<typeof motion.button> {
  isLoading?: boolean
  loadingText?: string
}

function PrimaryButton({
  children,
  isLoading,
  loadingText,
  style,
  ...props
}: PrimaryButtonProps) {
  const colors = { text: text.earth, tint: tint.earthStrong, load: tint.earth }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.04 }}

      disabled={isLoading}
      style={{
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 500,
        color: colors.text,
        backgroundColor: isLoading ? colors.load : colors.tint,
        border: '3px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 9999,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        letterSpacing: '0.0125em',
        width: 'fit-content',
        opacity: isLoading ? 0.6 : 1,
        ...style
      }}
      {...props}
    >
      {isLoading && loadingText ? loadingText : children}
    </motion.button>
  )
}

interface AuthViewProps {
}

export function AuthView({ }: AuthViewProps) {
  const [isAuthMinimized, setIsAuthMinimized] = React.useState(true)
  const [introSeen, setIntroSeen] = React.useState(false)
  const [fontLoaded, setFontLoaded] = React.useState(false)
  const privacyBullets = [
    "pond is local-first: your data stays on your device, encrypted. we can't see it even if we tried.",
    <>when AI providers are used, it is under a <a href="https://openrouter.ai/docs/guides/features/zdr" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Zero Data Retention policy</a></>,
    'you can use, export and delete this data at any time'
  ]

  // Load font on mount
  React.useEffect(() => {
    loadFont().then(() => setFontLoaded(true))
  }, [])

  // Expansion state as motion value for springy transitions
  const expansion = useMotionValue(isAuthMinimized ? 0 : 1)
  React.useEffect(() => {
    expansion.set(isAuthMinimized ? 0 : 1)
  }, [isAuthMinimized, expansion])

  const springExpansion = useSpring(expansion, {
    stiffness: 160,
    damping: 24,
    mass: 1
  })

  // Fade background in only when open
  const bgAlpha = useTransform(springExpansion, [0, 1], [0, 0.85])
  const background = useMotionTemplate`rgba(240, 237, 234, ${bgAlpha})`

  // No blur when minimized, active blur when expanded
  const blurValue = useTransform(springExpansion, [0, 1], [0, 24])
  const saturateValue = useTransform(springExpansion, [0, 1], [100, 70])
  const backdropFilter = useMotionTemplate`blur(${blurValue}px) saturate(${saturateValue}%)`

  const {
    me,
    isAuthenticated,
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
      <motion.div
        layout
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.2 } }}
        transition={{
          layout: layoutTransition,
          opacity: { duration: 0.4 },
          scale: { type: 'spring', stiffness: 400, damping: 60 }
        }}
        style={{
          position: 'relative',
          marginTop: 24,
          width: 'min(400px, 90vw)',
          backgroundColor: isAuthenticated ? 'transparent' : background,
          backdropFilter: isAuthenticated ? 'none' : backdropFilter,
          WebkitBackdropFilter: isAuthenticated ? 'none' : backdropFilter,
          zIndex: 2000,
          borderRadius: 12,
          border: 'none',
          pointerEvents: 'auto',
        }}
      >
        {/* Inner wrapper that fades content without breaking parent backdrop-filter */}
        <motion.div
          layout
          transition={layoutTransition}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            height: 56,
            boxSizing: 'border-box'
          }}
        >
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: fontLoaded ? 1 : 0 }}
            transition={{
              layout: layoutTransition,
              opacity: { duration: 0.3 }
            }}
            style={{
              fontSize: 20,
              color: text.stoneSubtle,
              fontFamily: 'AlteHaasGroteskBold, sans-serif',
              lineHeight: '1.2',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.005em',
              width: 'fit-content',
              pointerEvents: 'none',
              marginTop: -2
            }}
          >
            {isAuthenticated
              ? `${me?.profile?.name?.toLowerCase() || 'user'}'s pond`
              : 'hey, human bean'}
          </motion.div>

          <div style={{ display: 'grid', placeItems: 'center end' }}>
            <AnimatePresence mode="popLayout">
              {isAuthenticated ? (
                <motion.div
                  key="logout-btn"
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{
                    layout: layoutTransition,
                    opacity: { duration: 0.2 }
                  }}
                  style={{ gridArea: '1 / 1' }}
                >
                  <PrimaryButton
                    layoutId="continueButton"
                    onClick={async () => {
                      await betterAuthClient.signOut();
                      window.location.reload();
                    }}
                  >
                    log out
                  </PrimaryButton>
                </motion.div>
              ) : isAuthMinimized ? (
                <motion.div
                  key="continue-btn"
                  layout
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{
                    layout: layoutTransition,
                    opacity: { duration: 0.2 }
                  }}
                  style={{ gridArea: '1 / 1' }}
                >
                  <PrimaryButton
                    layoutId="continueButton"
                    onClick={() => setIsAuthMinimized(false)}
                  >
                    continue
                  </PrimaryButton>
                </motion.div>
              ) : (
                <motion.button
                  key="minimize-btn"
                  layout
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.04 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    layout: layoutTransition,
                    duration: 0.2
                  }}
                  onClick={() => {
                    setIsAuthMinimized(true)
                    setIntroSeen(false)
                  }}
                  style={{
                    gridArea: '1 / 1',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: glass.strong,
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
                    <line x1="4" y1="4" x2="12" y2="12" stroke={text.stoneTertiary} strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="12" y1="4" x2="4" y2="12" stroke={text.stoneTertiary} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence>
          {!isAuthenticated && !isAuthMinimized && (
              <motion.div
                key="auth-content-expanded"
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
                transition={{
                  layout: layoutTransition,
                  opacity: { duration: 0.4 },
                  y: layoutTransition
                }}
                style={{
                  position: 'relative',
                  padding: '0px 20px 20px 20px',
                  overflow: 'hidden' // Clip content only while expanded
                }}
              >
                <AnimatePresence mode="popLayout">
                  {/* Step 0: Introduction */}
                  {!introSeen && (
                    <motion.div
                      key="intro"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{ marginTop: 0 }}
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 1.5 }}
                        style={{ width: '100%', paddingRight: '56px' }}
                      >
                        <div style={{
                          fontSize: 14,
                          color: text.stone,
                          lineHeight: 1.5,
                          marginBottom: 16,
                          fontWeight: 400,
                        }}>
                          we created pond as an anchor for presence and calm amidst our busy digital lives.
                        </div>
                        <div style={{
                          fontSize: 14,
                          color: text.stone,
                          lineHeight: 1.4,
                          marginBottom: 16,
                        }}>
                          while we are still stitching the parts together, it is already functional and beautiful; as such, you are welcome here and it will be an honor to have your presence 💛
                        </div>

                        <div style={{
                          fontSize: 14,
                          color: text.stone,
                          lineHeight: 1.4,
                          marginBottom: 16,
                        }}>
                          may it serve you, dear fellow human bean. 
                        </div>

                        <div style={{
                          fontSize: 14,
                          color: text.stone,
                          lineHeight: 1.4,
                          marginBottom: 16,
                        }}>
                          huggingly,<br /><a href="https://svitlana.me" target="_blank" rel="noopener noreferrer" style={{ color: text.stone, textDecoration: 'underline' }}>svitlana</a> and <a href="https://andrepology.substack.com/p/why-i-draw" target="_blank" rel="noopener noreferrer" style={{ color: text.stone, textDecoration: 'underline' }}>andre</a> <br /> 🌻
                        </div>

                        <div style={{
                          fontSize: 10,
                          color: text.stone,
                          lineHeight: 1.4,
                          marginBottom: 16,
                        }}>
                          p.s.: join our <a href="https://t.me/pondspace" target="_blank" rel="noopener noreferrer" style={{ color: text.stone, textDecoration: 'underline' }}>telegram channel</a> for updates and co-creation ;3
                        </div>


                        <img
                          src="/svitlana-and-andre.jpg"
                          alt="Svitlana and Andre"
                          className="transform-3d perspective-1000  translate-y-2 rotate-x-4 -rotate-z-4"
                          style={{
                            width: '33%',
                            borderRadius: 4,
                            marginBottom: 24,
                            boxShadow: '12px 36px 36px rgba(0,0,0,0.25)',
                            display: 'block',
                            marginLeft: '24px',
                            transition: 'transform 0.4s ease'
                          }}
                        />

                        <div
                          style={{
                            fontSize: 10,
                            color: text.stone,
                            lineHeight: 1.4,
                            marginBottom: 24,
                            marginRight: '56px',
                            paddingTop: '16px',
                            opacity: 0.8,
                            textAlign: 'left'
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '12px 1fr',
                              columnGap: 6,
                              rowGap: 6
                            }}
                          >
                            {privacyBullets.map((item, index) => (
                              <React.Fragment key={index}>
                                <span aria-hidden="true">•</span>
                                <span>{item}</span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>


                      </motion.div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <PrimaryButton
                          layoutId="continueButton"
                          animate={{ opacity: 1 }}
                          transition={{
                            layout: { type: 'spring', stiffness: 100, damping: 15 },
                            opacity: { duration: 0.4 }
                          }}
                          onClick={() => setIntroSeen(true)}
                        >
                          continue
                        </PrimaryButton>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 1: Email Input Only */}
                  {introSeen && !emailChecked && (
                    <motion.form
                      key="email-step"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      onSubmit={handleEmailSubmit}
                      style={{ marginTop: 12 }}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <label
                          htmlFor="email"
                          style={{
                            display: 'block',
                            marginBottom: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: text.stoneTertiary,
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
                            color: text.stone,
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
                          color: text.stone,
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
                        <PrimaryButton
                          layoutId="continueButton"
                          animate={{ opacity: 1 }}
                          transition={{
                            layout: { type: 'spring', stiffness: 300, damping: 35 },
                            opacity: { duration: 0.25 }
                          }}
                          type="submit"
                          isLoading={checking}
                          loadingText="checking..."
                        >
                          continue
                        </PrimaryButton>
                      </div>
                    </motion.form>
                  )}

                  {/* Step 2: Existing User - Sign In */}
                  {introSeen && emailChecked && userExists && (
                    <motion.form
                      key="signin-step"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      onSubmit={handleSignIn}
                      style={{ marginTop: 12 }}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <label
                          htmlFor="password-signin"
                          style={{
                            display: 'block',
                            marginBottom: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: text.stoneTertiary,
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
                            color: text.stone,
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
                          color: text.stone,
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
                        <PrimaryButton
                          layoutId="continueButton"
                          animate={{ opacity: 1 }}
                          transition={{
                            layout: { type: 'spring', stiffness: 300, damping: 35 },
                            opacity: { duration: 0.25 }
                          }}
                          type="submit"
                          isLoading={loading}
                          loadingText="signing in..."
                        >
                          sign in
                        </PrimaryButton>
                      </div>

                      <button
                        onClick={resetToEmail}
                        disabled={loading}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'none',
                          border: 'none',
                          color: text.stoneSubtle,
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
                    </motion.form>
                  )}

                  {/* Step 3: New User - Sign Up */}
                  {introSeen && emailChecked && !userExists && (
                    <motion.form
                      key="signup-step"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      onSubmit={handleSignUp}
                      style={{ marginTop: 12 }}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <label
                          htmlFor="name"
                          style={{
                            display: 'block',
                            marginBottom: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: text.stoneTertiary,
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
                            color: text.stone,
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
                            color: text.stoneTertiary,
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
                            color: text.stone,
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
                          color: text.stone,
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
                        <PrimaryButton
                          layoutId="continueButton"
                          animate={{ opacity: 1 }}
                          transition={{
                            layout: { type: 'spring', stiffness: 300, damping: 35 },
                            opacity: { duration: 0.25 }
                          }}
                          type="submit"
                          isLoading={loading}
                          loadingText="creating account..."
                        >
                          sign up
                        </PrimaryButton>
                      </div>

                      <button
                        onClick={resetToEmail}
                        disabled={loading}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'none',
                          border: 'none',
                          color: text.stoneSubtle,
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
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
    </AnimatePresence>
  )
}
