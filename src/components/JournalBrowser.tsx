import { motion, useMotionTemplate, useSpring, useTransform, useVelocity, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'jazz-tools/react'
import { PondAccount } from '../schema'
import { getDeviceType } from '../helpers/deviceDetection'
import { IntentionsView } from './journal/IntentionsView'
import { FieldNotesView } from './journal/FieldNotesView'
import { AuthView } from './journal/AuthView'
import { useVoice } from '../VoiceChat/VoiceProvider'

type TabId = 'intentions' | 'fieldNotes'

type Tab = {
  id: TabId
  label: string
  color: string
}

const tabs: Tab[] = [
  { id: 'intentions', label: '⚘', color: '#8B7355' },
  { id: 'fieldNotes', label: '✎', color: '#8B7355' },
]

interface JournalBrowserProps {
  isDocked: boolean
  setIsDocked: (docked: boolean) => void
}

export function JournalBrowser({ isDocked, setIsDocked }: JournalBrowserProps) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null)
  const [isAuthMinimized, setIsAuthMinimized] = useState(true)
  const [isAuthTransitioningOut, setIsAuthTransitioningOut] = useState(false)
  const [showAuthAfterCollapse, setShowAuthAfterCollapse] = useState(true)
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
  }, [])

  const handleTabChange = (tabId: TabId) => {
    if (activeTab === tabId && !isDocked) {
      // Clicking active tab while expanded -> dock
      setIsDocked(true)
      setActiveTab(null)
      setShowAuthAfterCollapse(false)
      // Wait for collapse animation to complete, then show auth view
      setTimeout(() => {
        setShowAuthAfterCollapse(true)
      }, 300)
    } else {
      // Switching tabs or expanding from docked
      setActiveTab(tabId)

      // Delay camera movement to let UI animation start first
      setTimeout(() => setIsDocked(false), 200)
    }
  }

  return (
    <>
      {/* Auth View - Top Aligned */}
      <AuthView
        isDocked={isDocked}
        isAuthMinimized={isAuthMinimized}
        setIsAuthMinimized={setIsAuthMinimized}
        isAuthTransitioningOut={isAuthTransitioningOut}
        showAuthAfterCollapse={showAuthAfterCollapse}
      />

      {/* Main Journal UI */}
      <div
        data-ui
        style={{
          position: 'fixed',
          bottom: getDeviceType() === 'desktop' ? '0px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          pointerEvents: 'none', // Allow touches to pass through to canvas
        }}
      >
        <motion.div
          initial={{
            width: 'min(400px, 90vw)',
          }}
          animate={{
            width: isDocked ? 'min(320px, 85vw)' : 'min(400px, 90vw)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 60 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            pointerEvents: 'auto', // Re-enable for interactive children
            touchAction: 'manipulation', // Prevent browser touch gestures from interfering
          }}
          onWheel={(e) => e.stopPropagation()} // Only stop wheel events, let pointer events complete naturally
        >
          {/* Ambient Call Button - Only visible when no tab is active */}
          <AnimatePresence>
            {!activeTab && isDocked && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: -62,
                  marginLeft: -2,
                }}
              >
                <AmbientCallButton />
              </div>
            )}
          </AnimatePresence>

          {/* Views Container */}
          <motion.div
            ref={viewsContainerRef}
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: isDocked ? 0 : 280,
              opacity: isDocked ? 0 : 1,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 60 }}
            style={{
              overflow: 'hidden',
              position: 'relative',
              width: '100%',
              backdropFilter: 'blur(2px)',
              borderRadius: 12,
              pointerEvents: isDocked ? 'none' : 'auto', // Don't block canvas when collapsed
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

          {/* Shared Tabs - always 90% width to avoid layout shift */}
          <div
            style={{
              width: '80%',
              margin: '-2px auto 0'
            }}
          >
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} isDocked={isDocked} />
          </div>
        </motion.div>
      </div>
    </>
  )
}

