import { motion, useMotionTemplate, useSpring, useTransform, useVelocity, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'jazz-tools/react'
import { PondAccount, Intention, Conversation, FieldNote } from '../schema'
import { CallButton } from '../VoiceChat'

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
      }}
    >
      <div
        className="scroller"
        style={{
          width: '100%',
          height: '100%',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
          pointerEvents: 'auto',
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
                padding: 8,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 16,
                fontWeight: 500,
                borderRadius: 8,
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
                padding: 8,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 22,
                fontWeight: 500,
                borderRadius: 8,
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
  '"what do you want to focus on today?"',
  '"how are you feeling right now?"',
  '"what\'s been on your mind lately?"',
  '"what would you like to explore?"',
  '"what\'s your current challenge?"',
  '"what do you need support with?"'
]

const CallView = ({ conversations }: { conversations: Conversation[] }) => {
  const [isHelpExpanded, setIsHelpExpanded] = useState(false)
  const [promptState, setPromptState] = useState({
    index: 0,
    fadeClass: 'opacity-100'
  })

  // Get orphaned conversations (not linked to any intention)
  const orphanedConversations = conversations.filter(conv => !conv.intentionRef)

  // Cycle through dynamic prompts
  useEffect(() => {
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
  }, [])

  if (orphanedConversations.length === 0) {
    return (
      <div style={{ position: 'relative', padding: '24px 8px' }}>
        {/* Large prompt text behind the call button */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            fontSize: 28,
            fontWeight: 600,
            textAlign: 'left',
            pointerEvents: 'none',
            zIndex: 0,
            lineHeight: '1.2'
          }}
        >
        <span style={{ color: 'rgba(123, 144, 137, 0.6)' }}>
          ask innio
        </span>
        <span style={{ color: 'rgba(123, 144, 137, 0.6)' }}>
          {' '}
        </span>
        <span
          className={`transition-opacity duration-1000 ${promptState.fadeClass}`}
          style={{ color: 'rgba(123, 144, 137, 0.6)' }}
        >
          {DYNAMIC_PROMPTS[promptState.index]}
        </span>
        </div>

        {/* Call button on top */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 36 }}>
          <CallButton />
        </div>

        {/* Help Section */}
        <div
          onClick={() => setIsHelpExpanded(!isHelpExpanded)}
          style={{
            cursor: 'pointer',
            borderRadius: 6,
            overflow: 'hidden'
          }}
        >
          <motion.div
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: 6,
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              minHeight: '40px',
              boxSizing: 'border-box',
              gap: '8px'
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#888'
              }}
            >
              what to talk about
            </span>
            <motion.span
              animate={{ rotate: isHelpExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 8, opacity: 0.6 }}
            >
              ▼
            </motion.span>
          </motion.div>

          <AnimatePresence>
            {isHelpExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    padding: '12px',
                    fontSize: 10,
                    color: '#666',
                    lineHeight: 1.6,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0 0 6px 6px',
                    marginTop: 2,
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

        <div style={{ color: '#8B7355', fontSize: 12, opacity: 0.5, textAlign: 'center', marginTop: 12 }}>
          No conversations yet
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', padding: '24px 8px' }}>
      {/* Large prompt text behind the call button */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          fontSize: 28,
          fontWeight: 600,
          textAlign: 'left',
          pointerEvents: 'none',
          zIndex: 0,
          lineHeight: '1.2'
        }}
      >
        <span style={{ color: 'rgba(123, 144, 137, 0.6)' }}>
          ask innio
        </span>
        <span style={{ color: 'rgba(123, 144, 137, 0.6)' }}>
          {' '}
        </span>
        <span
          className={`transition-opacity duration-1000 ${promptState.fadeClass}`}
          style={{ color: 'rgba(123, 144, 137, 0.6)' }}
        >
          {DYNAMIC_PROMPTS[promptState.index]}
        </span>
      </div>

      {/* Call button on top */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
        <CallButton />
      </div>

        {/* Help Section */}
        <div style={{ marginBottom: 40 }}>
          <div
            onClick={() => setIsHelpExpanded(!isHelpExpanded)}
            style={{
              cursor: 'pointer',
              borderRadius: 6,
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{
                width: '100%',
                padding: '8px 16px',
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                minHeight: '40px',
                boxSizing: 'border-box',
                gap: '8px'
              }}
            >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: '#888'
              }}
            >
              what to talk about
            </span>
            <motion.span
              animate={{ rotate: isHelpExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 8, opacity: 0.6 }}
            >
              ▼
            </motion.span>
          </motion.div>

          <AnimatePresence>
            {isHelpExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    padding: '12px',
                    fontSize: 10,
                    color: '#666',
                    lineHeight: 1.6,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0 0 6px 6px',
                    marginTop: 2,
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

  switch (tabId) {
    case 'call':
      return <CallView conversations={root.conversations || []} />
    case 'intentions':
      return <IntentionsView intentions={root.intentions || []} />
    case 'fieldNotes':
      return <FieldNotesView fieldNotes={root.fieldNotes || []} />
  }
}

const IntentionsView = ({ intentions }: { intentions: Intention[] }) => {
  const sortedIntentions = [...intentions].sort((a, b) => {
    const statusOrder = { active: 0, todo: 1, completed: 2, archived: 3 }
    return statusOrder[a.status] - statusOrder[b.status] || b.updatedAt - a.updatedAt
  })

  if (sortedIntentions.length === 0) {
    return (
      <div style={{ color: '#8B7355', fontSize: 14, opacity: 0.6 }}>
        No intentions yet
      </div>
    )
  }

  return (
    <>
      {/* Intentions */}
      {sortedIntentions.map((intention, idx) => (
          <div
            key={idx}
            style={{
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              borderRadius: 8,
              border: '1px solid rgba(139, 115, 85, 0.15)',
              marginBottom: idx < sortedIntentions.length - 1 ? '8px' : '0',
            }}
          >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333', flex: 1 }}>
              {intention.title}
            </div>
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: getStatusColor(intention.status),
                color: '#fff',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {intention.status}
            </span>
          </div>
          {intention.description && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {intention.description}
            </div>
          )}
          </div>
      ))}

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

