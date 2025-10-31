import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'

type Stage = 'passive' | 'setUp' | 'inProgress' | 'end'

interface MeditationContainerProps {
  markersVisibleRef: React.RefObject<boolean>
}

export function MeditationContainer({ markersVisibleRef }: MeditationContainerProps) {
  const [stage, setStage] = useState<Stage>('passive')

  // SetUp stage state
  const [intention, setIntention] = useState('')
  const [duration, setDuration] = useState(15)

  // InProgress stage state
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<number | null>(null)

  // End stage state
  const [reflection, setReflection] = useState('')

  // Focus management
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle empty intention text - go back to passive stage
  useEffect(() => {
    if (stage === 'setUp' && intention === '') {
      setStage('passive')
      markersVisibleRef.current = false
    }
  }, [intention, stage, markersVisibleRef])

  // Maintain focus on input during transitions
  useEffect(() => {
    if ((stage === 'passive' || stage === 'setUp') && inputRef.current) {
      inputRef.current.focus()
    }
  }, [stage])

  // Container animation variants (width only - height handled by layout prop)
  const containerVariants = {
    passive: { width: 300 }, // Wider for bigger input field
    setUp: { width: 400 },
    inProgress: { width: 350 },
    end: { width: 500 }
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
    setStage('passive')
    markersVisibleRef.current = false
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
        animate={stage}
        transition={springTransition}
        style={{
          backgroundColor: stage === 'end' ? 'transparent' : 'rgba(229, 229, 229, 0.6)',
          borderRadius: '12px',
          border: stage === 'end' ? 'none' : '1px solid rgba(204, 204, 204, 0.5)',
          overflow: 'hidden',
          position: 'relative',
          height: 'auto',
          backdropFilter: stage === 'end' ? 'none' : 'blur(4px)',
          WebkitBackdropFilter: stage === 'end' ? 'none' : 'blur(4px)' // Safari support
        }}
      >
        <AnimatePresence mode="popLayout">
          {stage === 'passive' && (
            <motion.div
              key="passive"
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              style={{ padding: '10px 20px' }}
            >
              <PassiveStage
                intention={intention}
                setIntention={setIntention}
                onStartTyping={() => {
                  setStage('setUp')
                  markersVisibleRef.current = true
                }}
                inputRef={inputRef}
                stage={stage}
              />
            </motion.div>
          )}

          {stage === 'setUp' && (
            <motion.div
              key="setUp"
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              style={{ padding: '24px' }}
            >
              <SetUpStage
                intention={intention}
                setIntention={setIntention}
                duration={duration}
                setDuration={setDuration}
                onContinue={handleSetUpContinue}
                onCollapse={handleCollapse}
                inputRef={inputRef}
              />
            </motion.div>
          )}


          {stage === 'inProgress' && (
            <motion.div
              key="inProgress"
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={springTransition}
              style={{ padding: '20px' }}
            >
              <InProgressStage
                timeRemaining={timeRemaining}
                formatTime={formatTime}
                isPaused={isPaused}
                onPauseResume={() => setIsPaused(!isPaused)}
                onAddMinute={() => setTimeRemaining(prev => prev + 60)}
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
              style={{ padding: '32px' }}
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
                  setIntention('')
                  setDuration(15)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function PassiveStage({ intention, setIntention, onStartTyping, inputRef, stage }: { intention: string, setIntention: (value: string) => void, onStartTyping: () => void, inputRef: React.RefObject<HTMLInputElement>, stage: string }) {
  return (
    <motion.input
      ref={inputRef}
      layout
      layoutId="intention-input"
      type="text"
      placeholder="set intention"
      value={intention}
      onChange={(e) => {
        setIntention(e.target.value)
        if (stage === 'passive') {
          onStartTyping()
        }
      }}
      style={{
        width: '250px',
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        textAlign: 'center'
      }}
      autoFocus
    />
  )
}

interface SetUpStageProps {
  intention: string
  setIntention: (value: string) => void
  duration: number
  setDuration: (value: number) => void
  onContinue: () => void
  onCollapse: () => void
  inputRef: React.RefObject<HTMLInputElement>
}

function SetUpStage({ intention, setIntention, duration, setDuration, onContinue, onCollapse, inputRef }: SetUpStageProps) {
  return (
    <div>
      <motion.input
        ref={inputRef}
        layout
        layoutId="intention-input"
        type="text"
        placeholder="set an intention"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: '24px',
          fontWeight: '600',
          color: '#333',
          marginBottom: '20px'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <motion.div
            style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', width: '80px', textAlign: 'center' }}
          >
            {duration}:00
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
                height: '24px',
                background: '#e5e7eb',
                outline: 'none',
                borderRadius: '12px',
                appearance: 'none',
                WebkitAppearance: 'none',
                border: '2px solid #d1d5db',
                cursor: 'pointer'
              }}
            />
            <style dangerouslySetInnerHTML={{
              __html: `
                input[type="range"]::-webkit-slider-thumb {
                  appearance: none;
                  -webkit-appearance: none;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: #1f2937;
                  cursor: pointer;
                  border: 4px solid #ffffff;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  margin-top: -4px;
                }
                input[type="range"]::-webkit-slider-track {
                  background: #e5e7eb;
                  height: 24px;
                  border-radius: 12px;
                  border: 2px solid #d1d5db;
                }
                input[type="range"]::-moz-range-thumb {
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: #1f2937;
                  cursor: pointer;
                  border: 4px solid #ffffff;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                input[type="range"]::-moz-range-track {
                  background: #e5e7eb;
                  height: 24px;
                  border-radius: 12px;
                  border: 2px solid #d1d5db;
                }
                input[type="range"]:focus {
                  outline: none;
                }
              `
            }} />
          </motion.div>
        </div>
      </motion.div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onCollapse}
          style={{
            padding: '8px',
            background: 'transparent',
            color: '#666',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ‹
        </button>
        <button
          onClick={onContinue}
          style={{
            padding: '8px 16px',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
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
  onAddMinute: () => void
  onEnd: () => void
  onBack: () => void
}

function InProgressStage({ timeRemaining, formatTime, isPaused, onPauseResume, onAddMinute, onEnd, onBack }: InProgressStageProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <motion.div layoutId="timer-display" style={{ fontSize: '32px', color: '#333', fontWeight: 'bold' }}>
          {formatTime(timeRemaining)}
        </motion.div>
        {!isPaused && (
          <motion.button
            onClick={onAddMinute}
            style={{
              padding: '6px',
              background: 'transparent',
              color: '#666',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '12px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            whileHover={{
              backgroundColor: '#f0f0f0',
              scale: 1.05
            }}
            whileTap={{ scale: 0.95 }}
          >
            +1
          </motion.button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '20px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px',
            background: 'transparent',
            color: '#666',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '16px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ‹
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
              justifyContent: 'center'
            }}
          >
            {isPaused ? '▶' : '⏸'}
          </button>

          <AnimatePresence mode="wait">
            {isPaused && (
              <motion.button
                key="end"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={onEnd}
                style={{
                  padding: '8px 20px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: 0.8,
                  whiteSpace: 'nowrap'
                }}
              >
                End
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
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
    <div>
      <textarea
        placeholder="Short reflection"
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
        style={{
          width: '100%',
          minHeight: '120px',
          maxHeight: '200px',
          border: 'none',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '18px',
          resize: 'vertical',
          marginBottom: '20px',
          color: '#333',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          outline: 'none'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '12px',
            background: 'transparent',
            color: '#666',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '20px',
            width: '44px',
            height: '44px',
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
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Submit
        </button>
      </div>
    </div>
  )
}

