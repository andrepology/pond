import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { useAccount } from 'jazz-tools/react'
import { PondAccount, Intention, Conversation } from '../../schema'
import { formatDate } from './utils'
import { glass, text, tint, blur } from './theme'

export const IntentionsView = ({ intentions }: { intentions: Intention[] }) => {
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
            backgroundColor: tint.sage,
            backdropFilter: blur.medium,
            borderRadius: 10,
            border: 'none',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: text.primary, marginBottom: 4 }}>
                {activeIntention.title}
              </div>
              {activeIntention.timerDuration && (
                <div style={{ fontSize: 12, color: text.secondary, fontWeight: 600 }}>
                  {activeIntention.timerDuration} min session
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 9,
                padding: '3px 7px',
                borderRadius: 4,
                backgroundColor: tint.sageStrong,
                color: text.primary,
                textTransform: 'uppercase',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              Active
            </span>
          </div>

          {activeIntention.description && (
            <div style={{ fontSize: 12, color: text.secondary, marginBottom: 10 }}>
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
                border: 'none',
                backgroundColor: tint.plum,
                backdropFilter: blur.subtle,
                color: text.primary,
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
                  border: 'none',
                  backgroundColor: glass.strong,
                  backdropFilter: blur.subtle,
                  color: text.secondary,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {expandedActiveConvs ? '−' : '+'} {activeLinkedConversations.length} conversation{activeLinkedConversations.length > 1 ? 's' : ''}
              </button>
            )}
            <div style={{ fontSize: 10, color: text.tertiary, marginLeft: 'auto' }}>
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
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${glass.ultraLight}` }}>
                  {activeLinkedConversations
                    .sort((a, b) => b.startTime - a.startTime)
                    .map((conv, convIdx) => {
                      const duration = Math.round((conv.endTime - conv.startTime) / 1000 / 60)
                      return (
                        <div
                          key={convIdx}
                          style={{
                            padding: '8px',
                            backgroundColor: glass.light,
                            backdropFilter: blur.subtle,
                            borderRadius: 6,
                            marginBottom: convIdx < activeLinkedConversations.length - 1 ? 6 : 0,
                          }}
                        >
                          {conv.summary && (
                            <div style={{ fontSize: 11, color: text.secondary, marginBottom: 4, lineHeight: 1.4 }}>
                              {conv.summary.slice(0, 80)}
                              {conv.summary.length > 80 ? '...' : ''}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 10, color: text.tertiary }}>
                              {duration}min
                            </div>
                            <div style={{ fontSize: 10, color: text.tertiary }}>
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
            color: text.secondary,
            backgroundColor: glass.ultraLight,
            backdropFilter: blur.subtle,
            border: 'none',
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
            backgroundColor: glass.light,
            backdropFilter: blur.medium,
            borderRadius: 8,
            border: 'none',
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
              color: text.primary,
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
                border: 'none',
                backgroundColor: glass.ultraLight,
                color: text.secondary,
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
                border: 'none',
                backgroundColor: newIntentionTitle.trim() ? tint.earthStrong : glass.ultraLight,
                backdropFilter: blur.subtle,
                color: newIntentionTitle.trim() ? text.primary : text.tertiary,
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
        <div style={{ color: text.tertiary, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
          No intentions yet
        </div>
      )}

      {/* Todo Intentions */}
      {todoIntentions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: text.tertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            To Do
          </div>
          {todoIntentions.map((intention) => {
            const isStarting = startingIntentionId === intention.$jazz.id

            return (
              <div
                key={intention.$jazz.id}
                style={{
                  padding: '12px',
                  backgroundColor: glass.light,
                  backdropFilter: blur.subtle,
                  borderRadius: 8,
                  border: 'none',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: text.primary, marginBottom: 8 }}>
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
                        border: 'none',
                        borderRadius: 4,
                        outline: 'none',
                        backgroundColor: glass.ultraLight,
                        color: text.primary,
                      }}
                    />
                    <button
                      onClick={() => handleStart(intention)}
                      style={{
                        fontSize: 10,
                        padding: '5px 12px',
                        borderRadius: 4,
                        border: 'none',
                        backgroundColor: tint.sageStrong,
                        backdropFilter: blur.subtle,
                        color: text.primary,
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
                        border: 'none',
                        backgroundColor: glass.ultraLight,
                        color: text.secondary,
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
                      border: 'none',
                      backgroundColor: tint.sage,
                      backdropFilter: blur.subtle,
                      color: text.primary,
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
              color: text.secondary,
              backgroundColor: tint.plum,
              backdropFilter: blur.subtle,
              border: 'none',
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
                        backgroundColor: glass.ultraLight,
                        backdropFilter: blur.subtle,
                        borderRadius: 6,
                        border: 'none',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: text.secondary }}>
                            {intention.title}
                          </div>
                          {intention.timerDuration && (
                            <div style={{ fontSize: 10, color: text.tertiary, marginTop: 2 }}>
                              {intention.timerDuration} min
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: text.tertiary }}>
                          {formatDate(intention.updatedAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleArchive(intention)}
                        style={{
                          fontSize: 10,
                          padding: '4px 8px',
                          borderRadius: 4,
                          border: 'none',
                          backgroundColor: glass.light,
                          color: text.secondary,
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
              color: text.tertiary,
              backgroundColor: tint.slate,
              backdropFilter: blur.subtle,
              border: 'none',
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
                        backgroundColor: glass.ultraLight,
                        backdropFilter: blur.subtle,
                        borderRadius: 6,
                        border: 'none',
                        marginBottom: 6,
                        opacity: 0.7,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: text.tertiary }}>
                            {intention.title}
                          </div>
                          {intention.timerDuration && (
                            <div style={{ fontSize: 10, color: text.subtle, marginTop: 2 }}>
                              {intention.timerDuration} min
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, color: text.subtle }}>
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

