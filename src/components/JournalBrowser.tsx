import { motion, useMotionTemplate, useSpring, useTransform, useVelocity } from 'motion/react'
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
  { id: 'call', label: '📞', color: '#4A90E2', isCallButton: true },
  { id: 'intentions', label: 'Intentions', color: '#8B7355', isCallButton: false },
  { id: 'fieldNotes', label: 'Field Notes', color: '#7B6B8E', isCallButton: false },
]

type TabId = Tab['id']

export function JournalBrowser() {
  const [activeTab, setActiveTab] = useState<TabId>('intentions')
  const [isDocked, setIsDocked] = useState(false)
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
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
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
          }}
        >
          {isMounted && !isDocked &&
            tabs.map((tab, idx) => (
              <View
                key={tab.id}
                containerWidth={viewsContainerWidth}
                viewIndex={idx}
                activeIndex={tabs.findIndex((t) => t.id === activeTab)}
              >
                <TabContent tabId={tab.id} root={root} />
              </View>
            ))}
        </motion.div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
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
        style={{
          width: '100%',
          height: '100%',
          padding: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
        }}
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
}: {
  tabs: Tab[]
  activeTab: TabId
  onTabChange: (tab: TabId) => void
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
              {tab.id === activeTab ? (
                <motion.span
                  layoutId="activeTab"
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
                fontSize: 12,
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
              {tab.id === activeTab ? (
                <motion.span
                  layoutId="activeTab"
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
            </motion.button>
          )}
        </motion.li>
      ))}
    </ul>
  )
}

const TabContent = ({ tabId, root }: { tabId: TabId; root?: any }) => {
  if (!root) {
    return <div style={{ color: '#8B7355', fontSize: 14 }}>Loading...</div>
  }

  switch (tabId) {
    case 'call':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CallButton />
        </div>
      )
    case 'intentions':
      return <IntentionsView intentions={root.intentions || []} conversations={root.conversations || []} />
    case 'fieldNotes':
      return <FieldNotesView fieldNotes={root.fieldNotes || []} />
  }
}

const IntentionsView = ({ intentions, conversations }: { intentions: Intention[], conversations: Conversation[] }) => {
  const sortedIntentions = [...intentions]
    .filter(intention => intention !== null) // Filter out null items first
    .sort((a, b) => {
      const statusOrder = { active: 0, todo: 1, completed: 2, archived: 3 }
      return statusOrder[a.status] - statusOrder[b.status] || b.updatedAt - a.updatedAt
    })

  // Group conversations by intention
  const conversationsByIntention = conversations
    .filter(conv => conv !== null) // Filter out null conversations
    .reduce((acc, conv) => {
      if (conv.intentionRef) {
        const intentionId = conv.intentionRef.$jazz.id
        if (!acc[intentionId]) acc[intentionId] = []
        acc[intentionId].push(conv)
      }
      return acc
    }, {} as Record<string, Conversation[]>)

  const filteredConversations = conversations.filter(conv => conv !== null)
  if (sortedIntentions.length === 0 && filteredConversations.length === 0) {
    return (
      <div style={{ color: '#8B7355', fontSize: 14, opacity: 0.6 }}>
        No intentions or conversations yet
      </div>
    )
  }

  return (
    <>
      {/* Intentions */}
      {sortedIntentions.map((intention, idx) => {
          const relatedConversations = conversationsByIntention[intention.$jazz.id] || []
          return (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                borderRadius: 8,
                border: '1px solid rgba(139, 115, 85, 0.15)',
                marginBottom: relatedConversations.length > 0 ? '8px' : '0',
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
              <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                {formatDate(intention.updatedAt)}
              </div>

            {/* Related Conversations */}
            {relatedConversations.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>
                  Conversations ({relatedConversations.length})
                </div>
                {relatedConversations.slice(0, 3).map((conv, convIdx) => {
                  const duration = Math.round((conv.endTime - conv.startTime) / 1000 / 60)
                  return (
                    <div
                      key={convIdx}
                      style={{
                        padding: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: 6,
                        marginBottom: convIdx < relatedConversations.slice(0, 3).length - 1 ? '4px' : '0',
                        border: '1px solid rgba(107, 142, 126, 0.1)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#333' }}>
                          {formatDate(conv.startTime)}
                        </div>
                        <div style={{ fontSize: 10, color: '#666' }}>{duration}m</div>
                      </div>
                      {conv.summary && (
                        <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                          {conv.summary.slice(0, 60)}
                          {conv.summary.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
                {relatedConversations.length > 3 && (
                  <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                    +{relatedConversations.length - 3} more conversations
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Orphaned Conversations (not linked to any intention) */}
      {filteredConversations.filter(conv => !conv.intentionRef).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
            Other Conversations
          </div>
          {filteredConversations
            .filter(conv => !conv.intentionRef)
            .slice(0, 5)
            .map((conv, idx) => {
              const duration = Math.round((conv.endTime - conv.startTime) / 1000 / 60)
              return (
                <div
                  key={idx}
                  style={{
                    padding: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                    borderRadius: 8,
                    border: '1px solid rgba(107, 142, 126, 0.15)',
                    marginBottom: idx < filteredConversations.filter(conv => !conv.intentionRef).slice(0, 5).length - 1 ? '6px' : '0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>
                      {formatDate(conv.startTime)}
                    </div>
                    <div style={{ fontSize: 11, color: '#666' }}>{duration}m</div>
                  </div>
                  {conv.summary && (
                    <div style={{ fontSize: 11, color: '#666' }}>
                      {conv.summary.slice(0, 80)}
                      {conv.summary.length > 80 ? '...' : ''}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </>
  )
}

const FieldNotesView = ({ fieldNotes }: { fieldNotes: FieldNote[] }) => {
  const sorted = [...fieldNotes]
    .filter(note => note !== null) // Filter out null field notes
    .sort((a, b) => b.createdAt - a.createdAt)

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
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            borderRadius: 8,
            border: '1px solid rgba(123, 107, 142, 0.15)',
          }}
        >
          <div style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>
            {formatDate(note.createdAt)}
          </div>
          <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
            {note.content}
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

