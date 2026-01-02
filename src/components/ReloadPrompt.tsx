import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { glass, text, tint } from './journal/theme'

const layoutTransition = {
  type: 'spring',
  stiffness: 160,
  damping: 24,
  mass: 1
} as const

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={layoutTransition}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 10000,
            width: 'min(320px, 90vw)',
            backgroundColor: 'rgba(240, 237, 234, 0.85)',
            backdropFilter: 'blur(16px) saturate(80%)',
            WebkitBackdropFilter: 'blur(16px) saturate(80%)',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{
            fontSize: 14,
            fontFamily: 'AlteHaasGroteskBold, sans-serif',
            color: text.stone,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
          }}>
            {offlineReady ? (
              "pond is ready to work offline"
            ) : (
              "a new version of pond is available"
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {needRefresh && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => updateServiceWorker(true)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: text.earth,
                  backgroundColor: tint.earthStrong,
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 9999,
                  cursor: 'pointer',
                  letterSpacing: '0.0125em',
                }}
              >
                update
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.04 }}
              onClick={close}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 500,
                color: text.stoneSecondary,
                backgroundColor: glass.strong,
                border: 'none',
                borderRadius: 9999,
                cursor: 'pointer',
              }}
            >
              close
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

