import React, { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAccount } from 'jazz-tools/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { PondAccount } from '../schema'
import { betterAuthClient } from '../lib/auth-client'
import { motion, useMotionValue } from 'motion/react'
import { pondFadeSignal } from '../hooks/usePondCrossfade'

import { text as journalText } from './journal/theme'

// Font loading - same pattern as focusable.tsx
const loadFont = () => {
  return new Promise<void>((resolve) => {
    const font = new FontFace('AlteHaasGroteskBold', 'url(/fonts/AlteHaasGroteskBold.ttf)')
    font.load().then(() => {
      document.fonts.add(font)
      resolve()
    })
  })
}

interface DateTimeState {
  index: number // Index for cycling through display types
  promptIndex: number // Index for which prompt to show
  fadeClass: string
}

function getOrdinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

const formatDate = (date: Date): string => {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ]
  
  const day = date.getDate()
  const dayName = days[date.getDay()]
  const month = months[date.getMonth()]
  
  return `${dayName}, ${month} ${day}${getOrdinalSuffix(day)}`
}

const FISH_NAMES = [
  'koi',
  'carp',
  'salmon',
  'catfish',
  'tilapia',
  'goldfish'
]

const PROMPTS = [
  'what are you grateful for?',
  'how is your world today?',
  'what are you observing today?',
  'what are you avoiding right now?',
  'what can you let go of?',
  'what is your inner story about yourself?',
]

export function DateTimeDisplay() {
  const [location] = useLocation()
  const [fontLoaded, setFontLoaded] = useState(false)
  const { me } = useAccount(PondAccount, { resolve: { profile: true } })
  const isAuthenticated = useIsAuthenticated()
  const [anonymousFish, setAnonymousFish] = useState<string>('')
  const [state, setState] = useState<DateTimeState>({
    index: 2, // Start with prompts
    promptIndex: 0,
    fadeClass: 'opacity-100'
  })

  // Load font and set random fish name on mount
  useEffect(() => {
    loadFont().then(() => setFontLoaded(true))
    setAnonymousFish(FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)])
  }, [])

  // Update time and cycle logic
  useEffect(() => {
    const PERIOD_MS = 4000
    const FADE_MS = 1000

    let fadeTimeout: number | undefined

    const runCycle = () => {
      setState(prev => {
        const nextPromptIndex = (prev.promptIndex + 1) % PROMPTS.length

        return {
          ...prev,
          index: 2, // Always use prompt index
          promptIndex: nextPromptIndex,
          fadeClass: 'opacity-100'
        }
      })

      if (fadeTimeout) clearTimeout(fadeTimeout)
      fadeTimeout = window.setTimeout(() => {
        setState(prev => ({ ...prev, fadeClass: 'opacity-0' }))
      }, PERIOD_MS - FADE_MS)
    }

    // Initial delay for first fade out
    fadeTimeout = window.setTimeout(() => {
      setState(prev => ({ ...prev, fadeClass: 'opacity-0' }))
    }, PERIOD_MS - FADE_MS)

    const interval = window.setInterval(runCycle, PERIOD_MS)

    return () => {
      clearInterval(interval)
      if (fadeTimeout) clearTimeout(fadeTimeout)
    }
  }, [])


  // Don't render if font not loaded
  if (!fontLoaded) {
    return null
  }

  const getDisplayText = () => {
    switch (state.index) {
      case 0: // Name
        return isAuthenticated && me 
          ? `${me.profile?.name?.toLowerCase() || 'user'}'s pond` 
          : `unnamed ${anonymousFish}'s pond`
      case 1: // Date
        return formatDate(new Date())
      case 2: // Prompt
        return PROMPTS[state.promptIndex]
      default:
        return ''
    }
  }

  const renderContent = () => {
    const text = getDisplayText()

    return (
      <span
        className={`transition-opacity duration-1000 ${state.fadeClass} cursor-default`}
        style={{ color: journalText.stoneSubtle }}
      >
        {text}
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[80%] max-w-[384px]"
    >
      <div className="p-10">
        <div
          className="text-3xl md:text-3xl tracking-tight text-center"
          style={{
            fontFamily: 'AlteHaasGroteskBold, sans-serif',
            lineHeight: '1.2',
            whiteSpace: 'normal', // Allow wrapping since we have a max-width now
            wordBreak: 'break-word'
          }}
        >
          {renderContent()}
        </div>
      </div>
    </motion.div>
  )
} 