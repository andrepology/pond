import { motion, useMotionTemplate, useSpring, useTransform, useVelocity, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'jazz-tools/react'
import { PondAccount, Intention, Conversation, FieldNote } from '../schema'
import { CallButton } from '../VoiceChat'
import { useVoice } from '../VoiceChat/VoiceProvider'

type Tab = {
  id: string
  label: string
  color: string
  isCallButton: boolean
}

const tabs: Tab[] = [
  { id: 'call', label: '◎', color: '#7B9089', isCallButton: true },
  { id: 'intentions', label: '⚘', color: '#8B7355', isCallButton: false },
  { id: 'fieldNotes', label: '✎', color: '#8B7B7A', isCallButton: false },
]

type TabId = Tab['id']

export function JournalBrowser() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null)
  const [isDocked, setIsDocked] = useState(true)
  const isMounted = useMounted()
  const viewsContainerRef = useRef<HTMLDivElement>(null)
  const [viewsContainerWidth, setViewsContainerWidth] = useState(0)

  const { me } = useAccount(PondAccount, {
    resolve: {
      root: {
        intentions: { $each: true },
        conversations: { $each: true },
        fieldNotes: { $each: true }
      }
    }
  })
  const root = me?.root

  useEffect(() => {
    const updateWidth = () => {
      if (viewsContainerRef.current) {
        const width = viewsContainerRef.current.getBoundingClientRect().width
        setViewsContainerWidth(width)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [viewsContainerWidth])

  const handleTabChange = (tabId: TabId) => {
    if (activeTab === tabId && !isDocked) {
      // Clicking active tab while expanded -> dock
      setIsDocked(true)
      setActiveTab(null)
    } else {
      // Switching tabs or expanding from docked
      setActiveTab(tabId)
      setIsDocked(false)
    }
  }

  return (
    <div
      data-ui
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        animate={{
          width: isDocked ? 320 : 400,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 60 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Views Container */}
        <motion.div
          ref={viewsContainerRef}
          animate={{
            height: isDocked ? 0 : 280,
            opacity: isDocked ? 0 : 1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 60 }}
          style={{
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
            backgroundColor: 'rgba(243, 240, 235, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            border: '1px solid rgba(139, 115, 85, 0.2)',
            pointerEvents: 'auto',
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {isMounted && !isDocked &&
            tabs.map((tab, idx) => (
              <View
                key={tab.id}
                containerWidth={viewsContainerWidth}
                viewIndex={idx}
                activeIndex={activeTab ? tabs.findIndex((t) => t.id === activeTab) : -1}
              >
                <TabContent tabId={tab.id} root={root} />
              </View>
            ))}
        </motion.div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} isDocked={isDocked} />
      </motion.div>
    </div>
  )
}

const View = ({
  children,
  containerWidth,
  viewIndex,
  activeIndex,
}: {
  children: React.ReactNode
  containerWidth: number
  viewIndex: number
  activeIndex: number
}) => {
  const [difference, setDifference] = useState(activeIndex - viewIndex)
  const x = useSpring(calculateViewX(difference, containerWidth), {
    stiffness: 400,
    damping: 60,
  })
  const xVelocity = useVelocity(x)

  const opacity = useTransform(
    x,
    [-containerWidth * 0.6, 0, containerWidth * 0.6],
    [0, 1, 0]
  )

  const blur = useTransform(xVelocity, [-1000, 0, 1000], [4, 0, 4], {
    clamp: false,
  })

  useEffect(() => {
    const newDifference = activeIndex - viewIndex
    setDifference(newDifference)
    const newX = calculateViewX(newDifference, containerWidth)
    x.set(newX)
  }, [activeIndex, containerWidth, viewIndex, x])

  const isActive = difference === 0

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        padding: 8,
        transformOrigin: 'center',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform, filter',
        isolation: 'isolate',
        x,
        opacity,
        filter: useMotionTemplate`blur(${blur}px)`,
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <div
        className="scroller"
        style={{
          width: '100%',
          height: '100%',
          padding: '6px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </motion.div>
  )
}

const Tabs = ({
  tabs,
  activeTab,
  onTabChange,
  isDocked,
}: {
  tabs: Tab[]
  activeTab: TabId | null
  onTabChange: (tab: TabId) => void
  isDocked: boolean
}) => {
  return (
    <ul
      style={{
        border: '1px solid rgba(139, 115, 85, 0.2)',
        backgroundColor: 'rgba(243, 240, 235, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: 12,
        display: 'flex',
        padding: 0,
        width: '100%',
        margin: 0,
        listStyle: 'none',
      }}
    >
      {tabs.map((tab, idx) => (
        <motion.li
          key={tab.id}
          style={{
            display: 'flex',
            cursor: 'pointer',
            flexGrow: 1,
            padding:
              idx === 0
                ? '4px 0px 4px 4px'
                : idx === tabs.length - 1
                ? '4px 4px 4px 0px'
                : 4,
          }}
        >
          {tab.isCallButton ? (
            <motion.button
              style={{
                position: 'relative',
                width: '100%',
                padding: 6,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#fff' : '#4A90E2',
                transition: 'color 0.2s',
              }}
              whileFocus={{
                outline: '2px solid rgba(74, 144, 226, 0.4)',
              }}
              onClick={() => onTabChange(tab.id)}
            >
              <span style={{ zIndex: 1, position: 'relative' }}>{tab.label}</span>
              <AnimatePresence>
                {tab.id === activeTab && !isDocked ? (
                  <motion.span
                    layoutId="activeTab"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 600,
                      damping: 40,
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      backgroundColor: tab.color,
                    }}
                  />
                ) : null}
              </AnimatePresence>
            </motion.button>
          ) : (
            <motion.button
              style={{
                position: 'relative',
                width: '100%',
                padding: 6,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 22,
                fontWeight: 500,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: activeTab === tab.id ? '#fff' : '#8B7355',
                transition: 'color 0.2s',
              }}
              whileFocus={{
                outline: '2px solid rgba(139, 115, 85, 0.4)',
              }}
              onClick={() => onTabChange(tab.id)}
            >
              <span style={{ zIndex: 1, position: 'relative' }}>{tab.label}</span>
              <AnimatePresence>
                {tab.id === activeTab && !isDocked ? (
                  <motion.span
                    layoutId="activeTab"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 600,
                      damping: 40,
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      backgroundColor: tab.color,
                    }}
                  />
                ) : null}
              </AnimatePresence>
            </motion.button>
          )}
        </motion.li>
      ))}
    </ul>
  )
}

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

const CallView = ({ conversations, color }: { conversations: Conversation[]; color: string }) => {
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

const TabContent = ({ tabId, root }: { tabId: TabId; root?: any }) => {
  if (!root) {
    return <div style={{ color: '#8B7355', fontSize: 14 }}>Loading...</div>
  }

  const tab = tabs.find(t => t.id === tabId)
  const tabColor = tab?.color || '#7B9089'

  switch (tabId) {
    case 'call':
      return <CallView conversations={root.conversations || []} color={tabColor} />
    case 'intentions':
      return <IntentionsView intentions={root.intentions || []} />
    case 'fieldNotes':
      return <FieldNotesView fieldNotes={root.fieldNotes || []} />
  }
}

const IntentionsView = ({ intentions }: { intentions: Intention[] }) => {
  const [expandedActiveConvs, setExpandedActiveConvs] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newIntentionTitle, setNewIntentionTitle] = useState('')
  const [startingIntentionId, setStartingIntentionId] = useState<string | null>(null)
  const [timerMinutes, setTimerMinutes] = useState('')
  
  const { me } = useAccount(PondAccount, {
    resolve: {
      root: {
        conversations: { $each: true },
        intentions: true
      }
    }
  })

  const activeIntention = intentions.find(i => i.status === 'active')
  const todoIntentions = intentions.filter(i => i.status === 'todo').sort((a, b) => b.createdAt - a.createdAt)
  const completedIntentions = intentions.filter(i => i.status === 'completed').sort((a, b) => b.updatedAt - a.updatedAt)
  const archivedIntentions = intentions.filter(i => i.status === 'archived').sort((a, b) => b.updatedAt - a.updatedAt)

  const handleCreateIntention = () => {
    if (!me || !newIntentionTitle.trim()) return

    const newIntention = Intention.create({
      title: newIntentionTitle.trim(),
      status: 'todo',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, { owner: me.$jazz.owner })

    me.root.intentions.$jazz.push(newIntention)
    setNewIntentionTitle('')
    setIsCreating(false)
  }

  const handleStart = (intention: Intention) => {
    // Move current active to completed if exists
    if (activeIntention) {
      activeIntention.$jazz.set('status', 'completed')
      activeIntention.$jazz.set('updatedAt', Date.now())
    }

    // Set timer if specified
    if (timerMinutes.trim()) {
      const minutes = parseInt(timerMinutes)
      if (!isNaN(minutes) && minutes > 0) {
        intention.$jazz.set('timerDuration', minutes)
      }
    }

    // Start this intention
    intention.$jazz.set('status', 'active')
    intention.$jazz.set('updatedAt', Date.now())
    
    setStartingIntentionId(null)
    setTimerMinutes('')
  }

  const handleComplete = (intention: Intention) => {
    intention.$jazz.set('status', 'completed')
    intention.$jazz.set('updatedAt', Date.now())
  }

  const handleArchive = (intention: Intention) => {
    intention.$jazz.set('status', 'archived')
    intention.$jazz.set('updatedAt', Date.now())
  }

  // Get conversations linked to an intention
  const getLinkedConversations = (intention: Intention) => {
    if (!me?.root.conversations) return []
    return me.root.conversations.filter(conv => conv.intentionRef?.$jazz.id === intention.$jazz.id)
  }

  const activeLinkedConversations = activeIntention ? getLinkedConversations(activeIntention) : []

  return (
    <>
      {/* Active Intention - Prominent at top */}
      {activeIntention && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(107, 142, 126, 0.15)',
            borderRadius: 10,
            border: '1.5px solid rgba(107, 142, 126, 0.4)',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 4 }}>
                {activeIntention.title}
              </div>
              {activeIntention.timerDuration && (
                <div style={{ fontSize: 12, color: '#6B8E7E', fontWeight: 600 }}>
                  {activeIntention.timerDuration} min session
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                padding: '3px 7px',
                borderRadius: 4,
                backgroundColor: '#6B8E7E',
                color: '#fff',
                textTransform: 'uppercase',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              Active
            </span>
          </div>

          {activeIntention.description && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
              {activeIntention.description}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => handleComplete(activeIntention)}
              style={{
                fontSize: 10,
                padding: '6px 12px',
                borderRadius: 5,
                border: '1px solid rgba(123, 107, 142, 0.4)',
                backgroundColor: 'rgba(123, 107, 142, 0.15)',
                color: '#7B6B8E',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Complete
            </button>
            {activeLinkedConversations.length > 0 && (
              <button
                onClick={() => setExpandedActiveConvs(!expandedActiveConvs)}
                style={{
                  fontSize: 10,
                  padding: '6px 10px',
                  borderRadius: 5,
                  border: '1px solid rgba(139, 115, 85, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  color: '#666',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {expandedActiveConvs ? '−' : '+'} {activeLinkedConversations.length} conversation{activeLinkedConversations.length > 1 ? 's' : ''}
              </button>
            )}
            <div style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>
              {formatDate(activeIntention.updatedAt)}
            </div>
          </div>

          {/* Expanded conversations */}
          <AnimatePresence>
            {expandedActiveConvs && activeLinkedConversations.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(107, 142, 126, 0.2)' }}>
                  {activeLinkedConversations
                    .sort((a, b) => b.startTime - a.startTime)
                    .map((conv, convIdx) => {
                      const duration = Math.round((conv.endTime - conv.startTime) / 1000 / 60)
                      return (
                        <div
                          key={convIdx}
                          style={{
                            padding: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            borderRadius: 6,
                            marginBottom: convIdx < activeLinkedConversations.length - 1 ? 6 : 0,
                          }}
                        >
                          {conv.summary && (
                            <div style={{ fontSize: 11, color: '#555', marginBottom: 4, lineHeight: 1.4 }}>
                              {conv.summary.slice(0, 80)}
                              {conv.summary.length > 80 ? '...' : ''}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 10, color: '#999' }}>
                              {duration}min
                            </div>
                            <div style={{ fontSize: 10, color: '#999' }}>
                              {formatDate(conv.startTime)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* New Intention Button / Form */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: 12,
            fontSize: 11,
            fontWeight: 600,
            color: '#8B7355',
            backgroundColor: 'rgba(139, 115, 85, 0.08)',
            border: '1px dashed rgba(139, 115, 85, 0.3)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          + New Intention
        </button>
      ) : (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: 8,
            border: '1px solid rgba(139, 115, 85, 0.2)',
          }}
        >
          <input
            autoFocus
            type="text"
            value={newIntentionTitle}
            onChange={(e) => setNewIntentionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateIntention()
              if (e.key === 'Escape') {
                setIsCreating(false)
                setNewIntentionTitle('')
              }
            }}
            placeholder="What's your intention?"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 13,
              fontWeight: 500,
              color: '#333',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewIntentionTitle('')
              }}
              style={{
                fontSize: 10,
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid rgba(139, 115, 85, 0.2)',
                backgroundColor: 'transparent',
                color: '#666',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateIntention}
              disabled={!newIntentionTitle.trim()}
              style={{
                fontSize: 10,
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid rgba(139, 115, 85, 0.3)',
                backgroundColor: newIntentionTitle.trim() ? '#8B7355' : 'rgba(139, 115, 85, 0.2)',
                color: newIntentionTitle.trim() ? '#fff' : '#999',
                cursor: newIntentionTitle.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {intentions.length === 0 && (
        <div style={{ color: '#8B7355', fontSize: 13, opacity: 0.6, textAlign: 'center', marginTop: 20 }}>
          No intentions yet
        </div>
      )}

      {/* Todo Intentions */}
      {todoIntentions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            To Do
          </div>
          {todoIntentions.map((intention) => {
            const isStarting = startingIntentionId === intention.$jazz.id

            return (
              <div
                key={intention.$jazz.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                  borderRadius: 8,
                  border: '1px solid rgba(139, 115, 85, 0.15)',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                  {intention.title}
                </div>

                {isStarting ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      autoFocus
                      type="number"
                      value={timerMinutes}
                      onChange={(e) => setTimerMinutes(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStart(intention)
                        if (e.key === 'Escape') {
                          setStartingIntentionId(null)
                          setTimerMinutes('')
                        }
                      }}
                      placeholder="min (optional)"
                      style={{
                        width: '90px',
                        padding: '5px 8px',
                        fontSize: 11,
                        border: '1px solid rgba(139, 115, 85, 0.25)',
                        borderRadius: 4,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleStart(intention)}
                      style={{
                        fontSize: 10,
                        padding: '5px 12px',
                        borderRadius: 4,
                        border: '1px solid rgba(107, 142, 126, 0.4)',
                        backgroundColor: '#6B8E7E',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Start
                    </button>
                    <button
                      onClick={() => {
                        setStartingIntentionId(null)
                        setTimerMinutes('')
                      }}
                      style={{
                        fontSize: 10,
                        padding: '5px 12px',
                        borderRadius: 4,
                        border: '1px solid rgba(139, 115, 85, 0.2)',
                        backgroundColor: 'transparent',
                        color: '#666',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setStartingIntentionId(intention.$jazz.id)}
                    style={{
                      fontSize: 10,
                      padding: '5px 12px',
                      borderRadius: 4,
                      border: '1px solid rgba(107, 142, 126, 0.3)',
                      backgroundColor: 'rgba(107, 142, 126, 0.1)',
                      color: '#6B8E7E',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Start
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed Section */}
      {completedIntentions.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 10,
              fontWeight: 600,
              color: '#7B6B8E',
              backgroundColor: 'rgba(123, 107, 142, 0.06)',
              border: '1px solid rgba(123, 107, 142, 0.2)',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {showCompleted ? '−' : '+'} Completed ({completedIntentions.length})
          </button>
          
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 8 }}>
                  {completedIntentions.map((intention, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px',
                        backgroundColor: 'rgba(123, 107, 142, 0.08)',
                        borderRadius: 6,
                        border: '1px solid rgba(123, 107, 142, 0.15)',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>
                            {intention.title}
                          </div>
                          {intention.timerDuration && (
                            <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                              {intention.timerDuration} min
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: '#999' }}>
                          {formatDate(intention.updatedAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleArchive(intention)}
                        style={{
                          fontSize: 10,
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: '1px solid rgba(139, 115, 85, 0.2)',
                          backgroundColor: 'rgba(255, 255, 255, 0.6)',
                          color: '#666',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Archive
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Archived Section */}
      {archivedIntentions.length > 0 && (
        <div style={{ marginTop: 12, paddingBottom: 40 }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: 10,
              fontWeight: 600,
              color: '#999',
              backgroundColor: 'rgba(153, 153, 153, 0.05)',
              border: '1px solid rgba(153, 153, 153, 0.15)',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {showArchived ? '−' : '+'} Archived ({archivedIntentions.length})
          </button>
          
          <AnimatePresence>
            {showArchived && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 8, paddingBottom: 20 }}>
                  {archivedIntentions.map((intention, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px',
                        backgroundColor: 'rgba(153, 153, 153, 0.08)',
                        borderRadius: 6,
                        border: '1px solid rgba(153, 153, 153, 0.15)',
                        marginBottom: 6,
                        opacity: 0.7,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#666' }}>
                            {intention.title}
                          </div>
                          {intention.timerDuration && (
                            <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                              {intention.timerDuration} min
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: '#999' }}>
                          {formatDate(intention.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

const FieldNotesView = ({ fieldNotes }: { fieldNotes: FieldNote[] }) => {
  const sorted = [...fieldNotes].sort((a, b) => b.createdAt - a.createdAt)

  if (sorted.length === 0) {
    return (
      <div style={{ color: '#8B7355', fontSize: 14, opacity: 0.6 }}>
        No field notes yet
      </div>
    )
  }

  return (
    <>
      {sorted.map((note, idx) => (
        <div
          key={idx}
          style={{
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 4 }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '9px',
                backgroundColor: '#8B7B7A',
                marginRight: '8px',
                marginTop: '2px',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>
                  Innio
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {formatDate(note.createdAt)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginTop: 4 }}>
                {note.content}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

// Utils
const calculateViewX = (difference: number, containerWidth: number) => {
  return difference * (containerWidth * 0.75) * -1
}

const useMounted = () => {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])
  return isMounted
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return '#6B8E7E'
    case 'todo':
      return '#8B7355'
    case 'completed':
      return '#7B6B8E'
    case 'archived':
      return '#999'
    default:
      return '#999'
  }
}

