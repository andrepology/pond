import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'
import { useAccount } from 'jazz-tools/react'
import { PondAccount, Intention } from '../../schema'
import { formatDate } from './utils'
import { glass, text, tint, blur } from './theme'

interface IntentionsViewProps {
  intentions: Intention[]
  onIntentionStart?: () => void
  onIntentionComplete?: () => void
}

export const IntentionsView = ({ intentions, onIntentionStart, onIntentionComplete }: IntentionsViewProps) => {
  // Add custom range input styles
  useEffect(() => {
    const styleId = 'intention-slider-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        input[type="range"].intention-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${text.primary};
          cursor: pointer;
          border: 2px solid ${text.primary};
        }
        
        input[type="range"].intention-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${text.primary};
          cursor: pointer;
          border: 2px solid ${text.primary};
        }
      `
      document.head.appendChild(style)
    }
    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [newIntentionTitle, setNewIntentionTitle] = useState('')
  const [deletionStage, setDeletionStage] = useState<0 | 1 | 2>(0)

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

  // Update current time every second for live timer display
  /*
  useEffect(() => {
    // Only run interval if there's an active intention
    if (!activeIntention?.startTime || activeIntention.pausedAt) {
      return
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [activeIntention?.startTime, activeIntention?.pausedAt])

  // Calculate elapsed seconds from stored startTime, accounting for pauses
  const getElapsedSeconds = (intention: Intention): number => {
    if (!intention.startTime) return 0
    
    // Only use pausedDuration if the intention is still in the same session
    // (i.e., hasn't been completed and restarted)
    const pausedTime = (intention.status === 'active' && intention.pausedDuration) || 0
    
    if (intention.endTime) {
      // Completed - use endTime minus paused duration
      const elapsed = Math.floor((intention.endTime - intention.startTime - pausedTime) / 1000)
      return Math.max(0, elapsed) // Never return negative
    }
    
    if (intention.pausedAt) {
      // Currently paused - freeze at pause time minus accumulated paused duration
      const elapsed = Math.floor((intention.pausedAt - intention.startTime - pausedTime) / 1000)
      return Math.max(0, elapsed) // Never return negative
    }
    
    // Active - use current time minus paused duration
    const elapsed = Math.floor((currentTime - intention.startTime - pausedTime) / 1000)
    return Math.max(0, elapsed) // Never return negative
  }

  // Format elapsed time as "4m:05s"
  const formatElapsedTime = (seconds: number) => {
    // Ensure we never format negative numbers
    const safeSeconds = Math.max(0, seconds)
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${mins}m:${secs.toString().padStart(2, '0')}s`
  }
  */

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
  }

  /*
  const handleStart = (intention: Intention) => {
    // Move current active to todo if exists (don't complete automatically)
    if (activeIntention && activeIntention.$jazz.id !== intention.$jazz.id) {
      activeIntention.$jazz.set('status', 'todo')
      activeIntention.$jazz.set('updatedAt', Date.now())
      // Clear timer state when pausing
      activeIntention.$jazz.set('startTime', undefined)
      activeIntention.$jazz.set('pausedAt', undefined)
      activeIntention.$jazz.set('pausedDuration', undefined)
    }

    // Set timer duration
    if (timerMinutes > 0) {
      intention.$jazz.set('timerDuration', timerMinutes)
    }

    // Reset all timer state and start fresh
    const now = Date.now()
    intention.$jazz.set('status', 'active')
    intention.$jazz.set('startTime', now)
    intention.$jazz.set('endTime', undefined) // Clear old endTime
    intention.$jazz.set('pausedAt', undefined) // Clear pause state
    intention.$jazz.set('pausedDuration', undefined) // Clear accumulated pause time
    intention.$jazz.set('updatedAt', now)

    setExpandedId(null)
    setEditingId(null)
    setTimerMinutes(25)

    // Call callback if provided
    if (onIntentionStart) {
      onIntentionStart()
    }
  }

  const handlePause = (intention: Intention) => {
    const now = Date.now()
    intention.$jazz.set('pausedAt', now)
    intention.$jazz.set('updatedAt', now)
  }

  const handleResume = (intention: Intention) => {
    if (!intention.pausedAt) return
    
    const now = Date.now()
    const thisPauseDuration = now - intention.pausedAt
    const totalPausedDuration = (intention.pausedDuration || 0) + thisPauseDuration
    
    intention.$jazz.set('pausedDuration', totalPausedDuration)
    intention.$jazz.set('pausedAt', undefined)
    intention.$jazz.set('updatedAt', now)
  }

  const handleAddMinute = (intention: Intention) => {
    const currentDuration = intention.timerDuration || 0
    intention.$jazz.set('timerDuration', currentDuration + 1)
    intention.$jazz.set('updatedAt', Date.now())
  }

  const handleStop = (intention: Intention) => {
    // Stop early - mark as completed but record actual time spent
    const now = Date.now()
    intention.$jazz.set('status', 'completed')
    intention.$jazz.set('endTime', now)
    intention.$jazz.set('updatedAt', now)
    
    // Clear pause state if paused
    if (intention.pausedAt) {
      const thisPauseDuration = now - intention.pausedAt
      const totalPausedDuration = (intention.pausedDuration || 0) + thisPauseDuration
      intention.$jazz.set('pausedDuration', totalPausedDuration)
      intention.$jazz.set('pausedAt', undefined)
    }

    // Call callback if provided
    if (onIntentionComplete) {
      onIntentionComplete()
    }
  }
  */

  const handleComplete = (intention: Intention) => {
    const now = Date.now()
    intention.$jazz.set('status', 'completed')
    intention.$jazz.set('endTime', now)
    intention.$jazz.set('updatedAt', now)
    
    // Clear pause state if paused
    if (intention.pausedAt) {
      const thisPauseDuration = now - intention.pausedAt
      const totalPausedDuration = (intention.pausedDuration || 0) + thisPauseDuration
      intention.$jazz.set('pausedDuration', totalPausedDuration)
      intention.$jazz.set('pausedAt', undefined)
    }

    // Call callback if provided
    if (onIntentionComplete) {
      onIntentionComplete()
    }
  }

  const handleUncomplete = (intention: Intention) => {
    intention.$jazz.set('status', 'todo')
    intention.$jazz.set('updatedAt', Date.now())
  }

  const handleToggleExpand = (intention: Intention) => {
    const intentionId = intention.$jazz.id
    if (expandedId === intentionId) {
      // Collapse
      setExpandedId(null)
      setEditingId(null)
      setEditTitle('')
    } else {
      // Expand and enter edit mode
      setExpandedId(intentionId)
      setEditingId(intentionId)
      setEditTitle(intention.title)
    }
  }

  const handleSaveEdit = (intention: Intention) => {
    if (editTitle.trim() && editTitle.trim() !== intention.title) {
      intention.$jazz.set('title', editTitle.trim())
      intention.$jazz.set('updatedAt', Date.now())
    }
    setEditingId(null)
    setEditTitle('')
  }

  const handleDeleteIntention = (intention: Intention) => {
    if (!me?.root.intentions) return
    me.root.intentions.$jazz.remove((i) => i?.$jazz.id === intention.$jazz.id)
    setEditingId(null)
    setExpandedId(null)
    setDeletionStage(0)
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Active Intention */}
      {activeIntention && (
        <div
          style={{
            padding: '20px 0',
            marginBottom: 24,
            borderBottom: `2px solid ${tint.sage}`,
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'start', marginBottom: 12 }}>
            <button
              onClick={() => handleComplete(activeIntention)}
              style={{
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                borderRadius: '50%',
                border: `2px solid ${text.primary}`,
                backgroundColor: 'transparent',
                cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: text.primary, lineHeight: 1.3 }}>
                {activeIntention.title}
              </div>
              {/* {activeIntention.timerDuration && activeIntention.startTime && (
                <>
                  <div style={{ fontSize: 15, color: text.secondary, fontWeight: 600, marginTop: 8, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
                    {formatElapsedTime(getElapsedSeconds(activeIntention))} / {activeIntention.timerDuration} min
                    {activeIntention.pausedAt && (
                      <span style={{ marginLeft: 8, opacity: 0.6 }}>• Paused</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!activeIntention.pausedAt ? (
                      <button
                        onClick={() => handlePause(activeIntention)}
                        style={{
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: glass.light,
                          color: text.primary,
                          cursor: 'pointer',
                        }}
                      >
                        ⏸ Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleResume(activeIntention)}
                        style={{
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: 'none',
                          backgroundColor: tint.sageStrong,
                          color: text.primary,
                          cursor: 'pointer',
                        }}
                      >
                        ▶ Resume
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAddMinute(activeIntention)}
                      style={{
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: glass.light,
                        color: text.primary,
                        cursor: 'pointer',
                      }}
                    >
                      +1 min
                    </button>
                    
                    <button
                      onClick={() => handleStop(activeIntention)}
                      style={{
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: tint.plum,
                        color: text.primary,
                        cursor: 'pointer',
                      }}
                    >
                      Stop
                    </button>
                  </div>
                </>
              )} */}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Input */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, padding: '16px 0', borderBottom: `1px solid ${glass.ultraLight}` }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ minWidth: 20, minHeight: 20 }}>
          <path d="M10 4V16M4 10H16" stroke={text.tertiary} strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          value={newIntentionTitle}
          onChange={(e) => setNewIntentionTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newIntentionTitle.trim()) {
              handleCreateIntention()
            }
          }}
          placeholder="set an intention..."
          style={{
            flex: 1,
            padding: 0,
            fontSize: 16,
            fontWeight: 600,
            color: text.primary,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
          }}
        />
      </div>

      {/* Todo List */}
      {todoIntentions.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          {todoIntentions.map((intention) => {
            const isExpanded = expandedId === intention.$jazz.id
            const isEditing = editingId === intention.$jazz.id

            return (
              <div
                key={intention.$jazz.id}
                style={{
                  marginBottom: 0,
                  borderBottom: `1px solid ${glass.ultraLight}`,
                }}
              >
                <div
                  style={{
                    padding: '18px 0',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleComplete(intention)
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      minHeight: 28,
                      borderRadius: '50%',
                      border: `2px solid ${text.secondary}`,
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                  {isEditing ? (
                    (editTitle === '' || deletionStage > 0) ? (
                      <div 
                        style={{ 
                          flex: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          fontSize: 16, 
                          fontWeight: 600,
                          color: text.tertiary,
                          gap: 4
                        }}
                      >
                        press <BackspaceKey /> {deletionStage === 1 ? 'one last time' : 'twice'} to delete
                        <input
                          autoFocus
                          type="text"
                          value={editTitle}
                          onChange={(e) => {
                            setEditTitle(e.target.value)
                            if (e.target.value !== '') setDeletionStage(0)
                          }}
                          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (deletionStage === 0) setDeletionStage(1)
                              else if (deletionStage === 1) handleDeleteIntention(intention)
                            } else if (e.key === 'Escape') {
                              setEditingId(null)
                              setExpandedId(null)
                              setDeletionStage(0)
                            } else if (e.key.length === 1) { // Any printable character
                              setDeletionStage(0)
                            }
                          }}
                          onBlur={() => {
                            if (editTitle !== '') {
                              handleSaveEdit(intention)
                            } else if (deletionStage === 0) {
                              setEditingId(null)
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <input
                        autoFocus
                        type="text"
                        value={editTitle}
                        onChange={(e) => {
                          setEditTitle(e.target.value)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(intention)
                            setExpandedId(null)
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditTitle('')
                            setExpandedId(null)
                            setDeletionStage(0)
                          }
                        }}
                        onBlur={() => handleSaveEdit(intention)}
                        style={{
                          flex: 1,
                          fontSize: 19,
                          fontWeight: 700,
                          color: text.primary,
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          lineHeight: 1.3,
                        }}
                      />
                    )
                  ) : (
                    <div
                      onClick={() => handleToggleExpand(intention)}
                      style={{
                        flex: 1,
                        fontSize: 19,
                        fontWeight: 700,
                        color: text.primary,
                        cursor: 'pointer',
                        lineHeight: 1.3,
                      }}
                    >
                      {intention.title}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: text.secondary }}>Duration</span>
                            <span style={{ fontSize: 18, fontWeight: 700, color: text.primary }}>{timerMinutes} min</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="90"
                            step="5"
                            value={timerMinutes}
                            onChange={(e) => setTimerMinutes(Number(e.target.value))}
                            className="intention-slider"
                            style={{
                              width: '100%',
                              height: 6,
                              borderRadius: 3,
                              outline: 'none',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                              background: `linear-gradient(to right, ${tint.sage} 0%, ${tint.sage} ${((timerMinutes - 5) / 85) * 100}%, ${glass.ultraLight} ${((timerMinutes - 5) / 85) * 100}%, ${glass.ultraLight} 100%)`,
                              cursor: 'pointer',
                            }}
                          />
                        </div>

                        <button
                          onClick={() => handleStart(intention)}
                          style={{
                            padding: '16px',
                            fontSize: 16,
                            fontWeight: 700,
                            borderRadius: 10,
                            border: 'none',
                            backgroundColor: tint.sageStrong,
                            color: text.primary,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                          }}
                        >
                          ▶ Start Session
                        </button> */}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed List */}
      {completedIntentions.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: text.tertiary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Completed
          </div>
          {completedIntentions.map((intention) => (
            <div
              key={intention.$jazz.id}
              style={{
                padding: '16px 0',
                borderBottom: `1px solid ${glass.ultraLight}`,
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                opacity: 0.6,
              }}
            >
              <button
                onClick={() => handleUncomplete(intention)}
                style={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  minHeight: 28,
                  borderRadius: '50%',
                  border: `2px solid ${text.tertiary}`,
                  backgroundColor: text.tertiary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: '#fff',
                }}
              ></button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: text.secondary, textDecoration: 'line-through' }}>
                  {intention.title}
                </div>
                {/* {intention.timerDuration && (
                  <div style={{ fontSize: 12, color: text.tertiary, marginTop: 4 }}>
                    {intention.timerDuration} min
                  </div>
                )} */}
              </div>
              <div style={{ fontSize: 11, color: text.tertiary, flexShrink: 0 }}>
                {formatDate(intention.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {intentions.length === 0 && (
        <div style={{ color: text.tertiary, fontSize: 15, textAlign: 'center', marginTop: 60, opacity: 0.5 }}>
          no intentions yet
        </div>
      )}
    </div>
  )
}

const BackspaceKey = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2px 8px',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: 6,
      fontSize: 12,
      fontFamily: 'monospace',
      color: text.secondary,
      boxShadow: '0 2px 0 rgba(0, 0, 0, 0.1)',
      margin: '0 2px',
      verticalAlign: 'middle',
    }}
  >
    backspace
  </span>
)