const AmbientCallButton = () => {
  const { status, startConversation, stopConversation } = useVoice()
  const isActive = status === 'speaking' || status === 'listening'
  const isConnected = status === 'connected' || isActive
  const deviceType = getDeviceType()
  const isMobile = deviceType !== 'desktop'
  
  const buttonSize = isMobile ? 72 : 56
  const innerSize = isMobile ? 56 : 42
  const rippleInset = isMobile ? -4 : -3

  // Determine scale based on status
  const getCircleScale = () => {
    if (status === 'connecting' || status === 'disconnecting') {
      return 0.3
    }
    if (isConnected) {
      return 1
    }
    return 1
  }

  const handleClick = () => {
    if (isConnected || status === 'connecting') {
      stopConversation()
    } else {
      startConversation()
    }
  }


  // SVG X for cutout effect
  const xSize = innerSize * 0.28
  const xStrokeWidth = 2.5

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.3, opacity: 0 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: buttonSize,
        height: buttonSize,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
      }}
    >

      {/* Ripple Effect - when connected */}
      {isConnected && (
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            inset: rippleInset,
            borderRadius: 999,
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            zIndex: 0,
          }}
        />
      )}

      {/* Outer Transparent Circle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Inner White Circle */}
      <motion.div
        animate={{
          scale: getCircleScale(),
          opacity: status === 'disconnecting' ? 0 : 1,
        }}
        transition={{ 
          scale: { type: 'spring', stiffness: 400, damping: 25 },
          opacity: status === 'disconnecting' ? { duration: 0.4, ease: "easeInOut" } : { duration: 0.2 }
        }}
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: 999,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          // boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1,
          position: 'relative',
        }}
      >
        {/* X cutout when connected - shows X to suggest disconnect */}
        {isConnected && (
          <svg
            width={innerSize}
            height={innerSize}
            style={{
              position: 'absolute',
              pointerEvents: 'none',
            }}
            viewBox={`0 0 ${innerSize} ${innerSize}`}
          >
            <g
              transform={`translate(${innerSize / 2}, ${innerSize / 2})`}
              stroke="rgba(100, 100, 100, 0.4)"
              strokeWidth={xStrokeWidth}
              strokeLinecap="round"
            >
              <line x1={-xSize / 2} y1={-xSize / 2} x2={xSize / 2} y2={xSize / 2} />
              <line x1={xSize / 2} y1={-xSize / 2} x2={-xSize / 2} y2={xSize / 2} />
            </g>
          </svg>
        )}
      </motion.div>
    </motion.button>
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

  const isDesktop = getDeviceType() === 'desktop'
  const blur = isDesktop ? useTransform(xVelocity, [-1000, 0, 1000], [4, 0, 4], {
    clamp: false,
  }) : undefined

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
        ...(blur && { filter: useMotionTemplate`blur(${blur}px)` }),
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
          paddingBottom: 48,
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
  const isMobile = getDeviceType() !== 'desktop'

  
  return (
    <motion.ul
      initial={{
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      }}
      animate={{
        paddingTop: isDocked ? 0 : 4,
        paddingBottom: isDocked ? 0 : 4,
        paddingLeft: isDocked ? 0 : 4,
        paddingRight: isDocked ? 0 : 4,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 60 }}
      style={{
        display: 'flex',
        width: '100%',
        margin: 0,
        listStyle: 'none',
        willChange: 'padding',
      }}
    >
      {tabs.map((tab, idx) => (
        <motion.li
          key={tab.id}
          animate={{
            padding: isDocked ? 20 : 16,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 60 }}
          style={{
            display: 'flex',
            cursor: 'pointer',
            flexGrow: 1,
          }}
        >
          <motion.button
            animate={{
              padding: isDocked ? 4 : 6,
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 60 }}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: isMobile ? 32 : 24, // use single fontSize for all
              fontWeight: 500,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === tab.id ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
              transition: 'background-color 0.2s, color 0.2s',
            }}
            whileFocus={{
              outline: '2px solid rgba(110, 104, 92, 0.4)',
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
                    borderRadius: 200,
                    backgroundColor: 'rgba(255, 255, 255, 0.13)',
                  }}
                />
              ) : null}
            </AnimatePresence>
          </motion.button>
        </motion.li>
      ))}
    </motion.ul>
  )
}

const TabContent = ({ tabId, root }: { tabId: TabId; root?: any }) => {
  if (!root) {
    return <div style={{ color: '#8B7355', fontSize: 14, padding: 16 }}>Loading...</div>
  }

  const tab = tabs.find(t => t.id === tabId)
  const tabColor = tab?.color || '#7B9089'

  switch (tabId) {
    case 'intentions':
      return <IntentionsView intentions={root.intentions || []} />
    case 'fieldNotes':
      return <FieldNotesView fieldNotes={root.fieldNotes || []} />
    default:
      return null
  }
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
