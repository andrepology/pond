import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { Conversation } from '../../schema'
import { CallButton } from '../../VoiceChat'
import { useVoice } from '../../VoiceChat/VoiceProvider'
import { formatDate } from './utils'

const DYNAMIC_PROMPTS = [
  'setting an intention',
  'getting unstuck on a task',
  'today\'s reflection',
  'a part that needs listening',
  'grounding yourself',
  'what you\'re ready to release'
]

// Helper to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const PromptSection = ({ color }: { color: string }) => {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false)
  const [promptState, setPromptState] = useState({
    index: 0,
    fadeClass: 'opacity-100'
  })
  const { status } = useVoice()

  const textColor = hexToRgba(color, 0.6)
  const isCallInProgress = status === 'connected' || status === 'speaking' || status === 'listening' || status === 'connecting' || status === 'disconnecting'

  // Cycle through dynamic prompts
  useEffect(() => {
    if (isCallInProgress) return // Don't cycle prompts during calls

    const PROMPT_PERIOD_MS = 4000
    const PROMPT_FADE_MS = 800

    let promptFadeTimeout: number | undefined

    const runPromptPhase = () => {
      setPromptState(prev => ({
        ...prev,
        index: (prev.index + 1) % DYNAMIC_PROMPTS.length,
        fadeClass: 'opacity-100'
      }))

      if (promptFadeTimeout) clearTimeout(promptFadeTimeout)
      promptFadeTimeout = window.setTimeout(() => {
        setPromptState(prev => ({ ...prev, fadeClass: 'opacity-0' }))
      }, Math.max(0, PROMPT_PERIOD_MS - PROMPT_FADE_MS))
    }

    // Kick off immediately to avoid initial delay
    runPromptPhase()

    const promptInterval = window.setInterval(runPromptPhase, PROMPT_PERIOD_MS)

    return () => {
      clearInterval(promptInterval)
      if (promptFadeTimeout) clearTimeout(promptFadeTimeout)
    }
  }, [isCallInProgress])

  return (
    <div style={{ padding: '32px 4px 64px 12px' }}>
      {/* Prompt text and call button side by side */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          paddingTop: 0,
          paddingLeft: 16
        }}
      >
        {/* Left column: Prompt text and help section */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          {/* Prompt text */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              textAlign: 'left',
              pointerEvents: 'none',
              lineHeight: '1.2',
              marginBottom: -0,
              opacity: isCallInProgress ? 0 : 1,
              transition: 'opacity 0.3s ease-out'
            }}
          >
            <span style={{ color: textColor }}>
              talk to innio about
            </span>
            <span style={{ color: textColor }}>
              {' '}
            </span>
            <span
              className={`transition-opacity duration-1000 ${promptState.fadeClass}`}
              style={{ color: textColor }}
            >
              {DYNAMIC_PROMPTS[promptState.index]}
            </span>
          </div>

          {/* Help Section */}
          <div
            style={{
              opacity: isCallInProgress ? 0 : 1,
              transition: 'opacity 0.3s ease-out',
              pointerEvents: isCallInProgress ? 'none' : 'auto'
            }}
          >
            <div
              onClick={() => setIsHelpExpanded(!isHelpExpanded)}
              style={{
                cursor: 'pointer',
                width: '100%',
                position: 'relative',
                zIndex: 1
              }}
            >
              <motion.div
                style={{
                  width: '100%',
                  padding: '8px 0',
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  minHeight: '40px',
                  boxSizing: 'border-box',
                  gap: '8px'
                }}
              >
                <motion.span
                  animate={{ opacity: isHelpExpanded ? 0.8 : 0.6 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 12,
                    fontWeight: 550,
                    color: '#888'
                  }}
                >
                  what to talk about
                </motion.span>
                <motion.svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  animate={{ opacity: isHelpExpanded ? 0.8 : 0.6 }}
                  transition={{ duration: 0.2 }}
                  style={{ flexShrink: 0, color: '#888' }}
                >
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.0" fill="none" />
                  <text x="6" y="8.5" textAnchor="middle" fontSize="7" fill="currentColor" fontFamily="system-ui, sans-serif">?</text>
                </motion.svg>
              </motion.div>

              <AnimatePresence>
                {isHelpExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ overflow: 'hidden', width: '100%' }}
                  >
                    <div
                      style={{
                        padding: '12px 0',
                        fontSize: 10,
                        color: '#666',
                        lineHeight: 1.6,
                        width: '100%'
                      }}
                    >
                      <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc' }}>
                        <li style={{ marginBottom: 6 }}>Setting intentions (they'll hold you accountable)</li>
                        <li style={{ marginBottom: 6 }}>Getting unstuck on tasks</li>
                        <li style={{ marginBottom: 6 }}>Daily reflection & integration</li>
                        <li style={{ marginBottom: 6 }}>Inner parts that need listening (IFS)</li>
                        <li style={{ marginBottom: 6 }}>Nervous system regulation</li>
                        <li>What you're avoiding or ready to let go</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Call button */}
        <div style={{
          flexShrink: 0,
          paddingRight: 32,
          position: 'relative',
          zIndex: 50,
          pointerEvents: 'auto'
        }}>
          <CallButton color={color} />
        </div>
      </div>
    </div>
  )
}

export const CallView = ({ conversations, color }: { conversations: Conversation[]; color: string }) => {
  // Get orphaned conversations (not linked to any intention)
  const orphanedConversations = conversations.filter(conv => !conv.intentionRef)

  if (orphanedConversations.length === 0) {
    return (
      <div style={{ position: 'relative' }}>
        <PromptSection color={color} />
        <div style={{ color: '#8B7355', fontSize: 12, opacity: 0.5, textAlign: 'center', marginTop: 12, padding: '0 16px' }}>
          No conversations yet
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <PromptSection color={color} />

      <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 12 }}>
        Recent Conversations
      </div>

      {orphanedConversations
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, 10)
        .map((conv, idx) => {
          const duration = Math.round((conv.endTime - conv.startTime) / 1000 / 60)
          return (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                border: '1px solid rgba(139, 115, 85, 0.08)',
                marginBottom: idx < orphanedConversations.slice(0, 10).length - 1 ? '8px' : '0',
              }}
            >
              {conv.summary && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, flex: 1 }}>
                    {conv.summary.slice(0, 100)}
                    {conv.summary.length > 100 ? '...' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginLeft: 12 }}>
                    {formatDate(conv.startTime)}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#999' }}>
                Duration: {duration}min
              </div>
            </div>
          )
        })}

      {orphanedConversations.length > 10 && (
        <div style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
          +{orphanedConversations.length - 10} more conversations
        </div>
      )}
    </div>
  )
}

