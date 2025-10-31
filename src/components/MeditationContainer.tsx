import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Signal } from '@preact/signals-core'

type Stage = 'setUp' | 'inProgress' | 'end'

interface MeditationContainerProps {
  markersVisibleRef: React.RefObject<boolean>
  hasInputSignal?: Signal<boolean>
}

export function MeditationContainer({ markersVisibleRef, hasInputSignal }: MeditationContainerProps) {
  const [stage, setStage] = useState<Stage>('setUp')

  // Subscribe to signal for input visibility
  const hasInput = useSyncExternalStore(
    (onStoreChange) => {
      if (!hasInputSignal) return () => {}
      return hasInputSignal.subscribe(onStoreChange)
    },
    () => hasInputSignal?.value ?? false,
    () => hasInputSignal?.value ?? false
  )

  // SetUp stage state
  const [duration, setDuration] = useState(15)

  // InProgress stage state
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<number | null>(null)

  // End stage state
  const [reflection, setReflection] = useState('')

  // Container animation variants (width + enter/exit animations)
  const containerVariants = {
    setUp: { width: 480 },
    inProgress: { width: 360 },
    end: { width: 600 },
    // Entrance animation (mirrored by exit)
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.9
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.9
    }
  }

  // Stage content animation variants
  const stageVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30
  }

  // Timer effect
  useEffect(() => {
    if (stage === 'inProgress' && !isPaused && timeRemaining > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setStage('end')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [stage, isPaused, timeRemaining])

  const handleSetUpContinue = () => {
    setTimeRemaining(duration * 60)
    setStage('inProgress')
  }

  const handleCollapse = () => {
    // Markers visibility is now tied directly to input presence
  }

  const handleEnd = () => {
    setIsPaused(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setStage('end')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <AnimatePresence>
      {hasInput && (
        <div
          data-ui
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <motion.div
            layout
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springTransition}
            style={{
              backgroundColor: stage === 'end' ? 'transparent' : 'rgba(229, 229, 229, 0.6)',
              borderRadius: '12px',
              border: stage === 'end' ? 'none' : '1px solid rgba(204, 204, 204, 0.5)',
              overflow: 'hidden',
              position: 'relative',
              maxHeight: '128px',
              backdropFilter: stage === 'end' ? 'none' : 'blur(4px)',
              WebkitBackdropFilter: stage === 'end' ? 'none' : 'blur(4px)' // Safari support
            }}
          >
        <AnimatePresence mode="popLayout">
          {stage === 'setUp' && (
            <motion.div
              key="setUp"
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              style={{ padding: '20px' }}
            >
              <SetUpStage
                duration={duration}
                setDuration={setDuration}
                onContinue={handleSetUpContinue}
                onCollapse={handleCollapse}
              />
            </motion.div>
          )}


          {stage === 'inProgress' && hasInput && (
            <motion.div
              key="inProgress"
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              style={{ padding: '16px' }}
            >
              <InProgressStage
                timeRemaining={timeRemaining}
                formatTime={formatTime}
                isPaused={isPaused}
                onPauseResume={() => setIsPaused(!isPaused)}
                onEnd={handleEnd}
                onBack={() => {
                  setStage('setUp')
                  setIsPaused(false)
                  if (timerRef.current) clearInterval(timerRef.current)
                }}
              />
            </motion.div>
          )}

          {stage === 'end' && (
            <motion.div
              key="end"
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              style={{ padding: '24px' }}
            >
              <EndStage
                reflection={reflection}
                setReflection={setReflection}
                onBack={() => {
                  setStage('inProgress')
                  setIsPaused(false)
                }}
                onSubmit={() => {
                  handleCollapse()
                  setReflection('')
                  setDuration(15)
                  setStage('setUp')
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  )
}


interface SetUpStageProps {
  duration: number
  setDuration: (value: number) => void
  onContinue: () => void
  onCollapse: () => void
}

function SetUpStage({ duration, setDuration, onContinue, onCollapse }: SetUpStageProps) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{ marginBottom: '12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <motion.div
            style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', width: '60px', textAlign: 'center', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px' }}
          >
            {duration}
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#e0e0e0', opacity: 0.7 }}>
              m
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            style={{ flex: 1, position: 'relative' }}
          >
            <input
              type="range"
              min="0"
              max="60"
              value={duration}
              onInput={(e) => setDuration(Number((e.target as HTMLInputElement).value))}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              onPointerMove={(e) => {
                e.stopPropagation()
              }}
              onPointerUp={(e) => {
                e.stopPropagation()
              }}
              style={{
                width: '100%',
                height: '28px',
                background: 'rgba(210, 210, 210, 0.8)',
                outline: 'none',
                borderRadius: '8px',
                appearance: 'none',
                WebkitAppearance: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 6px'
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '20px',
                top: '45%',
                transform: 'translateY(-50%)',
                fontSize: '10px',
                fontWeight: '600',
                color: '#555',
                letterSpacing: '0.1em',
                textTransform: 'none',
                pointerEvents: 'none',
                zIndex: -1
              }}
            >
              duration
            </div>
            <style dangerouslySetInnerHTML={{
              __html: `
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  -webkit-appearance: none;
                  width: 20px;
                  height: 20px;
                  border-radius: 6px;
                  background: #ffffff;
                  cursor: pointer;
                  margin-top: 4px;
                }
                input[type="range"]::-webkit-slider-track {
                  background: rgba(210, 210, 210, 0.8);
                  height: 28px;
                  border-radius: 12px;
                  border: none;
                }
                input[type="range"]::-moz-range-thumb {
                  width: 20px;
                  height: 20px;
                  border-radius: 6px;
                  background: #ffffff;
                  cursor: pointer;
                }
                input[type="range"]::-moz-range-track {
                  background: rgba(210, 210, 210, 0.8);
                  height: 28px;
                  border-radius: 12px;
                  border: none;
                }
                input[type="range"]:focus {
                  outline: none;
                }
              `
            }} />
          </motion.div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button
          onClick={onContinue}
          style={{
            padding: '6px 12px',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}


interface InProgressStageProps {
  timeRemaining: number
  formatTime: (seconds: number) => string
  isPaused: boolean
  onPauseResume: () => void
  onEnd: () => void
  onBack: () => void
}

function InProgressStage({ timeRemaining, formatTime, isPaused, onPauseResume, onEnd, onBack }: InProgressStageProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          left: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '4px',
          background: 'transparent',
          color: '#999',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '12px',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          e.currentTarget.style.color = '#666';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#999';
        }}
      >
        ‹
      </button>

      <motion.div
        layoutId="timer-display"
        style={{
          fontSize: '32px',
          color: '#333',
          fontWeight: 'bold',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {formatTime(timeRemaining)}
      </motion.div>

      <button
        onClick={onPauseResume}
        style={{
          padding: '8px',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      <AnimatePresence mode="wait">
        {isPaused && (
          <motion.button
            key="end"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onEnd}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f8f8';
              e.currentTarget.style.borderColor = '#bbb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            End
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

interface EndStageProps {
  reflection: string
  setReflection: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

function EndStage({ reflection, setReflection, onSubmit, onBack }: EndStageProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <input
        placeholder="Quick reflection..."
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit()
          }
        }}
        style={{
          flex: 1,
          height: '32px',
          border: 'none',
          borderRadius: '16px',
          padding: '0 12px',
          fontSize: '14px',
          color: '#333',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          outline: 'none'
        }}
      />
      <button
        onClick={onBack}
        style={{
          padding: '6px',
          background: 'transparent',
          color: '#666',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ‹
      </button>
      <button
        onClick={onSubmit}
        style={{
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#333',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500'
        }}
      >
        Done
      </button>
    </div>
  )
}

