import React, { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAccount } from 'jazz-tools/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { PondAccount } from '../schema'
import { betterAuthClient } from '../lib/auth-client'
import { motion, useMotionValue } from 'motion/react'
import { pondFadeSignal } from '../hooks/usePondCrossfade'

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
    index: 0,
    promptIndex: 0,
    fadeClass: 'opacity-100'
  })

  const uiOpacity = useMotionValue(1)

  useEffect(() => {
    return pondFadeSignal.subscribe((fade) => {
      uiOpacity.set(1 - fade)
    })
  }, [uiOpacity])

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
        const nextIndex = (prev.index + 1) % 3
        const nextPromptIndex = nextIndex === 2 
          ? (prev.promptIndex + 1) % PROMPTS.length 
          : prev.promptIndex

        return {
          ...prev,
          index: nextIndex,
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
        style={{ color: 'rgba(110, 104, 92, 0.25)' }}
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
      className="fixed top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[80%] max-w-[384px]"
    >
      <motion.div 
        style={{ opacity: uiOpacity }}
        className="p-10"
      >
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
          {isAuthenticated && state.index === 0 && (
            <button
              onClick={async () => {
                await betterAuthClient.signOut();
                window.location.reload();
              }}
              className={`inline-flex items-center ml-3 px-2 rounded-full font-medium pointer-events-auto hover:bg-gray-600 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${state.fadeClass}`}
              style={{
                backgroundColor: 'rgba(110, 104, 92, 0.1)',
                color: 'rgba(110, 104, 92, 0.25)',
                fontFamily: 'AlteHaasGroteskBold, sans-serif',
                fontSize: '0.65rem',
                lineHeight: '1.125',
                verticalAlign: 'middle',
                padding: '0.2rem 0.4rem',
                letterSpacing: '0.0295rem',
                marginTop: '-0.25rem'
              }}
            >
              logout
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
} 