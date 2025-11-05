import React, { useState, useEffect } from 'react'
import { useLocation, useRoute } from 'wouter'
import { useAccount } from 'jazz-tools/react'
import { useIsAuthenticated } from 'jazz-tools/react-core'
import { PondAccount } from '../schema'
import { betterAuthClient } from '../lib/auth-client'

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
  promptIndex: number
  promptFadeClass: string
  displayOpacity: string
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
  'sardine',
  'salmon',
  'trout',
  'bass',
  'carp',
  'pike',
  'perch',
  'roach',
  'bream',
  'tench'
]

const PROMPTS = [
  'be and it is',
  'what am i grateful for?',
  'how is our world today?',
  'what are you observing today?',
  'what are you avoiding right now?',
  'what can i let go of?',
  'what is your inner story about yourself?',
  'what habits do i want to grow?',
  'what beliefs about self do i want to let go of?',
  'what game am i playing right now?',
]

export function DateTimeDisplay() {
  const [location] = useLocation()
  const [routeMatch] = useRoute('/item/:id')
  const [fontLoaded, setFontLoaded] = useState(false)
  const { me } = useAccount(PondAccount, { resolve: { profile: true } })
  const isAuthenticated = useIsAuthenticated()
  const [anonymousFish, setAnonymousFish] = useState<string>('')
  const [state, setState] = useState<DateTimeState>({
    promptIndex: 0,
    promptFadeClass: 'opacity-100',
    displayOpacity: 'opacity-100'
  })

  const isFocused = !!routeMatch

  // Load font and set random fish name on mount
  useEffect(() => {
    loadFont().then(() => setFontLoaded(true))
    setAnonymousFish(FISH_NAMES[Math.floor(Math.random() * FISH_NAMES.length)])
  }, [])

  // Handle display opacity when focusing/unfocusing
  useEffect(() => {
    setState(prev => ({
      ...prev,
      displayOpacity: isFocused ? 'opacity-0' : 'opacity-100'
    }))
  }, [isFocused])

  // Update time and cycle logic
  useEffect(() => {
    if (isFocused) return

    const PROMPT_PERIOD_MS = 5000
    const PROMPT_FADE_MS = 1000

    let promptFadeTimeout: number | undefined

    const runPromptPhase = () => {
      setState(prev => ({
        ...prev,
        promptIndex: (prev.promptIndex + 1) % PROMPTS.length,
        promptFadeClass: 'opacity-100'
      }))

      if (promptFadeTimeout) clearTimeout(promptFadeTimeout)
      promptFadeTimeout = window.setTimeout(() => {
        setState(prev => ({ ...prev, promptFadeClass: 'opacity-0' }))
      }, Math.max(0, PROMPT_PERIOD_MS - PROMPT_FADE_MS))
    }

    // Kick off immediately to avoid initial delay
    runPromptPhase()

    const promptInterval = window.setInterval(runPromptPhase, PROMPT_PERIOD_MS)

    return () => {
      clearInterval(promptInterval)
      if (promptFadeTimeout) clearTimeout(promptFadeTimeout)
    }
  }, [isFocused])


  // Don't render if font not loaded
  if (!fontLoaded) {
    return null
  }

  const getCurrentText = () => {
    const baseText = isAuthenticated && me ? `${me.profile?.name?.toLowerCase() || 'user'}'s pond` : `anonymous ${anonymousFish}'s pond`
    return baseText
  }

  const renderTextWithHoverIcons = () => {
    const text = getCurrentText()
    const icons = ['☼', '☽', '⚘']

    return (
      <>
        <span
          className="transition-colors duration-200 cursor-default text-[rgba(206,205,195,0.80)] hover:text-gray-600"
        >
          {text}
        </span>
      </>
    )
  }

  return (
    <div className={`fixed top-0 left-0 z-50 pointer-events-none p-10 transition-opacity duration-1000 ${state.displayOpacity}`}>
      <div
        className="text-4xl md:text-3xl tracking-tight"
        style={{
          fontFamily: 'AlteHaasGroteskBold, sans-serif',
          color: 'rgba(144, 144, 144, 0.40)',
          lineHeight: '1.025',
        }}
      >
        {renderTextWithHoverIcons()}
        {isAuthenticated && (
          <button
            onClick={async () => {
              await betterAuthClient.signOut();
              window.location.reload();
            }}
            className="inline-flex items-center ml-3 px-2 rounded-full font-medium pointer-events-auto transition-colors hover:bg-gray-600 transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: 'rgba(206, 205, 195, 0.80)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontFamily: 'AlteHaasGroteskBold, sans-serif',
              fontSize: '0.75rem',
              lineHeight: '1.125',
              verticalAlign: 'middle',
              padding: '0.25rem 0.5rem',
              letterSpacing: '0.0295rem',
              marginTop: '-0.45rem'
            }}
          >
            logout
          </button>
        )}
      </div>
      <div
        className={`mt-0 text-lg md:text-lg tracking-wide transition-opacity duration-1000 ${state.promptFadeClass} transition-colors duration-200 cursor-default text-[rgba(206,205,195,0.80)] hover:text-gray-600`}
        style={{
          fontFamily: 'AlteHaasGroteskBold, sans-serif',
          letterSpacing: '0.0295rem'
        }}
      >
        {PROMPTS[state.promptIndex]}
      </div>
    </div>
  )
} 