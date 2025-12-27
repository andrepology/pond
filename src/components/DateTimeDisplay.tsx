import React, { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'jazz-tools/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { PondAccount } from '../schema'
import { motion, AnimatePresence } from 'motion/react'
import { betterAuthClient } from '../lib/auth-client'

import { text as journalText } from './journal/theme'

const layoutTransition = {
  type: 'spring',
  stiffness: 160,
  damping: 24,
  mass: 1
} as const

interface DateTimeState {
  index: number // 0=Name, 1=Logo, 2=Prompt
  promptIndex: number
}

const FISH_NAMES = ['koi', 'carp', 'salmon', 'catfish', 'tilapia', 'goldfish']

const PROMPTS = [
  'what are you grateful for?',
  'how is your world today?',
  'what are you observing today?',
  'what are you avoiding right now?',
  'what can you let go of?',
  'what is your inner story about yourself?',
]

export function DateTimeDisplay() {
  const { me } = useAccount(PondAccount, { resolve: { profile: true } })
  const isAuthenticated = useIsAuthenticated()
  const [anonymousFish, setAnonymousFish] = useState('')
  const [cycleVersion, setCycleVersion] = useState(0)
  const [state, setState] = useState<DateTimeState>(() => ({
    index: 1, // Start with Logo
    promptIndex: 0
  }))

  useEffect(() => {
    setAnonymousFish(FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)])
  }, [])

  const advanceCycle = useCallback(() => {
    setState(prev => {
      const nextPromptIndex = (prev.promptIndex + 1) % PROMPTS.length
      
      // Cycle: Logo (1) -> [Name (0) or Prompt (2)] -> Logo (1) -> ...
      let nextIndex: number
      if (prev.index === 1) {
        nextIndex = isAuthenticated ? 0 : 2
      } else {
        nextIndex = 1
      }

      return {
        index: nextIndex,
        promptIndex: nextPromptIndex
      }
    })
  }, [isAuthenticated])

  useEffect(() => {
    const interval = setInterval(advanceCycle, 8000)
    return () => clearInterval(interval)
  }, [advanceCycle, cycleVersion])

  const handleTap = () => {
    advanceCycle()
    setCycleVersion(v => v + 1) // Reset the interval timer
  }

  const getDisplayText = () => {
    if (state.index === 0) {
      return isAuthenticated && me 
        ? (me.profile?.name?.toLowerCase() || 'user')
        : `unnamed ${anonymousFish}`
    }
    if (state.index === 2) return PROMPTS[state.promptIndex]
    return ''
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-[600px]">
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={handleTap}
        className="px-16 py-10 min-h-[140px] flex items-center justify-center pointer-events-auto cursor-pointer"
      >
        <AnimatePresence mode="wait">
          {state.index === 1 ? (
            <motion.div
              key="logo"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center justify-center"
              style={{
                fontSize: 28,
                color: journalText.stoneSubtle,
                fontFamily: 'sans-serif',
                fontWeight: 600,
                letterSpacing: '-0.02em'
              }}
            >
              <span>p</span>
              <svg 
                width="16" height="16" viewBox="0 0 24 24" fill="none" 
                style={{ 
                  display: 'inline-block', 
                  alignSelf: 'center',
                  transform: 'translateY(0.08em)',
                  marginLeft: '0.03em',
                  marginRight: '0.03em'
                }}
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="5" />
                <circle cx="12" cy="12" r="3.5" fill="currentColor" />
              </svg>
              <span>nd</span>
            </motion.div>
          ) : (
            <motion.div
              key={state.index === 0 ? 'name' : 'prompt'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col items-center justify-center"
            >
              <div 
                className="text-3xl tracking-tight text-center"
                style={{
                  fontFamily: 'AlteHaasGroteskBold, sans-serif',
                  lineHeight: '1.2',
                  color: journalText.stoneSubtle,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}
              >
                {getDisplayText()}
                {isAuthenticated && state.index === 0 && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // Don't trigger the cycle when clicking logout
                      await betterAuthClient.signOut();
                      window.location.reload();
                    }}
                    className="inline-flex items-center ml-3 px-2 rounded-full font-medium pointer-events-auto hover:bg-gray-600 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(110, 104, 92, 0.05)',
                      color: 'rgba(110, 104, 92, 0.25)',
                      fontFamily: 'AlteHaasGroteskBold, sans-serif',
                      fontSize: '0.65rem',
                      lineHeight: '1.125',
                      verticalAlign: 'middle',
                      padding: '0.2rem 0.4rem',
                      letterSpacing: '0.0295rem',
                      marginTop: '-0.15rem'
                    }}
                  >
                    logout
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
